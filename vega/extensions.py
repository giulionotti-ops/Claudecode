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


def _claude(*args: str, timeout: int = 60, cwd: Path | None = None) -> str:
    exe = shutil.which("claude")
    if not exe:
        raise RuntimeError("Claude Code is not installed on this server")
    r = subprocess.run([exe, *args], capture_output=True, text=True, timeout=timeout, cwd=cwd)
    if r.returncode:
        raise RuntimeError((r.stderr or r.stdout).strip()[-300:] or "claude plugin failed")
    return r.stdout


# Popular general plugins from Anthropic's official marketplace. Shown switched off until installed;
# switching one on installs it at user scope, so every new session gets it.
SUGGESTED = {
    "superpowers": "Brainstorming, planning and subagent-driven development",
    "frontend-design": "Distinctive, production-grade web interfaces",
    "code-review": "Multi-agent review of pull requests",
    "code-simplifier": "Cleans up code for clarity without changing behaviour",
    "feature-dev": "Guided feature work: explore, plan, build, review",
    "security-guidance": "Warns about security problems as Claude edits",
    "commit-commands": "Commit, push and open a PR in one command",
    "pr-review-toolkit": "Review agents for tests, errors, types and comments",
    "claude-md-management": "Keeps CLAUDE.md files short and current",
    "skill-creator": "Make and test new skills",
    "context7": "Up-to-date library docs (online service)",
    "playwright": "Drives a real browser to test web pages",
    "github": "GitHub issues and pull requests (needs a GitHub token)",
    "ralph-loop": "Runs a task in a loop until it is done",
}
OFFICIAL = "claude-plugins-official"


def plugins(fresh: bool = False) -> list[dict]:
    """User-scope plugins (the ones every session gets), one row per plugin id, then the suggested ones
    not installed yet."""
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
    names = {o["name"] for o in out}
    out += [{"id": f"{n}@{OFFICIAL}", "name": n, "on": False, "version": "", "license": "", "description": d,
             "suggested": True} for n, d in SUGGESTED.items() if n not in names]
    _plugins_cache = (time.time(), out)
    return out


def set_plugin(pid: str, on: bool) -> None:
    if not _PLUGIN.match(pid):
        raise ValueError("bad plugin id")
    global _plugins_cache
    installed = {p["id"] for p in plugins() if not p.get("suggested")}
    if on and pid not in installed:
        name, market = pid.split("@")
        if market != OFFICIAL or name not in SUGGESTED:
            raise ValueError("only installed or suggested plugins can be switched on")
        _claude("plugin", "install", pid, "-s", "user", timeout=180)
    else:
        _claude("plugin", "enable" if on else "disable", pid, "-s", "user")
    _plugins_cache = None


# ── per-agent plugins ─────────────────────────────────────────────────────────────────────────────
# Each agent's card shows only the plugins that fit its job. A job is a set of tags read from the
# agent's folder (code files, git, a GitHub remote, a web project) and from its name, role and brief.
# Switches write the agent folder's local settings (.claude/settings.local.json, never committed), so
# other agents and the general list in Settings → System are not touched.
TAGS = {
    "caveman": {"general"}, "claude-mem": {"general"}, "superpowers": {"general"},
    "claude-md-management": {"general"}, "skill-creator": {"general"}, "ralph-loop": {"general"},
    "context7": {"code"}, "code-review": {"github"}, "code-simplifier": {"code"},
    "feature-dev": {"code"}, "security-guidance": {"code"}, "commit-commands": {"git"},
    "pr-review-toolkit": {"github"}, "github": {"github"}, "frontend-design": {"web"},
    "playwright": {"web"},
}
_CODE_FILES = ("package.json", "pyproject.toml", "requirements.txt", "Cargo.toml", "go.mod", "Gemfile",
               "pom.xml", "build.gradle", "Makefile", "CMakeLists.txt", "default.project.json")
_CODE_EXT = {".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".rb", ".java", ".cs", ".cpp", ".c",
             ".lua", ".luau", ".php", ".swift", ".kt", ".sh", ".html", ".vue", ".svelte"}
