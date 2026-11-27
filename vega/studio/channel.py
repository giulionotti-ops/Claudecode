"""Channel agents: one card on the home screen that runs a whole YouTube channel or Instagram account.

A channel agent is a folder with a main agent, the Director (the session the owner talks to; it runs the
channel and decides what's next), plus four subagent roles that run as short, separate Claude sessions:
marketer (topic, hooks, script), producer (the video), supervisor (checks every video before the owner
sees it) and analyst (numbers -> lessons). They talk through `neesmo/board.md`; the owner talks to them through
`neesmo/requests.md` (from the home chat, by tagging the agent). Everything the scripts can do
(scheduling, gates, uploads, stats) is plain Python, so tokens go only to creative work.

Folder:
  CLAUDE.md                 brief every session there reads
  neesmo/settings.json      cadence, slots, auto-schedule ...      (studio.state.channel)
  neesmo/brief.md           what the channel is about
  neesmo/style.json         look, voice, engine, template = last approved video
  neesmo/lessons.md         analyst's rules
  neesmo/board.md           role-to-role notes
  neesmo/requests.md        owner requests (open ones beat the style)
  neesmo/queue.json         every video and its status
  neesmo/events.jsonl       what happened, for the card
  neesmo/prompts/*.md       role briefs (copied from studio/roles, refreshed on update)
  inspiration/              images the owner gives as inspiration
  videos/NNN-slug/          one folder per video
  .claude/skills/*          links to the shared kit
"""
import datetime as dt
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

from . import state

ROLES = ["marketer", "producer", "supervisor", "analyst"]
ROLE_LABEL = {"marketer": "Hooks & scripts", "producer": "Video", "supervisor": "Quality check", "analyst": "Analysis"}
# Skills by group. The channel folder links only the general ones (every role sees those); each role
# runs in its own folder .roles/<role>/ that links its group's skills too, so a session loads only
# what its job needs. Supervisor = general only.
SKILL_GROUPS = {
    "general": ["neesmo-viral-rules", "neesmo-director"],
    "marketing": ["viral-hooks", "viral-captions-and-ctas", "viral-short-form", "viral-short-form-ideas",
                  "viral-youtube-shorts", "viral-instagram-reels", "content-strategy", "copywriting", "copy-editing",
                  "marketing-psychology", "social", "marketing-ideas", "competitor-profiling"],
    "content": ["claude-drawing-skill", "huashu-art-motion", "bang-motion", "short-editing", "clips",
                "ffmpeg-captions-subtitles", "ffmpeg", "voicestudio", "moneyprinterturbo-video", "vox-explainer-skill"],
    "analysis": ["analytics", "ab-testing", "ffmpeg-analyse-video", "watch", "task-observer"],
}
SKILLS = [x for g in SKILL_GROUPS.values() for x in g]
# "editor" works in a video's own chat (#NNN): changes can touch the words and the picture
ROLE_GROUPS = {"supervisor": [], "marketer": ["marketing"], "producer": ["content"], "analyst": ["analysis"],
               "editor": ["marketing", "content"]}
GENERAL_PLUGINS = {"caveman@caveman": True, "claude-mem@thedotmack": True}
ROLE_PLUGINS = {r: {**GENERAL_PLUGINS, "superpowers@claude-plugins-official": r in ("producer", "editor")}
                for r in ROLE_GROUPS}
PLUGINS = {**GENERAL_PLUGINS, "superpowers@claude-plugins-official": False}
# which art style (from the avatar picker) maps to which video engine skill
ENGINE_FOR_STYLE = {"chalk": "claude-drawing-skill", "papercut": "claude-drawing-skill", "flat": "claude-drawing-skill",
                    "synthwave": "bang-motion", "bold": "huashu-art-motion"}
PLATFORM_NAME = {"youtube": "YouTube", "instagram": "Instagram", "director": "YouTube and Instagram (one video, both versions)"}
WHERE = {"youtube": "YouTube channel", "instagram": "Instagram account", "director": "YouTube channel and Instagram account"}
VOICES = {"youtube": "en-US-AndrewNeural", "instagram": "en-US-AvaNeural"}


