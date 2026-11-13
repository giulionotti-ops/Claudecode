# Clipping rules (set by the channel owner)

Follow these for every clip unless the owner says otherwise.

1. **Wait for the go.** Don't start clipping until the owner says to.
2. **Source: Twitch streams.** Use `auto_clip.py --url <VOD> --section START-END`.
   Only clip streamers who've given permission (clipping program or a written yes).
3. **Layout: camera on top, gameplay below**, filling the whole 9:16 screen with
   no bars. Find the streamer's facecam box on a frame of the VOD and pass it as
   `--facecam X:Y:W:H` (source pixels). Adjust `game_x` / `cam_height` per short
   so the action stays in frame.
4. **No text on screen.** No hook title, captions, handle or credit burned in.
   This is the default (`"text": false`). The credit and source link go in the
   description (`out/*.txt`) only.
5. **Go for viral moments.** Before rendering, pinpoint a couple of the strongest
   moments in the VOD (big reactions, chaos, funny fails, clutch plays). Use the
   `auto_clip.py` scores as a shortlist, check frames, and present the picks
   with timestamps and why each could go viral.
6. **Daily automation.** A scheduled task scans yesterday's most-watched
   gaming clips every day and follows `DAILY.md`. Auto-posting is ON (owner,
   2026-11-13): the best picks of approved streamers go up on their own, max
   1 a day (2 a day in GTA 6 launch week). Unapproved streamers are never
   posted.
7. **Channel scope.** A general gaming clipping channel, focused on GTA 6
   once it launches (Nov 19) because it'll be the hot topic.
