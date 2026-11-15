"""Settings → System and License: the general (user-wide) Claude Code skills and plugins, with on/off
switches, and the third-party license list.

A skill is switched off by moving its folder out of ~/.claude/skills into NEESMO_DIR/skills-off, and back
to switch it on. Plugins use `claude plugin enable/disable -s user`. Both apply to new Claude sessions.
"""
import json
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path

from agents import HOME, NEESMO_DIR

SKILLS = HOME / ".claude" / "skills"
OFF = NEESMO_DIR / "skills-off"
HERE = Path(__file__).parent
_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$")
_PLUGIN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,80}@[A-Za-z0-9][A-Za-z0-9._-]{0,80}$")
_lock = threading.Lock()
_plugins_cache: tuple[float, list[dict]] | None = None


def notices() -> list[dict]:
    """THIRD_PARTY_NOTICES.md as sections: {title, rows:[{item, source, license}], notes:[str]}."""
    try:
        text = (HERE / "THIRD_PARTY_NOTICES.md").read_text()
    except OSError:
        return []
    out: list[dict] = []
    for line in text.splitlines():
        if line.startswith("## "):
            out.append({"title": line[3:].strip(), "rows": [], "notes": []})
        elif not out:
            continue
        elif line.startswith("|") and not re.match(r"^\|\s*-", line):
            cells = [c.strip().replace("`", "") for c in line.strip().strip("|").split("|")]
            if cells[0].lower() in ("package", "item", "tool", "skills"):
                continue
            item, src, lic = (cells + ["", ""])[:3] if len(cells) >= 3 else (cells[0], "", cells[-1])
            out[-1]["rows"].append({"item": item, "source": src, "license": lic})
        elif line.startswith("- "):
            out[-1]["notes"].append(re.sub(r"\*\*|`", "", line[2:].strip()))
        elif line.startswith("  ") and out[-1]["notes"]:
            out[-1]["notes"][-1] += " " + line.strip()
    return out


def _license_for(repo: str, rows: list[dict]) -> str:
    repo = repo.lower()
    for r in rows:
        if repo and repo in r["source"].lower():
            return r["license"]
    return ""


def _pack() -> dict[str, str]:
    """skill name -> source repo, from skills.txt."""
    out = {}
    try:
        for line in (HERE / "skills.txt").read_text().splitlines():
            parts = line.split()
            if len(parts) == 2 and not line.startswith("#"):
                out[parts[1]] = parts[0]
    except OSError:
        pass
    return out


def _describe(d: Path) -> str:
    try:
        head = (d / "SKILL.md").read_text(errors="replace")[:4000]
    except OSError:
        return ""
    m = re.search(r"^description:\s*(.+?)\s*$", head, re.M)
    t = (m.group(1) if m else "").strip().strip("\"'")
    if t in ("|", ">", "|-", ">-"):  # block scalar: take the next indented lines
        after = head[m.end():].splitlines()
        t = " ".join(x.strip() for x in after if x.startswith((" ", "\t"))).strip()
    return t[:220] + ("…" if len(t) > 220 else "")


def skills() -> list[dict]:
    rows = [r for s in notices() for r in s["rows"]]
    pack, out = _pack(), []
    for base, on in ((SKILLS, True), (OFF, False)):
        if not base.is_dir():
            continue
        for d in sorted(base.iterdir(), key=lambda p: p.name.lower()):
            if not _NAME.match(d.name) or not (d / "SKILL.md").is_file():
                continue
            repo = pack.get(d.name, "")
            out.append({"name": d.name, "on": on, "description": _describe(d), "source": repo,
                        "license": _license_for(repo, rows)})
    return sorted(out, key=lambda s: s["name"].lower())


def set_skill(name: str, on: bool) -> None:
    if not _NAME.match(name):
        raise ValueError("bad skill name")
    src, dst = (OFF / name, SKILLS / name) if on else (SKILLS / name, OFF / name)
    with _lock:
        if not (src.is_symlink() or src.exists()):
            if dst.is_symlink() or dst.exists():
                return  # already in the wanted state
            raise LookupError(f"no skill called {name}")
        if dst.is_symlink() or dst.exists():
            raise ValueError(f"{name} exists in both places; remove one by hand")
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.is_symlink():  # `npx skills` links may be relative: re-point by absolute path so they survive the move
            dst.symlink_to(src.resolve(), target_is_directory=True)
            src.unlink()
        else:
            shutil.move(str(src), str(dst))


def _claude(*args: str, timeout: int = 60) -> str:
    exe = shutil.which("claude")
    if not exe:
        raise RuntimeError("Claude Code is not installed on this server")
    r = subprocess.run([exe, *args], capture_output=True, text=True, timeout=timeout)
    if r.returncode:
        raise RuntimeError((r.stderr or r.stdout).strip()[-300:] or "claude plugin failed")
    return r.stdout


def plugins(fresh: bool = False) -> list[dict]:
    """User-scope plugins (the ones every session gets), one row per plugin id."""
    global _plugins_cache
    if not fresh and _plugins_cache and time.time() - _plugins_cache[0] < 30:
        return _plugins_cache[1]
    try:
        raw = json.loads(_claude("plugin", "list", "--json"))
    except (RuntimeError, ValueError, subprocess.TimeoutExpired):
        return []
    rows = [r for s in notices() for r in s["rows"]]
    seen, out = set(), []
    for p in raw:
        pid = p.get("id", "")
        if p.get("scope") != "user" or pid in seen or not _PLUGIN.match(pid):
            continue
        seen.add(pid)
        name = pid.split("@")[0]
        lic = next((r["license"] for r in rows if r["source"].lower().rstrip("/").rsplit("/", 1)[-1] == name.lower()), "")
        out.append({"id": pid, "name": name, "on": bool(p.get("enabled")), "version": p.get("version", ""),
                    "license": lic})
    _plugins_cache = (time.time(), out)
    return out


def set_plugin(pid: str, on: bool) -> None:
    if not _PLUGIN.match(pid):
        raise ValueError("bad plugin id")
    global _plugins_cache
    _claude("plugin", "enable" if on else "disable", pid, "-s", "user")
    _plugins_cache = None


if __name__ == "__main__":
    for s in notices():
        print(s["title"], len(s["rows"]), len(s["notes"]))
    print(len(skills()), "skills;", plugins())
