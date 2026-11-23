"""Neesmo Studio first-run install: every free tool, plugin and skill the channel agents use.

  python3 -m studio.install [--dry-run] [--only id,id]

Reads studio/manifest.json, skips what is already there, and writes live progress to
NEESMO_DIR/studio/install.json for the setup screen. Safe to run again (updates run it too).
Skills go into one shared kit folder (~/.neesmo-kit/.claude/skills); each channel agent links the ones
it needs, so a session only loads the skills of its own job.
"""
import argparse
import glob
import importlib.util
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from . import state

MANIFEST = state.STUDIO / "manifest.json"
PROGRESS = state.DIR / "install.json"
LOG = state.DIR / "install.log"


def _x(p: str) -> str:
    return os.path.expanduser(p.replace("{conf}", str(state.CONF)))


def have(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def items(edition: str) -> list[dict]:
    m = json.loads(MANIFEST.read_text())
    return [i for i in m["items"] if i.get("edition", "all") in ("all", edition)]


def present(i: dict) -> bool:
    if "check" in i and not have(i["check"]):
        return False
    if "check_file" in i and not Path(_x(i["check_file"])).exists():
        return False
    if "check_dir" in i and not Path(_x(i["check_dir"])).is_dir():
        return False
    if "check_glob" in i and not glob.glob(_x(i["check_glob"])):
        return False
    if "check_py" in i and importlib.util.find_spec(i["check_py"]) is None:
        return False
    if "check_cmd" in i:
        return subprocess.run(i["check_cmd"], shell=True, capture_output=True).returncode == 0
    if i["kind"] == "skills":
        return all((skills_dir() / s).exists() for s in i["skills"] + extra_skills(i))
    if i["kind"] in ("git-skill",):
        return (skills_dir() / i["name"]).exists()
    if i["kind"] == "local-skill":
        return (skills_dir() / Path(i["path"]).name).exists()
    if i["kind"] == "plugins":
        return False  # cheap to re-run; `claude plugin install` skips installed ones
    return any(k in i for k in ("check", "check_file", "check_dir", "check_glob", "check_py"))


def skills_dir() -> Path:
    return state.KIT / ".claude" / "skills"


def extra_skills(i: dict) -> list[str]:
    return (i.get("edition_skills") or {}).get(state.load()["edition"], [])


class Runner:
    def __init__(self, dry: bool):
        self.dry = dry
        state.DIR.mkdir(parents=True, exist_ok=True)
        self.log = open(LOG, "a")

    def sh(self, cmd: str, cwd: Path | None = None, timeout: int = 1800) -> None:
        self.log.write(f"$ {cmd}\n")
        self.log.flush()
        if self.dry:
            return
        r = subprocess.run(cmd, shell=True, cwd=cwd, stdout=self.log, stderr=subprocess.STDOUT, timeout=timeout,
                           env={**os.environ, "CI": "1", "DEBIAN_FRONTEND": "noninteractive"})
        if r.returncode:
            raise RuntimeError(f"failed: {cmd.split(' &&')[0][:80]} (exit {r.returncode}, see {LOG})")


def sudo() -> str:
    return "" if os.geteuid() == 0 else "sudo -n "


def do(i: dict, r: Runner) -> str:
    k = i["kind"]
    if k == "apt":
        if not have("apt-get"):
            return "install it with your package manager: " + i["pkg"]
        r.sh(f"{sudo()}apt-get install -y -q {i['pkg']}", timeout=1200)
    elif k == "pip":
        r.sh(f"{sys.executable} -m pip install -q {i['pkg']}")
    elif k == "npm-g":
        if not have("npm"):
            return "needs Node.js 20+ (nodejs.org)"
        r.sh(f"npm install -g -q {i['pkg']}")
        if i.get("post"):
            r.sh(i["post"], timeout=2400)
    elif k == "cmd":
        if i.get("needs") and not have(i["needs"]):
            if i["needs"] == "uv":
                r.sh("curl -LsSf https://astral.sh/uv/install.sh | sh")
                os.environ["PATH"] = f"{Path.home() / '.local' / 'bin'}:{os.environ['PATH']}"
        r.sh(i["run"], timeout=2400)
    elif k == "plugins":
        if not have("claude"):
            return "install Claude Code first"
        for m in i["marketplaces"]:
            try:
                r.sh(f"claude plugin marketplace add {m}")
            except RuntimeError:
                pass  # already added
        for p in i["plugins"]:
            r.sh(f"claude plugin install {p} -s user")
    elif k == "skills":
        if not have("npx"):
            return "needs Node.js 20+ (nodejs.org)"
        state.KIT.mkdir(parents=True, exist_ok=True)
        args = " ".join(f"--skill {s}" for s in i["skills"] + extra_skills(i))
        r.sh(f"npx -y skills add {i['repo']} {args} -a claude-code -y", cwd=state.KIT)
    elif k == "git-skill":
        dest = skills_dir() / i["name"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        r.sh(f"git clone -q --depth 1 {i['repo']} {dest}")
        req = dest / "requirements.txt"
        if req.exists() or r.dry:
            r.sh(f"{sys.executable} -m pip install -q -r {req}")
    elif k == "local-skill":
        src = state.APP / i["path"]
        dest = skills_dir() / src.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not r.dry:
            if dest.is_symlink() or dest.exists():
                shutil.rmtree(dest, ignore_errors=True) if not dest.is_symlink() else dest.unlink()
            shutil.copytree(src, dest)
    elif k == "connect":
        return "login"
    return ""


def write_progress(rows: list[dict], done: bool) -> None:
    PROGRESS.parent.mkdir(parents=True, exist_ok=True)
    tmp = PROGRESS.with_suffix(".tmp")
    tmp.write_text(json.dumps({"items": rows, "done": done}, indent=1))
    os.replace(tmp, PROGRESS)


def progress() -> dict:
    try:
        return json.loads(PROGRESS.read_text())
    except (OSError, ValueError):
        return {"items": [], "done": False}


def run(dry: bool = False, only: set[str] | None = None) -> dict:
    s = state.load()
    todo = [i for i in items(s["edition"]) if not only or i["id"] in only]
    rows = [{"id": i["id"], "label": i["label"], "group": i["group"], "status": "waiting", "msg": "",
             "login": i.get("login"), "required": bool(i.get("required"))} for i in todo]
    write_progress(rows, False)
    r = Runner(dry)
    for i, row in zip(todo, rows):
        row["status"] = "working"
        write_progress(rows, False)
        try:
            if present(i):
                row["status"] = "done"
            else:
                msg = do(i, r)
                if msg == "login":
                    row["status"] = "needs_you"
                elif msg:
                    row["status"], row["msg"] = "skipped", msg
                elif (i.get("login") or {}).get("optional"):
                    row["status"] = "done_optional"   # installed; the extra login step is optional
                else:
                    row["status"] = "done"
        except Exception as e:
            row["status"], row["msg"] = "failed", str(e)[:200]
        write_progress(rows, False)
    write_progress(rows, True)
    return {"items": rows, "done": True}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only")
    a = ap.parse_args()
    res = run(a.dry_run, set(a.only.split(",")) if a.only else None)
    for row in res["items"]:
        print(f"{row['status']:>13}  {row['label']}  {row['msg']}")


if __name__ == "__main__":
    main()
