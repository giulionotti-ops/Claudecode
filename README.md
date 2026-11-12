# Roblox games

Luau source in `src/`, built with [Rojo](https://rojo.space) (pinned in `rokit.toml`).

- Build: `scripts/publish.sh --build` → `build/game.rbxl`
- Publish: `scripts/publish.sh` (Open Cloud). Needs `UNIVERSE_ID` / `PLACE_ID`
  in `publish.config` and `ROBLOX_API_KEY=...` in `~/.roblox.env` (chmod 600).
