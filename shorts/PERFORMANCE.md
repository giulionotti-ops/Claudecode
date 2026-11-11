# What performs (read before writing a short)

**Studio analytics:** the Windsor.ai connector (connector `youtube`, account `79665`) reads YouTube Analytics: `average_view_percentage`, `average_view_duration`, `engaged_views`, `likes`, `shares`, `subscribers_gained`, `traffic_source`. Pull per `video` for the last 14 days and rank topics by retention first. The data lags 2–3 days.

Public numbers from the channel feed (live, but only views and likes):
`curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=UCG5mly4O1-Ouz2kt9KeYCVg"` (each entry has `views` and a like `count`). Refresh this table at the start of each run.

| Uploaded (UTC) | Short | Views | Likes | Note |
|---|---|---|---|---|
| 7 Nov 14:00 | ANGRON's story is the SADDEST in 40k 💔 | 1,287 | 35 | |
| 7 Nov 17:30 | Cadia Held 12 Times. The 13th Broke the World 🌍 | 1,513 | 42 | |
| 7 Nov 20:30 | He KNEW He Would Die... and Went Anyway 😢 Sanguinius | 1,371 | 36 | |
| 8 Nov 12:30 | The Emperor's FAVOURITE Son Betrayed Him 💔 | 1,657 | 54 | best so far |
| 8 Nov 17:30 | The UNLUCKIEST Space Marines in 40k 😭 The Lamenters | 1,266 | 37 | little-known Chapter holds up |
| 8 Nov 20:30 | A Whole Space Marine Chapter VANISHED... 🔥 | 1,256 | 34 | |
| 9 Nov 17:44 | He Raised the Lion Like a Son... Then BETRAYED Him 💔 Luther | 1,131 | 43 | |
| 10 Nov 12:30 | The Chapter PUNISHED for Being LIED To 💔 Mantis Warriors | 571 | 17 | 1 day old |
| 10 Nov 17:30 | He KILLED His Best Friend... Ferrus Manus | 15 | 1 | hours old |

(read 11 Nov 2026, 10:20 Italy time)

## The formula that is working
- **Subject:** a famous, tragic Primarch or a doomed hero, told as a betrayal, a sacrifice or a fall. The four uploads all passed 1,000 views in a day.
- **Title:** the name in CAPS + an emotion word or a curiosity gap + one emoji: "ANGRON's Story Is the SADDEST", "He KNEW He Would Die... and Went Anyway". Under 70 characters.
- **Script:** the first line names the hero and the hook; then one short line per beat, one scene per medallion; a gut-punch line just before the end; a quiet last line that lands the emotion.
- **Length:** 45–55 s, voice James at natural speed, captions on the banderole.
- **Pinned comment:** a question that splits people (monster or victim? which side?).

## Next ideas in the same vein
Primarchs and their tragedies first (Ferrus Manus, Konrad Curze, Magnus, Lion & Luther, Vulkan, Corax, Mortarion, Lorgar, Perturabo, Guilliman), then famous doomed heroes (Ollanius Pius, the Last Krieger, Bjorn), with a little-known canon Chapter story every few days.
