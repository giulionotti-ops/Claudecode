# Ricochet Room

A second channel: satisfying ball-physics shorts (like "Will It Overflow? Every hit splits a ball"). Everything is simulated and drawn from scratch, so there's no footage or music to license.

| Short | Idea | Ends at |
|---|---|---|
| `will-it-overflow` | A spinning bar; every ball it hits splits in two | 1,000 balls, the circle bursts |
| `can-it-escape` | One ball inside 15 spinning rings with gaps; each gap it finds breaks a ring | the last ring breaks |
| `will-it-fill` | One ball that grows 2.2% every bounce | it fills the circle |

- `engine.py`: physics, picture (1080x1920, 60 fps) and sound (a note on every hit, rising as it goes).
  New short: add an `Episode` class, then `python engine.py <name> --probe` to find a seed that finishes at 40–45 s.
- `build.sh`: rebuilds all three videos and the brand art.
- `brand/`: profile picture and banner. `brand.py` draws them.
- `UPLOADS.md`: titles, descriptions, tags and post times.
- `uploader/`: the same uploader as the 40K channel, with this channel's videos and `schedule.json`. Run `python upload.py auth` signed in with the **Ricochet Room** Google account (it gets its own `token.json`).
