"""Neesmo Studio state: edition, first-run steps, owner settings, and per-channel settings.

Everything lives in NEESMO_DIR/studio/ as small JSON files written atomically, so scripts (cron, the
pipeline, the server) can all read it without talking to each other.
"""
import datetime as dt
import json
import os
from pathlib import Path

HOME = Path.home()
CONF = Path(os.environ.get("NEESMO_DIR", HOME / ".config" / "neesmo"))
DIR = CONF / "studio"
STATE = DIR / "state.json"
APP = Path(__file__).resolve().parent.parent           # vega/
STUDIO = Path(__file__).resolve().parent               # vega/studio/
KIT = Path(os.environ.get("NEESMO_KIT", HOME / ".neesmo-kit"))  # shared skills, linked into every channel
AGENT_HOME = Path(os.environ.get("NEESMO_AGENT_HOME", HOME / "neesmo-agents"))

WARMUP_DAYS = 10     # use the new account like a normal person before posting
TRIAL_DAYS = 7       # every video needs the owner's OK before it is scheduled

# first-run steps, in order
STEPS = ["install", "intro", "permissions", "name", "look", "warmup", "ready"]

DEFAULTS = {
    "edition": os.environ.get("NEESMO_EDITION", "youtube"),  # youtube | instagram (set by the license / build)
    "step": "install",
    "channel_name": "",
    "look": {},                    # {"style": ..., "avatar": path, "banner": path}
    "warmup_start": None,          # ISO date the 10 days started
    "warmup_done": None,           # ISO date the owner (or the clock) ended it
    "auto_permissions": None,      # True: agents don't ask before each step (fewer notifications)
    "notify": "important",         # important (videos + things that need you) | all | off
    "inspiration_hint_shown": False,
}


def now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _read(p: Path, default):
    try:
        v = json.loads(p.read_text())
        return v if isinstance(v, type(default)) else default
    except (OSError, ValueError):
        return default


def _write(p: Path, data) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=1))
    os.replace(tmp, p)


def load() -> dict:
    s = dict(DEFAULTS)
    s.update(_read(STATE, {}))
    return s


def save(**changes) -> dict:
    s = load()
    s.update(changes)
    _write(STATE, s)
    return s


def warmup_left(s: dict | None = None) -> int | None:
    """Days of warm-up still to go, 0 when over, None if it has not started."""
    s = s or load()
    if s.get("warmup_done"):
        return 0
    if not s.get("warmup_start"):
        return None
    start = dt.date.fromisoformat(s["warmup_start"])
    return max(0, WARMUP_DAYS - (dt.date.today() - start).days)


def advance(step: str) -> dict:
    """Move the first-run wizard to `step` (never backwards past install)."""
    if step not in STEPS:
        raise ValueError(step)
    return save(step=step)


# ---------------------------------------------------------------- channels (one per channel agent)

def channel_dir(aid: str) -> Path:
    return AGENT_HOME / aid


def channel_settings_path(aid: str) -> Path:
    return channel_dir(aid) / "neesmo" / "settings.json"


CHANNEL_DEFAULTS = {
    "videos_per_day": 1,
    "post_times": ["13:30", "19:30"],   # local time slots
    "timezone": "",                     # empty: the server's zone
    "format": "short",                  # short (vertical, <60 s) | long
    "auto_schedule": False,             # after the trial week: schedule without asking
    "auto_schedule_asked": False,       # the "can I schedule by myself now?" question was sent
    "trial_start": None,                # first video made (ISO date)
    "paused": False,
    "max_fix_rounds": 2,
}


def channel(aid: str) -> dict:
    s = dict(CHANNEL_DEFAULTS)
    s.update(_read(channel_settings_path(aid), {}))
    return s


def save_channel(aid: str, **changes) -> dict:
    s = channel(aid)
    s.update({k: v for k, v in changes.items() if k in CHANNEL_DEFAULTS})
    _write(channel_settings_path(aid), s)
    return s


def in_trial(aid: str) -> bool:
    """The first week every video must be approved before it is scheduled."""
    c = channel(aid)
    if not c.get("trial_start"):
        return True
    return (dt.date.today() - dt.date.fromisoformat(c["trial_start"])).days < TRIAL_DAYS


def needs_approval(aid: str) -> bool:
    return in_trial(aid) or not channel(aid).get("auto_schedule")