def paths(aid: str) -> dict[str, Path]:
    d = state.channel_dir(aid)
    n = d / "neesmo"
    return {"dir": d, "n": n, "brief": n / "brief.md", "style": n / "style.json", "lessons": n / "lessons.md",
            "board": n / "board.md", "requests": n / "requests.md", "queue": n / "queue.json",
            "events": n / "events.jsonl", "prompts": n / "prompts", "videos": d / "videos",
            "inspiration": d / "inspiration", "stats": n / "stats.json"}


def read_json(p: Path, default):
    try:
        v = json.loads(p.read_text())
        return v if isinstance(v, type(default)) else default
    except (OSError, ValueError):
        return default


def write_json(p: Path, data) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=1, ensure_ascii=False))
    os.replace(tmp, p)


def event(aid: str, kind: str, text: str, **extra) -> dict:
    """One line on the card's timeline (and the fullscreen log)."""
    e = {"ts": state.now().isoformat(timespec="seconds"), "kind": kind, "text": text, **extra}
    p = paths(aid)["events"]
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "a") as f:
        f.write(json.dumps(e, ensure_ascii=False) + "\n")
    return e


def events(aid: str, n: int = 60) -> list[dict]:
    p = paths(aid)["events"]
    try:
        with open(p, "rb") as f:
            f.seek(0, 2)
            f.seek(max(0, f.tell() - 200_000))
            lines = f.read().decode(errors="replace").splitlines()[-n:]
    except OSError:
        return []
    out = []
    for ln in lines:
        try:
            out.append(json.loads(ln))
        except ValueError:
            pass
    return out


def board_post(aid: str, who: str, text: str) -> None:
    p = paths(aid)["board"]
    with open(p, "a") as f:
        f.write(f"- [{dt.date.today().isoformat()} {who}] {text.strip()}\n")


def add_request(aid: str, text: str, source: str = "owner") -> None:
    """An owner request from the home chat. Open requests beat the channel style."""
    p = paths(aid)["requests"]
    with open(p, "a") as f:
        f.write(f"- [ ] {dt.datetime.now().strftime('%Y-%m-%d %H:%M')} ({source}): {text.strip()}\n")
    event(aid, "request", f"New request: {text.strip()[:140]}")


def queue(aid: str) -> list[dict]:
    return read_json(paths(aid)["queue"], [])


def save_queue(aid: str, q: list[dict]) -> None:
    write_json(paths(aid)["queue"], q)


def update_video(aid: str, vid: str, **changes) -> dict | None:
    q = queue(aid)
    for v in q:
        if v["id"] == vid:
            v.update(changes)
            save_queue(aid, q)
            return v
    return None


def _link(dest: Path, names: list[str]) -> list[str]:
    """Make dest/.claude/skills hold links to exactly `names` (those the kit has); drop other kit links."""
    kit = state.KIT / ".claude" / "skills"
    sk = dest / ".claude" / "skills"
    sk.mkdir(parents=True, exist_ok=True)
    for link in sk.iterdir():
        if link.is_symlink() and link.name in SKILLS and link.name not in names:
            link.unlink()
    linked = []
    for s in names:
        src, link = kit / s, sk / s
        if src.exists() and not (link.is_symlink() or link.exists()):
            link.symlink_to(src.resolve())
            linked.append(s)
    return linked


def role_dir(aid: str, role: str) -> Path:
    """Folder a role's session runs in: its own skills, plus links back to the channel's files so the
    briefs' relative paths (neesmo/, videos/, inspiration/) still work."""
    d = state.channel_dir(aid)
    r = d / ".roles" / role
    r.mkdir(parents=True, exist_ok=True)
    for name in ("neesmo", "videos", "inspiration"):
        link = r / name
        if not (link.is_symlink() or link.exists()):
            link.symlink_to(Path("..") / ".." / name)
    _link(r, [x for g in ROLE_GROUPS[role] for x in SKILL_GROUPS[g]])
    return r


