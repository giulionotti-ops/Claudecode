"""Owner automations as plain Python scripts (no tokens per run).

When the owner asks for something that should happen by itself ("every Monday pull my top comments", "after each
video save a thumbnail"), the channel's Director writes it ONCE as a script in `neesmo/automations/<name>.py`
and registers it here. From then on Neesmo's clock runs the script; no AI session is started for it.

  python3 -m studio.automations list <aid>                       # what is registered, when it last ran, last result
  python3 -m studio.automations add <aid> <name> <when> "<what it does>"   # register neesmo/automations/<name>.py
  python3 -m studio.automations check <aid> <name>               # compile + one dry run (NEESMO_DRY_RUN=1); must say ok
  python3 -m studio.automations run <aid> <name>                 # run it now
  python3 -m studio.automations remove <aid> <name>
  python3 -m studio.automations due <aid>                        # run every script whose time has come (the clock calls this)

<when>: hourly | daily | weekly | after_video | after_post | manual
  after_video / after_post scripts get the video id as their first argument.

A script gets these environment variables: NEESMO_CHANNEL (the channel folder), NEESMO_AGENT (the channel id),
NEESMO_VIDEO (when there is one) and NEESMO_DRY_RUN=1 during `check` (then it must not change anything outside
the channel folder and must not post anything). It prints one short line about what it did. Exit code 0 = ok.
Scripts never upload, publish or delete; Neesmo's own scripts post after the owner approves.
"""
import datetime as dt
import json
import os
import py_compile
import re
import subprocess
import sys
from pathlib import Path

from . import channel

WHEN = ("hourly", "daily", "weekly", "after_video", "after_post", "manual")
EVERY = {"hourly": dt.timedelta(hours=1), "daily": dt.timedelta(days=1), "weekly": dt.timedelta(days=7)}
TIMEOUT = 10 * 60
NAME = re.compile(r"^[a-z0-9][a-z0-9_-]{0,40}$")
TEMPLATE = '''"""{what}

Neesmo automation ({when}). Runs without AI: plain Python, standard library first.
Env: NEESMO_CHANNEL, NEESMO_AGENT, NEESMO_VIDEO (if any), NEESMO_DRY_RUN=1 during the check.
"""
import os
import sys
from pathlib import Path

CH = Path(os.environ["NEESMO_CHANNEL"])
DRY = os.environ.get("NEESMO_DRY_RUN") == "1"


def main() -> int:
    # TODO: the work. Read/write only inside CH. Never upload, publish or delete.
    print("nothing to do yet")
    return 0


if __name__ == "__main__":
    sys.exit(main())
'''


def _dir(aid: str) -> Path:
    d = channel.paths(aid)["n"] / "automations"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _reg_path(aid: str) -> Path:
    return _dir(aid) / "registry.json"


def load(aid: str) -> dict:
    r = channel.read_json(_reg_path(aid), {})
    return r if isinstance(r, dict) else {}


def _save(aid: str, reg: dict) -> None:
    channel.write_json(_reg_path(aid), reg)


def add(aid: str, name: str, when: str, what: str) -> dict:
    if not NAME.match(name):
        raise ValueError("name: lowercase letters, digits, - or _ (max 41)")
    if when not in WHEN:
        raise ValueError(f"when must be one of: {', '.join(WHEN)}")
    f = _dir(aid) / f"{name}.py"
    if not f.exists():
        f.write_text(TEMPLATE.format(what=what.strip() or name, when=when))
    reg = load(aid)
    old = reg.get(name, {})
    reg[name] = {"when": when, "what": what.strip(), "file": f.name, "enabled": old.get("enabled", True),
                 "checked": False, "last_run": old.get("last_run"), "last": old.get("last")}
    _save(aid, reg)
    return reg[name]


def remove(aid: str, name: str) -> bool:
    reg = load(aid)
    if reg.pop(name, None) is None:
        return False
    _save(aid, reg)
    return True


