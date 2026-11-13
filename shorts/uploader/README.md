# Glazier of Terra uploader

Uploads, captions and schedules the channel's shorts with the YouTube Data API. It's also the app you'll record for the audit screencast.

## One-time setup (laptop or VPS)
1. Install Python 3.10 or newer (python.org).
2. Download this `uploader` folder. Put in it:
   - `client_secret.json` (your Google Cloud Desktop OAuth JSON, renamed to exactly this);
   - the videos and captions: `angron.mp4`, `angron.srt`, `horus-heresy.mp4`, … (the files from the chat).
3. Open a terminal in the folder and run:
   ```
   pip install -r requirements.txt
   python upload.py auth
   ```
   A Google page opens: sign in with the **channel's** Gmail and allow access. If Google says the app is unverified, click "Advanced" and continue; it's your own app.
4. Check it worked: `python upload.py check` prints your channel name.

## Upload
- One video: `python upload.py upload angron`
- All videos in `schedule.json` not yet uploaded: `python upload.py upload --all`
- Preview without uploading: add `--dry-run`

Times in `schedule.json` are Italian time. Videos go up as private and YouTube publishes them at that time. Until the API audit is approved, YouTube keeps API uploads private even after the publish time.

## Screencast for the audit form (about 1–2 minutes)
Start screen recording, then:
1. Show the website `giulionotti-ops.github.io/Claudecode/`.
2. Run `python upload.py auth` and show the Google consent screen, with the app name and the permissions it asks for.
3. Run `python upload.py upload angron` and show the progress up to "done" and the link.
4. Open YouTube Studio and show the uploaded video, its title and its captions.
5. Show where access can be removed: myaccount.google.com/permissions.

Upload the recording to the form (Section 6, Other Supporting Materials) or share a link, plus screenshots of the consent screen (step 2) and the upload (step 3).

Keep `client_secret.json` and `token.json` private: never share them or put them on GitHub.
