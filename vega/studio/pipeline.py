"""Make one video for a channel agent. This script is the orchestrator, so orchestration costs no tokens.

  python3 -m studio.pipeline make <aid>                 # next video, start to "ready for review"
  python3 -m studio.pipeline fix <aid> <vid> "<note>"   # the owner asked for changes
  python3 -m studio.pipeline analyse <aid>              # analyst session (after stats.py)

Every role is its own fresh, short `claude -p` session in the channel folder (new session per video, so
context and cost stay small). Scripts check what scripts can check (gate.py, audit.py); the supervisor
session judges the rest and can send the work back up to `max_fix_rounds` times.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

from . import audit, channel, gate, state

TIMEOUT = {"marketer": 25 * 60, "producer": 75 * 60, "supervisor": 12 * 60, "analyst": 15 * 60}
TOOLS = "Bash Read Write Edit Glob Grep Skill Agent WebSearch WebFetch TodoWrite"
CHANGE_WORDS = re.compile(r"\b(title|hook|script|topic|words?|say|line|caption text|description|facts?|story)\b", re.I)


def _model() -> str:
    return os.environ.get("NEESMO_ROLE_MODEL", "sonnet")


def run_role(aid: str, role: str, vdir: Path | None, extra: str = "") -> dict:
    """One fresh Claude session playing `role`. Returns {ok, session, cost, text}."""
    d = state.channel_dir(aid)
    sid = str(uuid.uuid4())
    where = f"The video folder is `{vdir.relative_to(d)}`." if vdir else ""
    prompt = (f"You are the {role} of this channel. Read `neesmo/prompts/{role}.md` and follow it exactly. {where}\n"
              f"{extra}".strip())
    channel.write_json(channel.paths(aid)["n"] / "running.json",
                       {"role": role, "video": vdir.name if vdir else None, "session": sid,
                        "started": state.now().isoformat(timespec="seconds")})
    channel.event(aid, "role", f"{channel.ROLE_LABEL[role]} started" + (f" on video {vdir.name}" if vdir else ""),
                  role=role, video=vdir.name if vdir else None, session=sid)
    claude = shutil.which("claude") or str(Path.home() / ".local" / "bin" / "claude")
    cmd = [claude, "-p", prompt, "--session-id", sid, "--output-format", "json", "--model", _model(),
           "--allowedTools", TOOLS, "--permission-mode", "acceptEdits"]
    res = {"ok": False, "session": sid, "cost": 0.0, "text": ""}
    try:
        r = subprocess.run(cmd, cwd=d, capture_output=True, text=True, timeout=TIMEOUT[role],
                           env={**os.environ, "NEESMO_ROLE": role, "NEESMO_CHANNEL": aid})
        out = json.loads(r.stdout or "{}")
        res.update(ok=r.returncode == 0 and not out.get("is_error"), cost=float(out.get("total_cost_usd") or 0),
                   text=str(out.get("result") or r.stderr[-400:]).strip())
    except subprocess.TimeoutExpired:
        res["text"] = f"timed out after {TIMEOUT[role] // 60} min"
    except (OSError, ValueError) as e:
        res["text"] = str(e)
    with open(channel.paths(aid)["n"] / "costs.jsonl", "a") as f:
        f.write(json.dumps({"ts": state.now().isoformat(timespec="seconds"), "role": role,
                            "video": vdir.name if vdir else None, "session": sid, "cost": res["cost"],
                            "ok": res["ok"]}) + "\n")
    last = res["text"].splitlines()[-1][:200] if res["text"] else ""
    channel.event(aid, "role_done" if res["ok"] else "role_failed",
                  f"{channel.ROLE_LABEL[role]}: {last or ('done' if res['ok'] else 'failed')}",
                  role=role, video=vdir.name if vdir else None, session=sid)
    (channel.paths(aid)["n"] / "running.json").unlink(missing_ok=True)
    return res


def _new_video(aid: str) -> tuple[str, Path]:
    p = channel.paths(aid)
    nums = [int(m.group(1)) for x in p["videos"].glob("*") if (m := re.match(r"(\d{3})", x.name))]
    vid = f"{(max(nums) + 1) if nums else 1:03d}"
    vdir = p["videos"] / vid
    vdir.mkdir(parents=True)
    q = channel.queue(aid)
    q.append({"id": vid, "status": "making", "created": state.now().isoformat(timespec="seconds"),
              "dir": str(vdir), "sessions": {}, "rounds": 0})
    channel.save_queue(aid, q)
    c = state.channel(aid)
    if not c.get("trial_start"):
        state.save_channel(aid, trial_start=state.now().date().isoformat())
    return vid, vdir


def _script_ok(vdir: Path) -> str | None:
    try:
        s = json.loads((vdir / "script.json").read_text())
    except (OSError, ValueError):
        return "script.json is missing or not valid JSON"
    miss = [k for k in ("hook", "script", "title", "description") if not s.get(k)]
    return f"script.json lacks {', '.join(miss)}" if miss else None


def _add_session(aid: str, vid: str, role: str, sid: str) -> dict:
    v = next(x for x in channel.queue(aid) if x["id"] == vid)
    v.setdefault("sessions", {}).setdefault(role, []).append(sid)
    return channel.update_video(aid, vid, sessions=v["sessions"])


def _role(aid: str, vid: str, vdir: Path, role: str, extra: str = "") -> bool:
    r = run_role(aid, role, vdir, extra)
    _add_session(aid, vid, role, r["session"])
    return r["ok"]


def _check(aid: str, vid: str, vdir: Path) -> dict:
    """gate + audit (scripts), then the supervisor session. Returns the verdict."""
    style = channel.read_json(channel.paths(aid)["style"], {})
    g = gate.check(vdir, style)
    (vdir / "gate.json").write_text(json.dumps(g, indent=1))
    v = next(x for x in channel.queue(aid) if x["id"] == vid)
    a = audit.audit(state.channel_dir(aid), v.get("sessions", {}), style.get("engine", ""))
    (vdir / "audit.json").write_text(json.dumps(a, indent=1))
    channel.event(aid, "gate", "Checks passed" if g["ok"] and a["ok"] else
                  "Checks found: " + "; ".join(g["problems"] + [f"{r} skipped {', '.join(x['missing'])}"
                                                               for r, x in a["roles"].items() if x["missing"]]),
                  video=vid)
    (vdir / "verdict.json").unlink(missing_ok=True)
    _role(aid, vid, vdir, "supervisor")
    verdict = channel.read_json(vdir / "verdict.json", {})
    if not verdict:
        verdict = {"ok": g["ok"] and a["ok"], "score": None, "issues": [], "summary": "The check did not finish."}
    # a failed script gate is never ok, whatever the session said
    if not g["ok"]:
        verdict["ok"] = False
        verdict.setdefault("issues", []).append({"role": "producer", "fix": "; ".join(g["problems"])})
    for role, x in a["roles"].items():
        if x["missing"]:
            verdict["ok"] = False
            verdict.setdefault("issues", []).append({"role": role, "fix": "Use these skills for real: " + ", ".join(x["missing"])})
    return verdict


def _fix_rounds(aid: str, vid: str, vdir: Path, verdict: dict) -> dict:
    max_rounds = int(state.channel(aid).get("max_fix_rounds", 2))
    rounds = next(x for x in channel.queue(aid) if x["id"] == vid).get("rounds", 0)
    while not verdict.get("ok") and rounds < max_rounds:
        rounds += 1
        channel.update_video(aid, vid, rounds=rounds)
        issues = verdict.get("issues") or []
        by_role: dict[str, list[str]] = {}
        for i in issues:
            by_role.setdefault(i.get("role", "producer"), []).append(i.get("fix", ""))
        channel.event(aid, "fix", f"Main agent sent video {vid} back (round {rounds}): "
                      + " | ".join(f"{r}: {'; '.join(f)}" for r, f in by_role.items())[:300], video=vid)
        if "marketer" in by_role:
            _role(aid, vid, vdir, "marketer", "FIX ROUND. Change only this, keep the rest:\n- " + "\n- ".join(by_role["marketer"]))
        if "producer" in by_role or "marketer" in by_role:
            _role(aid, vid, vdir, "producer", "FIX ROUND. Re-render with these fixes, keep the rest:\n- "
                  + "\n- ".join(by_role.get("producer", ["The script changed; update voice, scenes and captions."])))
        verdict = _check(aid, vid, vdir)
    return verdict


def _finish(aid: str, vid: str, vdir: Path, verdict: dict) -> dict:
    s = channel.read_json(vdir / "script.json", {})
    ok = bool(verdict.get("ok"))
    status = ("ready_for_review" if state.needs_approval(aid) else "approved") if ok else "needs_owner"
    v = channel.update_video(aid, vid, status=status, title=s.get("title"), hook=s.get("hook"),
                             description=s.get("description"), tags=s.get("tags"), pinned=s.get("pinned"),
                             experiment=s.get("experiment"), poster=str(vdir / "poster.jpg") if (vdir / "poster.jpg").exists() else None,
                             video=str(vdir / "video.mp4"), score=verdict.get("score"), summary=verdict.get("summary"),
                             finished=state.now().isoformat(timespec="seconds"))
    channel.event(aid, "video", (f"Video {vid} is ready: {s.get('title', '')}" if ok else
                                 f"Video {vid} still has problems after the fix rounds; it needs your eye."),
                  video=vid, status=status, important=True)
    channel.backup(aid, f"video {vid}: {s.get('title', '')}")
    return v


def make(aid: str) -> dict:
    vid, vdir = _new_video(aid)
    if not _role(aid, vid, vdir, "marketer") or _script_ok(vdir):
        problem = _script_ok(vdir) or "the marketer session failed"
        _role(aid, vid, vdir, "marketer", f"The last try failed: {problem}. Write script.json and SOURCES.md now.")
        if _script_ok(vdir):
            channel.update_video(aid, vid, status="failed", summary=_script_ok(vdir))
            channel.event(aid, "failed", f"Video {vid} stopped: {_script_ok(vdir)}", video=vid, important=True)
            return channel.update_video(aid, vid)
    _role(aid, vid, vdir, "producer")
    verdict = _check(aid, vid, vdir)
    verdict = _fix_rounds(aid, vid, vdir, verdict)
    return _finish(aid, vid, vdir, verdict)


def fix(aid: str, vid: str, note: str) -> dict:
    """The owner asked for changes on a video. Their note beats the style."""
    vdir = channel.paths(aid)["videos"] / vid
    channel.update_video(aid, vid, status="making", rounds=0, owner_note=note)
    channel.board_post(aid, "owner", f"@all {vid}: {note}")
    channel.event(aid, "fix", f"You asked for changes on {vid}: {note[:200]}", video=vid)
    extra = f"FIX ROUND from the OWNER (beats the style and the lessons): {note}"
    if CHANGE_WORDS.search(note):
        _role(aid, vid, vdir, "marketer", extra)
    _role(aid, vid, vdir, "producer", extra)
    verdict = _fix_rounds(aid, vid, vdir, _check(aid, vid, vdir))
    return _finish(aid, vid, vdir, verdict)


def analyse(aid: str) -> dict:
    r = run_role(aid, "analyst", None)
    return {"ok": r["ok"], "text": r["text"][-300:]}


def busy(aid: str) -> bool:
    """A pipeline is running for this channel (stale locks from killed runs are cleared)."""
    lock = channel.paths(aid)["n"] / "pipeline.lock"
    try:
        pid = int(lock.read_text().strip() or 0)
    except (OSError, ValueError):
        return False
    try:
        os.kill(pid, 0)
        return True
    except (ProcessLookupError, PermissionError, OverflowError, ValueError):
        lock.unlink(missing_ok=True)
        (channel.paths(aid)["n"] / "running.json").unlink(missing_ok=True)
        return False


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[0] not in ("make", "fix", "analyse"):
        print(__doc__)
        return 2
    lock = channel.paths(argv[1])["n"] / "pipeline.lock"
    busy(argv[1])
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
    except FileExistsError:
        print("busy")
        return 3
    try:
        if argv[0] == "make":
            out = make(argv[1])
        elif argv[0] == "fix":
            out = fix(argv[1], argv[2], argv[3])
        else:
            out = analyse(argv[1])
        print(json.dumps(out, default=str))
        return 0
    finally:
        lock.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