_WORDS = {
    "code": r"\b(code|coding|app|api|bug|fix|build|develop|dev|script|software|program|game|server|bot|tool)",
    "web": r"\b(web|site|website|shop|store|frontend|front-end|ui|page|landing|html|css|react|next)",
}
_MEDIA = r"\b(shorts?|clips?|videos?|comics?|lore|youtube|tiktok|reels?|podcast|writing|blog)\b"
_agent_cache: dict[str, tuple[float, list]] = {}


def agent_job(folder: Path, text: str) -> set[str]:
    tags = {"general"}
    try:
        names = [p.name for p in folder.iterdir()][:400]
    except OSError:
        names = []
    sub = []   # project manifests one folder down (an app kept in ./app, ./vega, ...)
    for n in names:
        d = folder / n
        if not n.startswith(".") and n != "node_modules" and d.is_dir():
            try:
                sub += [p.name for p in d.iterdir() if p.name in _CODE_FILES or p.name == "index.html"][:20]
            except OSError:
                pass
    if any(n in _CODE_FILES for n in names + sub) or any(Path(n).suffix in _CODE_EXT for n in names):
        tags.add("code")
    if {"package.json", "index.html"} & set(names + sub):
        tags.add("web")
    if (folder / ".git").exists():   # a folder or, in a worktree, a file
        tags.add("git")
        try:
            url = subprocess.run(["git", "-C", str(folder), "remote", "-v"], capture_output=True, text=True,
                                 timeout=5).stdout
            if "github.com" in url:
                tags.add("github")
        except (OSError, subprocess.TimeoutExpired):
            pass
    low = text.lower()
    words = {tag for tag, rx in _WORDS.items() if re.search(rx, low)}
    if re.search(_MEDIA, low) and not words:   # a video or writing job: its scripts are tooling, not the product
        tags -= {"code", "web", "github"}
    tags |= words
    if "web" in tags:
        tags.add("code")
    if "github" in tags:
        tags.add("git")
    return tags


def agent_plugins(folder: Path, text: str, fresh: bool = False) -> dict:
    """Plugins for one agent: `fits` (its job could use them) and `on` (loaded in its folder)."""
    key = str(folder)
    hit = _agent_cache.get(key)
    if fresh or not hit or time.time() - hit[0] > 30:
        try:
            raw = json.loads(_claude("plugin", "list", "--json", cwd=folder))
        except (RuntimeError, ValueError, OSError, subprocess.TimeoutExpired):
            raw = []
        hit = _agent_cache[key] = (time.time(), raw)
    job, out, seen = agent_job(folder, text), [], set()
    for p in hit[1]:
        pid = p.get("id", "")
        if pid in seen or not _PLUGIN.match(pid):
            continue
        seen.add(pid)
        name = pid.split("@")[0]
        tags = TAGS.get(name)
        fits = bool(tags & job) if tags else p.get("scope") in ("project", "local") or bool(p.get("projectEnabled"))
        out.append({"id": pid, "name": name, "on": bool(p.get("enabled")), "fits": fits,
                    "description": SUGGESTED.get(name, ""), "scope": p.get("scope", "")})
    names = {o["name"] for o in out}
    out += [{"id": f"{n}@{OFFICIAL}", "name": n, "on": False, "fits": True, "description": d, "suggested": True}
            for n, d in SUGGESTED.items() if n not in names and TAGS.get(n, set()) & job]
    out.sort(key=lambda o: (not o["fits"], not o["on"], o["name"]))
    return {"job": sorted(job), "plugins": out}


def set_agent_plugin(folder: Path, text: str, pid: str, on: bool) -> None:
    if not _PLUGIN.match(pid):
        raise ValueError("bad plugin id")
    known = {p["id"]: p for p in agent_plugins(folder, text)["plugins"]}
    p = known.get(pid)
    if p is None:
        raise ValueError("this plugin is not offered for this agent")
    if p.get("suggested"):
        if not on:
            return
        _claude("plugin", "install", pid, "-s", "local", timeout=180, cwd=folder)
    else:
        _claude("plugin", "enable" if on else "disable", pid, "-s", "local", cwd=folder)
    _agent_cache.pop(str(folder), None)


if __name__ == "__main__":
    for s in notices():
        print(s["title"], len(s["rows"]), len(s["notes"]))
    print(len(skills()), "skills;", plugins())
