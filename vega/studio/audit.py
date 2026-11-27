"""Effort audit: read each role's session log and list which required skills it really invoked (no tokens).

The supervisor gets audit.json; a role that skipped a required skill is sent back.
"""
import json
from pathlib import Path

HOME = Path.home()
REQUIRED = {
    "marketer": [["neesmo-viral-rules"], ["viral-hooks"], ["viral-short-form-ideas", "content-strategy"],
                 ["viral-captions-and-ctas"]],
    "producer": [["neesmo-viral-rules"], ["@engine"], ["ffmpeg-captions-subtitles", "ffmpeg"]],
    "analyst": [["analytics", "ab-testing"], ["neesmo-viral-rules"]],
    "director": [["neesmo-director"], ["video-director"]],
}
FOLDER = {"director": "supervisor"}   # the director pass runs in the supervisor's folder


def transcript(folder: Path, session_id: str) -> Path:
    enc = "".join(c if c.isalnum() else "-" for c in str(folder.resolve()))
    return HOME / ".claude" / "projects" / enc / f"{session_id}.jsonl"


def skills_used(path: Path) -> list[str]:
    used: list[str] = []
    try:
        lines = path.read_text(errors="replace").splitlines()
    except OSError:
        return used
    for ln in lines:
        if '"Skill"' not in ln:
            continue
        try:
            e = json.loads(ln)
        except ValueError:
            continue
        for c in (e.get("message") or {}).get("content") or []:
            if isinstance(c, dict) and c.get("type") == "tool_use" and c.get("name") == "Skill":
                s = str((c.get("input") or {}).get("skill", "")).split(":")[-1]
                if s and s not in used:
                    used.append(s)
    return used


def audit(folder: Path, sessions: dict[str, list[str]], engine: str) -> dict:
    """sessions: role -> session ids used for this video (latest round last)."""
    out: dict = {"ok": True, "roles": {}}
    for role, ids in sessions.items():
        if role not in REQUIRED:
            continue
        used: list[str] = []
        rd = folder / ".roles" / FOLDER.get(role, role)   # roles run in their own folder; older videos ran in the channel folder
        for sid in ids:
            log = transcript(rd, sid) if rd.is_dir() else None
            if not log or not log.exists():
                log = transcript(folder, sid)
            used += [s for s in skills_used(log) if s not in used]
        missing = []
        for group in REQUIRED[role]:
            group = [engine if g == "@engine" else g for g in group]
            if not any(g in used for g in group):
                missing.append(" or ".join(group))
        out["roles"][role] = {"used": used, "missing": missing}
        if missing:
            out["ok"] = False
    return out
