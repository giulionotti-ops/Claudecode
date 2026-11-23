"""Free updates for every buyer: check, verify, back up, install, restart. Owner data is never touched.

The seller publishes `latest.json` (signed with the seller's private key by scripts/publish_update.py) and the
zip next to it. Neesmo checks once a day; the owner presses "Update" in System settings (or turns on
automatic updates). Only files inside the app folder are replaced; settings, agents, channels and keys live
in ~/.config/neesmo and the agent folders, so they stay as they are.

  python3 -m studio.update check | apply
"""
import base64
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
import urllib.request
import zipfile
from pathlib import Path

from . import state

APP = state.APP
VERSION_FILE = APP / "VERSION"
UPDATE_URL = os.environ.get("NEESMO_UPDATE_URL", "https://neesmo.example/updates/latest.json")
DIR = state.DIR / "updates"
KEEP = {".venv", "private", "__pycache__"}   # never replaced or deleted


def version() -> str:
    try:
        return VERSION_FILE.read_text().strip()
    except OSError:
        return "0"


def _newer(a: str, b: str) -> bool:
    """Versions are dates with an optional patch: 2026.11.23 or 2026.11.23.2."""
    p = lambda v: [int(x) for x in v.split(".") if x.isdigit()]
    return p(a) > p(b)


def _verify(doc: dict) -> dict:
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
    from license import PUBLIC_KEY
    m = doc["manifest"]
    body = json.dumps(m, sort_keys=True, separators=(",", ":")).encode()
    Ed25519PublicKey.from_public_bytes(base64.b64decode(PUBLIC_KEY)).verify(base64.b64decode(doc["sig"]), body)
    return m


def _get(url: str, limit: int = 300 << 20) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": f"neesmo/{version()}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read(limit + 1)
    if len(data) > limit:
        raise ValueError("download too large")
    return data


def check() -> dict:
    """{"current", "latest", "available", "notes"}; cached in updates/check.json for the UI."""
    out = {"current": version(), "latest": None, "available": False, "notes": "", "error": None}
    try:
        m = _verify(json.loads(_get(UPDATE_URL, 1 << 20)))
        out.update(latest=m["version"], available=_newer(m["version"], version()), notes=m.get("notes", ""))
    except Exception as e:
        out["error"] = str(e)[:200]
    DIR.mkdir(parents=True, exist_ok=True)
    (DIR / "check.json").write_text(json.dumps({**out, "checked": state.now().isoformat(timespec="seconds")}))
    return out


def _backup() -> Path:
    DIR.mkdir(parents=True, exist_ok=True)
    out = DIR / f"backup-{version()}.tar.gz"
    with tarfile.open(out, "w:gz") as t:
        for p in APP.iterdir():
            if p.name not in KEEP:
                t.add(p, arcname=p.name, filter=lambda ti: None if "__pycache__" in ti.name else ti)
    for old in sorted(DIR.glob("backup-*.tar.gz"))[:-3]:   # keep the last three
        old.unlink()
    return out


def apply() -> dict:
    doc = json.loads(_get(UPDATE_URL, 1 << 20))
    m = _verify(doc)
    if not _newer(m["version"], version()):
        return {"ok": True, "msg": "Already up to date.", "version": version()}
    url = m["url"] if "://" in m["url"] else UPDATE_URL.rsplit("/", 1)[0] + "/" + m["url"]
    data = _get(url)
    if hashlib.sha256(data).hexdigest() != m["sha256"]:
        raise ValueError("the download does not match the signed update; nothing was changed")
    backup = _backup()
    z = zipfile.ZipFile(io.BytesIO(data))
    prefix = "neesmo/"
    for info in z.infolist():
        name = info.filename[len(prefix):] if info.filename.startswith(prefix) else info.filename
        parts = Path(name).parts
        if not name or info.is_dir() or not parts or parts[0] in KEEP or ".." in parts or name.startswith("/"):
            continue
        dest = APP / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(z.read(info))
        mode = (info.external_attr >> 16) & 0o777
        if mode:
            dest.chmod(mode)
    for rel in m.get("removed", []):   # files a release dropped
        p = (APP / rel).resolve()
        if p.is_file() and APP in p.parents and Path(rel).parts[0] not in KEEP:
            p.unlink()
    VERSION_FILE.write_text(m["version"] + "\n")
    pip = APP / ".venv" / "bin" / "pip"
    if pip.exists():
        subprocess.run([str(pip), "install", "-q", "-r", str(APP / "requirements.txt")], timeout=900)
    # new skills/tools from the manifest, then fresh role briefs and skill links in every channel
    subprocess.run([sys.executable, "-m", "studio.install"], cwd=APP, timeout=1800)
    try:
        import agents
        from . import channel
        for a in agents.load():
            if channel.is_channel(a):
                channel.refresh(a["id"])
    except Exception:
        pass
    return {"ok": True, "msg": f"Updated to {m['version']}.", "version": m["version"], "backup": str(backup),
            "notes": m.get("notes", "")}


def rollback() -> dict:
    backups = sorted(DIR.glob("backup-*.tar.gz"))
    if not backups:
        return {"ok": False, "msg": "No backup to go back to."}
    with tarfile.open(backups[-1]) as t:
        t.extractall(APP, filter="data")
    return {"ok": True, "msg": f"Went back to {version()}."}


def restart() -> None:
    """systemd (Restart=always) brings the server back; without it, replace this process."""
    if os.environ.get("INVOCATION_ID"):   # set by systemd
        os._exit(0)
    os.execv(sys.executable, [sys.executable, *sys.argv])


if __name__ == "__main__":
    cmd = (sys.argv[1:] or ["check"])[0]
    print(json.dumps({"check": check, "apply": apply, "rollback": rollback}[cmd]()))
