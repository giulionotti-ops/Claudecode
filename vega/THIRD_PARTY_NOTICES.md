# Third-party software

Neesmo's own code is © the Neesmo authors. The installer downloads the tools and skills below from their
upstream sources at install time (they are not copied into Neesmo), and each keeps its own license.
Checked 2026-11-15.

## Python packages (requirements.txt)

| Package | License |
|---|---|
| fastapi | MIT |
| uvicorn | BSD-3-Clause |
| httpx | BSD-3-Clause |
| python-multipart | Apache-2.0 |
| claude-agent-sdk | MIT |
| google-api-python-client | Apache-2.0 |
| google-auth-oauthlib | Apache-2.0 |
| pywebpush | MPL-2.0 (used unmodified) |
| cryptography | Apache-2.0 OR BSD-3-Clause |

## Shipped in static/

| Item | Source | License |
|---|---|---|
| Motion 14.14.0 (`static/vendor/motion.js`) | motion.dev, github.com/motiondivision/motion | MIT (`static/vendor/motion-LICENSE.md`) |
| Geist and Geist Mono fonts (`static/fonts/`) | github.com/vercel/geist-font, via @fontsource-variable | SIL OFL 1.1 (`static/fonts/OFL.txt`) |

## Bundled tools (installed by `install.sh`, each optional)

| Tool | Source | License |
|---|---|---|
| OmniRoute (free-model gateway) | github.com/diegosouzapw/OmniRoute | MIT |
| graphify (code knowledge graph) | pypi.org/project/graphifyy | Apache-2.0 |
| claude-mem (long-term memory plugin) | github.com/thedotmack/claude-mem | Apache-2.0 |
| caveman plugin (short, plain replies) | github.com/JuliusBrussee/caveman | Apache-2.0 |

## Skill pack

| Skills | Source | License |
|---|---|---|
| 25 engineering skills (spec, TDD, debugging, review, …) | github.com/addyosmani/agent-skills | MIT |
| caveman family, cavecrew, surgical-patch, lean-build, … (22) | github.com/JuliusBrussee/caveman | Apache-2.0 |
| vercel-react-*, vercel-composition-patterns | github.com/vercel-labs/agent-skills | MIT (per skill) |
| design-taste-frontend | github.com/Leonxlnx/taste-skill | MIT |
| moneyprinterturbo-video | github.com/harry0703/MoneyPrinterTurbo | MIT |
| task-observer | github.com/rebelytics/one-skill-to-rule-them-all | CC-BY-4.0 (attribution: rebelytics) |
| agent-reach (read links, video transcripts) | github.com/Panniantong/Agent-Reach | MIT |
| graphify | graphifyy | Apache-2.0 |

## Not bundled

- **VoiceStudio** (speech): AGPL-3.0. Neesmo only talks to it over HTTP; install it yourself. Its skill is
  offered as an optional upstream download, not shipped.
- deploy-to-vercel, vercel-cli-with-tokens, vercel-optimize, web-design-guidelines, writing-guidelines:
  no license found upstream, so left out.
- Claude itself: each buyer signs in with their own Claude account or API key. Neesmo does not resell access.

## 3d-force-graph 1.77.0 (vega/static/vendor/3d-force-graph.min.js)

MIT License, Copyright (c) 2017 Vasco Asturiano. https://github.com/vasturiano/3d-force-graph
Bundles three.js (MIT, Copyright 2010-2024 three.js authors) and d3-force-3d (MIT).

## video-director (vega/studio/skills/video-director)

MIT License, Copyright (c) 2026 win4r. https://github.com/win4r/video-director
Bundled: SKILL.md, references/, scripts/ (unchanged). Full text in that folder's LICENSE.

## three.js 0.170.0 (installed by vega/studio/skills/neesmo-3d/engine/package.json)

MIT License, Copyright 2010-2024 three.js authors. Downloaded from npm at install time, not shipped.