def _link_skills(d: Path) -> list[str]:
    linked = _link(d, SKILL_GROUPS["general"])
    gi = d / ".gitignore"
    if gi.exists() and ".roles/" not in gi.read_text():
        with open(gi, "a") as f:
            f.write(".roles/\n")
    if (d / "neesmo").exists() and d.parent == state.AGENT_HOME:
        for role in ROLE_GROUPS:
            role_dir(d.name, role)
    return linked


def _claude_settings(d: Path) -> None:
    p = d / ".claude" / "settings.json"
    s = read_json(p, {})
    s.setdefault("enabledPlugins", {}).update(PLUGINS)   # roles add their own with --settings
    write_json(p, s)


def _write_claude_md(p: dict) -> None:
    """Brief every session in the channel folder reads: the Director (main agent) and the rules for the roles."""
    title = (p["brief"].read_text().splitlines() or ["# Channel"])[0] if p["brief"].exists() else "# Channel"
    name = title.lstrip("# ").strip() or "Channel"
    (p["dir"] / "CLAUDE.md").write_text(
        f"# {name} - a Neesmo channel agent\n\n"
        "This folder is one channel run by Neesmo.\n\n"
        "## The Director (main agent)\n"
        "A session opened in this folder (no role brief given) is the Director: it runs the channel, talks to the owner\n"
        "and decides what's next. Its team is four subagents that Neesmo runs as short, separate sessions, each\n"
        "with its brief in `neesmo/prompts/`:\n"
        "- **Marketer**: ideas, hooks, script, title.\n"
        "- **Producer**: makes the video (voice, picture, sound, render).\n"
        "- **Supervisor**: directs before production (reviews the script, writes `shotlist.json`, a shot-by-shot plan\n"
        "  with camera, light, VFX and sound, from `neesmo/prompts/director.md`), then checks every video before the\n"
        "  owner sees it and sends it back with fixes when needed. It learns from `neesmo/director/playbook.md`.\n"
        "- **Analyst**: reads the views and writes what works into `neesmo/lessons.md`.\n"
        "The Director steers them through `neesmo/board.md` (one line, `@role NNN: ...` or `@marketer next: ...`)\n"
        "and turns owner wishes into open items in `neesmo/requests.md`. It does not make videos itself.\n\n"
        "## Rules for every session\n"
        "- Open requests in `neesmo/requests.md` come first, then `neesmo/lessons.md`, then `neesmo/style.json`.\n"
        "- Talk to the other roles only through `neesmo/board.md` (one line, `@role NNN: ...`).\n"
        "- Use the skills named in your brief for real (Skill tool); the supervisor checks.\n"
        "- Never upload, publish or delete anything yourself; Neesmo's scripts post after approval.\n"
        "- Keep runs lean: read only the files you need; no polling loops.\n")


def refresh(aid: str) -> None:
    """Re-copy the role briefs and re-link skills (after an update or a new kit install)."""
    p = paths(aid)
    p["prompts"].mkdir(parents=True, exist_ok=True)
    _write_claude_md(p)
    for r in ROLES + ["director"]:   # director.md = the supervisor's pre-production brief
        shutil.copy(state.STUDIO / "roles" / f"{r}.md", p["prompts"] / f"{r}.md")
    _link_skills(p["dir"])
    _claude_settings(p["dir"])