def _exec(aid: str, name: str, video: str = "", dry: bool = False) -> dict:
    p = channel.paths(aid)
    f = _dir(aid) / f"{name}.py"
    env = {**os.environ, "NEESMO_CHANNEL": str(p["dir"]), "NEESMO_AGENT": aid, "NEESMO_VIDEO": video}
    env.pop("NEESMO_DRY_RUN", None)
    if dry:
        env["NEESMO_DRY_RUN"] = "1"
    try:
        r = subprocess.run([sys.executable, str(f), *([video] if video else [])], cwd=p["dir"], env=env,
                           capture_output=True, text=True, timeout=TIMEOUT)
        out = (r.stdout.strip().splitlines() or [""])[-1][:300]
        err = (r.stderr.strip().splitlines() or [""])[-1][:300]
        return {"ok": r.returncode == 0, "code": r.returncode, "out": out, "err": err if r.returncode else ""}
    except subprocess.TimeoutExpired:
        return {"ok": False, "code": -1, "out": "", "err": f"took longer than {TIMEOUT // 60} min"}
    except OSError as e:
        return {"ok": False, "code": -1, "out": "", "err": str(e)[:300]}


def check(aid: str, name: str) -> dict:
    """Compile, then one dry run. Only checked scripts are run by the clock."""
    reg = load(aid)
    if name not in reg:
        return {"ok": False, "err": f"{name} is not registered; run add first"}
    f = _dir(aid) / f"{name}.py"
    try:
        py_compile.compile(str(f), doraise=True)
    except (py_compile.PyCompileError, OSError) as e:
        res = {"ok": False, "err": str(e)[:400]}
    else:
        res = _exec(aid, name, dry=True)
    reg[name]["checked"] = res["ok"]
    _save(aid, reg)
    return res


def run(aid: str, name: str, video: str = "") -> dict:
    reg = load(aid)
    if name not in reg:
        return {"ok": False, "err": f"{name} is not registered"}
    res = _exec(aid, name, video)
    reg = load(aid)   # re-read: the script may have taken minutes
    if name in reg:
        reg[name]["last_run"] = dt.datetime.now().isoformat(timespec="seconds")
        reg[name]["last"] = res
        _save(aid, reg)
    channel.event(aid, "automation", f"{name}: {'ok' if res['ok'] else 'failed'} {res.get('out') or res.get('err')}"[:240])
    return res


def _ready(a: dict) -> bool:
    return a.get("enabled", True) and a.get("checked")


def due(aid: str) -> list[str]:
    """Run hourly/daily/weekly scripts whose time has come. Called by the clock."""
    now = dt.datetime.now()
    ran = []
    for name, a in load(aid).items():
        if not _ready(a) or a.get("when") not in EVERY:
            continue
        try:
            last = dt.datetime.fromisoformat(a["last_run"]) if a.get("last_run") else None
        except ValueError:
            last = None
        if last is None or now - last >= EVERY[a["when"]]:
            run(aid, name)
            ran.append(name)
    return ran


def on(aid: str, event: str, video: str) -> list[str]:
    """Run every `after_video` / `after_post` script for this video. Called by the pipeline and the poster."""
    ran = []
    for name, a in load(aid).items():
        if _ready(a) and a.get("when") == event:
            run(aid, name, video)
            ran.append(name)
    return ran


def main(argv: list[str]) -> int:
    cmd, args = (argv[0] if argv else ""), argv[1:]
    try:
        if cmd == "list" and len(args) == 1:
            reg = load(args[0])
            if not reg:
                print("no automations yet")
            for n, a in reg.items():
                last = a.get("last") or {}
                print(f"{n}  [{a['when']}{'' if a.get('enabled', True) else ', off'}{'' if a.get('checked') else ', NOT CHECKED'}]  "
                      f"{a.get('what', '')}  last: {a.get('last_run') or 'never'} {last.get('out') or last.get('err') or ''}".rstrip())
            return 0
        if cmd == "add" and len(args) == 4:
            add(*args)
            print(f"registered; write the work into neesmo/automations/{args[1]}.py, then: python3 -m studio.automations check {args[0]} {args[1]}")
            return 0
        if cmd == "check" and len(args) == 2:
            r = check(*args)
            print("ok " + (r.get("out") or "") if r["ok"] else f"FAILED: {r.get('err') or r.get('out')}")
            return 0 if r["ok"] else 1
        if cmd == "run" and len(args) in (2, 3):
            r = run(*args)
            print(json.dumps(r))
            return 0 if r["ok"] else 1
        if cmd == "remove" and len(args) == 2:
            print("removed (the script file stays)" if remove(*args) else "not registered")
            return 0
        if cmd == "due" and len(args) == 1:
            print(", ".join(due(args[0])) or "nothing due")
            return 0
    except ValueError as e:
        print(f"error: {e}")
        return 1
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
