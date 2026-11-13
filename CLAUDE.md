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

## Use the cheapest model that can do the job

Main thread (Opus): planning, judgment, creative writing, hard debugging, talking to the user.
Delegate the rest to the helpers in `.claude/agents`: `cavecrew-investigator` (Haiku, find/read),
`runner` (Haiku, run builds/renders/checks), `copywriter` (Haiku, titles/descriptions/captions),
`cavecrew-builder` (Sonnet, known 1-2 file edits), `cavecrew-reviewer` (Sonnet, diff review).
Other subagents default to Sonnet. On the server, `free-llm` sends plain text jobs to free models
(see `~/.claude/CLAUDE.md` there); never send secrets or private data to it.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## Replies

Keep replies to the user short and simple: plain words, a few lines, no long reports.
Use caveman mode (the `caveman` skill) for replies.
