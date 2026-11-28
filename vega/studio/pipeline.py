"""Make one video for a channel agent. This script is the orchestrator, so orchestration costs no tokens.

  python3 -m studio.pipeline make <aid> [--draft]       # next video, start to "ready for review" (--draft: 540x960, 15 fps test)
  python3 -m studio.pipeline fix <aid> <vid> "<note>"   # the owner asked for changes
  python3 -m studio.pipeline analyse <aid>              # analyst session (after stats.py)

Every role is its own fresh, short `claude -p` session in its own folder (.roles/<role>, with only its skills) (new session per video, so
context and cost stay small). Scripts check what scripts can check (gate.py, audit.py); the supervisor
session judges the rest and can send the work back up to `max_fix_rounds` times.

Before the producer starts, the supervisor runs a director pass (brief `director.md`, skill `neesmo-director`):
it reviews the script (and can send it back to the marketer once) and writes `shotlist.json`, the shot-by-shot
plan the producer builds. `studio.shotlist` checks it; `studio.director_learn` logs every video and rewrites the
director's playbook from the real numbers, so the director improves with every video.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

from . import audit, channel, director_learn, gate, shotlist, state

TIMEOUT = {"marketer": 25 * 60, "producer": 75 * 60, "supervisor": 12 * 60, "director": 20 * 60, "analyst": 15 * 60}
LABEL = {**channel.ROLE_LABEL, "director": "Directing"}
DRAFT_SIZE = "540x960"
TOOLS = "Bash Read Write Edit Glob Grep Skill Agent WebSearch WebFetch TodoWrite"
CHANGE_WORDS = re.compile(r"\b(title|hook|script|topic|words?|say|line|caption text|description|facts?|story)\b", re.I)


def _model() -> str:
    return os.environ.get("NEESMO_ROLE_MODEL", "sonnet")


def run_role(aid: str, role: str, vdir: Path | None, extra: str = "", brief: str | None = None) -> dict:
    """One fresh Claude session playing `role` (folder, skills, plugins) with brief `brief` (default: the role's own).
    Returns {ok, session, cost, text}."""
    d = state.channel_dir(aid)
    sid = str(uuid.uuid4())
    brief = brief or role
    where = f"The video folder is `{vdir.relative_to(d)}`." if vdir else ""
    if vdir and channel.read_json(vdir / "draft.json", {}).get("draft"):
        where += (f" DRAFT run: a cheap test render at {DRAFT_SIZE}, 15 fps, fast preset; keep it short and lean."
                  " NO VOICE in drafts: no voiceover, no edge-tts; captions carry the script, timed at reading speed;"
                  " music and SFX only.")
    prompt = (f"You are the {role} of this channel. Read `neesmo/prompts/{brief}.md` and follow it exactly. {where}\n"
              f"{extra}".strip())
    channel.write_json(channel.paths(aid)["n"] / "running.json",
                       {"role": role, "video": vdir.name if vdir else None, "session": sid,
                        "started": state.now().isoformat(timespec="seconds")})
    channel.event(aid, "role", f"{LABEL[brief]} started" + (f" on video {vdir.name}" if vdir else ""),
                  role=role, video=vdir.name if vdir else None, session=sid)
    claude = shutil.which("claude") or str(Path.home() / ".local" / "bin" / "claude")
    # own folder = only this role's skills; --settings = only this role's plugins
    cwd = channel.role_dir(aid, role)
    cmd = [claude, "-p", prompt, "--session-id", sid, "--output-format", "json", "--model", _model(),
           "--allowedTools", TOOLS, "--permission-mode", "acceptEdits",
           "--settings", json.dumps({"enabledPlugins": channel.ROLE_PLUGINS[role]})]
    res = {"ok": False, "session": sid, "cost": 0.0, "text": ""}
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=TIMEOUT[brief],
                           env={**os.environ, "NEESMO_ROLE": role, "NEESMO_CHANNEL": aid,
                                "PYTHONPATH": os.pathsep.join(filter(None, [str(Path(__file__).resolve().parent.parent), os.environ.get("PYTHONPATH")]))})
        out = json.loads(r.stdout or "{}")
        res.update(ok=r.returncode == 0 and not out.get("is_error"), cost=float(out.get("total_cost_usd") or 0),
                   text=str(out.get("result") or r.stderr[-400:]).strip())
    except subprocess.TimeoutExpired:
        res["text"] = f"timed out after {TIMEOUT[brief] // 60} min"
    except (OSError, ValueError) as e:
        res["text"] = str(e)
    with open(channel.paths(aid)["n"] / "costs.jsonl", "a") as f:
        f.write(json.dumps({"ts": state.now().isoformat(timespec="seconds"), "role": brief,
                            "video": vdir.name if vdir else None, "session": sid, "cost": res["cost"],
                            "ok": res["ok"]}) + "\n")
    last = res["text"].splitlines()[-1][:200] if res["text"] else ""
    channel.event(aid, "role_done" if res["ok"] else "role_failed",
                  f"{LABEL[brief]}: {last or ('done' if res['ok'] else 'failed')}",
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
    from . import video_chat
    video_chat.open_chat(aid, vid)      # every video gets its own chat, "#<number>"
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


def _role(aid: str, vid: str, vdir: Path, role: str, extra: str = "", brief: str | None = None) -> bool:
    r = run_role(aid, role, vdir, extra, brief)
    _add_session(aid, vid, brief or role, r["session"])
    return r["ok"]


def min_score(aid: str) -> int:
    """The score a script and a finished video must reach (channel setting `min_score`, default 8 of 10)."""
    try:
        return int(state.channel(aid).get("min_score", 8))
    except (TypeError, ValueError):
        return 8


def _num(x) -> float:
    """A score as a number: 8, 8.5, "8", "8/10" all work; anything else is 0."""
    try:
        return float(str(x).split("/")[0].strip()) if x is not None else 0.0
    except ValueError:
        return 0.0


def _script_score(vdir: Path) -> float:
    return _num(channel.read_json(vdir / "script_review.json", {}).get("score"))


def _direct(aid: str, vid: str, vdir: Path) -> bool | None:
    """Supervisor's director pass: script review, then a checked shot list.
    The script must score at least min_score (default 8/10) before anything is rendered: up to `script_rounds`
    (default 3) marketer fix rounds. Returns None when the script never got there (nothing is rendered),
    else True when a valid shotlist.json exists. A broken shot list never stops the video."""
    need = min_score(aid)
    try:
        rounds = int(state.channel(aid).get("script_rounds", 3))
    except (TypeError, ValueError):
        rounds = 3
    for f in ("script_review.json", "shotlist.json"):
        (vdir / f).unlink(missing_ok=True)
    _role(aid, vid, vdir, "supervisor", brief="director")
    for r in range(1, rounds + 1):
        review = channel.read_json(vdir / "script_review.json", {})
        score = _script_score(vdir)
        if review.get("ok") is not False and score >= need:
            break
        fixes = [f"line {x.get('line', '?')}: {x.get('fix', '')}" if isinstance(x, dict) else str(x)
                 for x in review.get("fixes") or []][:5] or [f"raise the script from {score}/10 to {need}/10"]
        channel.event(aid, "direct", f"The director scored the script of {vid} {score}/10 (needs {need}), round {r}: "
                      + "; ".join(fixes)[:300], video=vid)
        _role(aid, vid, vdir, "marketer", f"FIX ROUND {r} from the director (before production). The script scored "
              f"{score}/10 and must reach {need}/10. Fix these, keep what works:\n- " + "\n- ".join(fixes))
        (vdir / "script_review.json").unlink(missing_ok=True)
        (vdir / "shotlist.json").unlink(missing_ok=True)
        _role(aid, vid, vdir, "supervisor", f"The marketer rewrote the script (round {r}). Score it again honestly; "
              f"write the shot list only if it reaches {need}/10.", brief="director")
    if _script_score(vdir) < need or channel.read_json(vdir / "script_review.json", {}).get("ok") is False:
        return None
    if _script_ok(vdir):   # a rewrite must still pass the script rules
        channel.event(aid, "direct", f"The rewritten script of {vid} breaks the script rules: {_script_ok(vdir)}", video=vid)
        return None
    errs = shotlist.check(vdir, channel.read_json(channel.paths(aid)["style"], {}))
    if errs and (vdir / "shotlist.json").exists():
        _role(aid, vid, vdir, "supervisor", "Your shot list did not pass the check. Fix exactly these, keep the rest:\n- "
              + "\n- ".join(errs[:15]), brief="director")
        errs = shotlist.check(vdir, channel.read_json(channel.paths(aid)["style"], {}))
    if errs:
        channel.event(aid, "direct", f"The shot list for {vid} is incomplete ({len(errs)} problems); the producer uses it as a guide.",
                      video=vid)
        return (vdir / "shotlist.json").exists()
    (vdir / "shotlist.md").write_text(shotlist.render_md(vdir))
    n = len(shotlist.load(vdir).get("shots", []))
    channel.event(aid, "direct", f"Shot list for {vid} ready: {n} shots", video=vid)
    return True


def _check(aid: str, vid: str, vdir: Path) -> dict:
    """gate + audit (scripts), then the supervisor session. Returns the verdict."""
    style = channel.read_json(channel.paths(aid)["style"], {})
    if channel.read_json(vdir / "draft.json", {}).get("draft"):
        style = {**style, "size": DRAFT_SIZE}
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
    # below min_score is never ok, whatever the session said
    if _num(verdict.get("score")) < min_score(aid):
        verdict["ok"] = False
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
        channel.event(aid, "fix", f"The supervisor sent video {vid} back (round {rounds}): "
                      + " | ".join(f"{r}: {'; '.join(f)}" for r, f in by_role.items())[:300], video=vid)
        if "marketer" in by_role:
            _role(aid, vid, vdir, "marketer", "FIX ROUND. Change only this, keep the rest:\n- " + "\n- ".join(by_role["marketer"]))
        if "director" in by_role or ("marketer" in by_role and (vdir / "shotlist.json").exists()):
            _role(aid, vid, vdir, "supervisor", "FIX ROUND: update shotlist.json (the script may have changed), keep the "
                  "shots that still fit, use the neesmo-director skill, and run the check again:\n- "
                  + "\n- ".join(by_role.get("director", ["match the new script"])), brief="director")
        if "producer" in by_role or "marketer" in by_role or "director" in by_role:
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
    try:
        director_learn.log(aid, vid)   # the director's memory: what this shot list did and how it scored
    except Exception as e:
        channel.event(aid, "error", f"Director log failed: {str(e)[:160]}", video=vid)
    try:
        from . import automations
        automations.on(aid, "after_video", vid)   # owner automations (plain scripts, no tokens)
    except Exception as e:
        channel.event(aid, "error", f"Automations after the video failed: {str(e)[:160]}", video=vid)
    channel.backup(aid, f"video {vid}: {s.get('title', '')}")
    return v


def make(aid: str, draft: bool = False) -> dict:
    vid, vdir = _new_video(aid)
    if draft:
        channel.write_json(vdir / "draft.json", {"draft": True, "size": DRAFT_SIZE, "fps": 15})
        channel.update_video(aid, vid, draft=True)
    if not _role(aid, vid, vdir, "marketer") or _script_ok(vdir):
        problem = _script_ok(vdir) or "the marketer session failed"
        _role(aid, vid, vdir, "marketer", f"The last try failed: {problem}. Write script.json and SOURCES.md now.")
        if _script_ok(vdir):
            channel.update_video(aid, vid, status="failed", summary=_script_ok(vdir))
            channel.event(aid, "failed", f"Video {vid} stopped: {_script_ok(vdir)}", video=vid, important=True)
            return channel.update_video(aid, vid)
    try:
        directed = _direct(aid, vid, vdir)
    except Exception as e:   # a broken director pass never stops the video: the producer works from the script
        channel.event(aid, "error", f"Director pass failed: {str(e)[:160]}", video=vid)
        # the score gate still holds: render only a script that reached min_score and passes the rules
        directed = None if _script_score(vdir) < min_score(aid) or _script_ok(vdir) else True
    if directed is None:   # the script never reached min_score: nothing is rendered, no credits spent on a video
        score, need = _script_score(vdir), min_score(aid)
        summary = f"The script stopped at {score:g}/10 (needs {need}/10); nothing was rendered."
        channel.update_video(aid, vid, status="needs_owner", score=score, summary=summary,
                             title=channel.read_json(vdir / "script.json", {}).get("title"))
        channel.event(aid, "video", f"Video {vid}: {summary}", video=vid, status="needs_owner", important=True)
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
    draft = "--draft" in argv
    argv = [a for a in argv if a != "--draft"]
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
            out = make(argv[1], draft=draft)
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