def create(name: str, brief: str, edition: str | None = None, style: str | None = None, aid: str | None = None,
           color: str | None = None) -> dict:
    """Make the folder, the brief, the style, and the home-screen card. Returns the agent entry."""
    import agents  # vega/agents.py (the server's card list)
    edition = edition or state.load()["edition"]
    aid = aid or re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:24] or "channel"
    p = paths(aid)
    for k in ("n", "videos", "inspiration"):
        p[k].mkdir(parents=True, exist_ok=True)
    s = state.load()
    style = style or (s.get("look") or {}).get("style") or "bold"
    if not p["brief"].exists():
        p["brief"].write_text(f"# {name}\n\nPlatform: {PLATFORM_NAME.get(edition, 'YouTube')}\n\n"
                              f"## What the owner asked\n{brief.strip()}\n\n"
                              "## Audience\n(the marketer fills this in after the first research run)\n")
    if not p["style"].exists():
        write_json(p["style"], {
            "format": "short", "size": "1080x1920", "max_seconds": 58, "engine": ENGINE_FOR_STYLE.get(style, "huashu-art-motion"),
            "art_style": style, "voice": VOICES.get(edition, "en-US-AndrewNeural"), "music_level": 0.3,
            "captions": "top, key word highlighted", "accent": color or "#ff6b35", "template": None})
    for k, text in (("lessons", "# Lessons\n\nNot enough data yet. Follow neesmo-viral-rules.\n"),
                    ("board", "# Board: notes between the roles (newest at the bottom)\n"),
                    ("requests", "# Owner requests (open ones beat the style; tick them when done)\n")):
        if not p[k].exists():
            p[k].write_text(text)
    if not p["queue"].exists():
        save_queue(aid, [])
    state.save_channel(aid)  # write defaults
    refresh(aid)
    _git_init(p["dir"], aid)
    items = [a for a in agents._raw() if a.get("id") != aid]
    items.append({"id": aid, "name": name, "folder": str(p["dir"]), "short": name.split()[0][:10],
                  "role": f"Runs the {name} {WHERE.get(edition, 'YouTube channel')}",
                  "kind": "channel", **({"color": color} if color else {})})
    agents.save(items)
    event(aid, "created", f"{name} is ready. The Director and its team (marketer, producer, supervisor, analyst) are set up.")
    return next(a for a in agents.load() if a["id"] == aid)


def _git_init(d: Path, aid: str) -> None:
    """Local history always; a private GitHub backup when the owner connected GitHub."""
    if not (d / ".git").exists():
        subprocess.run(["git", "init", "-q"], cwd=d)
        (d / ".gitignore").write_text("*.mp4\n*.mov\n*.wav\n*.mp3\nnode_modules/\n.cache/\n.roles/\n")
    if shutil.which("gh") and subprocess.run(["gh", "auth", "status"], capture_output=True).returncode == 0:
        has_remote = subprocess.run(["git", "remote"], cwd=d, capture_output=True, text=True).stdout.strip()
        if not has_remote:
            subprocess.run(["gh", "repo", "create", f"neesmo-{aid}", "--private", "--source", str(d), "--remote", "origin"],
                           cwd=d, capture_output=True)


def backup(aid: str, msg: str) -> None:
    d = state.channel_dir(aid)
    subprocess.run(["git", "add", "-A"], cwd=d, capture_output=True)
    if subprocess.run(["git", "commit", "-q", "-m", msg], cwd=d, capture_output=True).returncode == 0:
        subprocess.run(["git", "push", "-q", "-u", "origin", "HEAD"], cwd=d, capture_output=True, timeout=120)


def is_channel(a: dict) -> bool:
    return a.get("kind") == "channel"


def summary(aid: str) -> dict:
    """What the dashboard card shows."""
    q = queue(aid)
    c = state.channel(aid)
    counts: dict[str, int] = {}
    for v in q:
        counts[v.get("status", "?")] = counts.get(v.get("status", "?"), 0) + 1
    running = read_json(paths(aid)["n"] / "running.json", {})
    last = next((v for v in reversed(q) if v.get("poster")), None)
    return {"id": aid, "settings": c, "counts": counts, "running": running, "videos": q[-12:],
            "last_poster": last and last.get("poster"), "in_trial": state.in_trial(aid),
            "needs_approval": state.needs_approval(aid), "warmup_left": state.warmup_left(),
            "events": events(aid, 30), "roles": [{"id": r, "label": ROLE_LABEL[r]} for r in ROLES]}
