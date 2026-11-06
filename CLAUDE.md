# Instructions for Claude

## Skills and plugins always go in this repo

Cloud sessions run in a temporary container, so anything installed only on
the machine (user/global scope) is lost when the session ends.

- **Skills:** install at project scope so they land in `.claude/skills/`
  (e.g. `npx skills add <repo> --skill <name> -a claude-code -y`, without
  `-g`). Review the skill's files and scan it with
  `skillspector scan <skill-dir> --no-llm` (check flagged findings in
  context; many are false positives), then commit them together with
  `skills-lock.json` and push.
- **Plugins:** add the plugin's marketplace to `extraKnownMarketplaces` and
  the plugin to `enabledPlugins` in `.claude/settings.json`, then commit and
  push.
- **Tools that must be installed or started each session** (e.g. OmniRoute,
  the claude-mem worker) go in `.claude/hooks/session-start.sh`.

## Replies

Keep replies to the user short and simple: plain words, a few lines, no long reports.
