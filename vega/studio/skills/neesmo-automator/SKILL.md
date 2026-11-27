---
name: neesmo-automator
description: Turn anything the owner wants to happen automatically in a Neesmo channel (on a schedule, after each video, after each post) into a plain Python script that runs with no AI and no tokens. Use whenever the owner asks for a recurring or automatic task, or when you notice a role repeating the same mechanical steps every video.
---

# Neesmo automator: automations are scripts

Rule: if a task is the same steps every time and needs no judgment or writing, it is a script, not an AI run.
Ideas, scripts, shot lists and quality reviews stay with the AI roles. Moving files, counting, pulling numbers,
renaming, resizing, making thumbnails, building reports, cleaning folders: scripts.

## Steps
1. Pick a short name (`weekly-top-comments`) and when it runs:
   `hourly` `daily` `weekly` `after_video` (gets the video id) `after_post` (gets the video id) `manual`.
2. Register it (this also writes a starter file):
   `python3 -m studio.automations add <channel> <name> <when> "<one sentence: what it does>"`
3. Write the work into `neesmo/automations/<name>.py`:
   - Standard library first. If you need a package, check it imports; never pip install from the script.
   - Read and write only inside the channel folder (`NEESMO_CHANNEL`). Video files are in `videos/<NNN>/`.
   - When `NEESMO_DRY_RUN=1`: do the reading and the maths, print what you would do, change nothing.
   - Never upload, publish, post or delete. Neesmo's own scripts post after the owner approves.
   - No API keys in the file. Use ones Neesmo already stores (ask the owner if one is missing).
   - Print one short line at the end (what it did). Exit 0 when it worked.
4. Run `python3 -m studio.automations check <channel> <name>` and fix it until it prints `ok`.
   The clock only runs checked scripts.
5. Tell the owner in one line what will now happen and when. Add a line to `neesmo/requests.md` and tick it.

## Manage
- `python3 -m studio.automations list <channel>`: every automation, last run and last result.
- `python3 -m studio.automations run <channel> <name> [video]`: run now.
- `python3 -m studio.automations remove <channel> <name>`: stop it (the file stays).
- A failed run shows in the channel events. Fix the script, run `check` again.

## Spot new ones
When the board or a role's notes show the same manual steps on 3 videos in a row, propose a script to the owner
in one line ("I can do X automatically after every video, no AI needed. Want it?"), then follow the steps.
