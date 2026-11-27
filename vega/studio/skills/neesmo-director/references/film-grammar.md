# Film grammar (the director's vocabulary)

Use these exact words in `shotlist.json` so the producer and the check script read the same language.

## Shot size (`size`)
| value | frames | use it for |
|---|---|---|
| `EWS` extreme wide | city, planet, whole machine; subject tiny | scale, loneliness, "how big is this" |
| `WS` wide | whole subject + surroundings | where we are, geography of the action |
| `MS` medium | subject from the waist / mid-machine | the action itself |
| `MCU` medium close | head and shoulders / one assembly | reaction, decision |
| `CU` close-up | face / one part fills the frame | emotion, the important part |
| `ECU` extreme close-up | eye, gear tooth, crack, number | the detail that matters, tension |
| `INSERT` | a prop, a label, a dial, a screen | facts, numbers, proof |
| `POV` point of view | what the character sees | put the viewer inside (disaster stories) |
| `OTS` over the shoulder | past one subject to another | confrontation, scale between two things |
| `TOP` top-down / god's eye | straight down | maps, patterns, planning, chaos below |
| `CUTAWAY` x-ray / cross-section | inside of a thing | mechanisms (engineering explainers) |

## Angle (`angle`)
`eye-level` neutral - `low` power, threat, monumental - `high` weak, small, overview - `dutch` (tilted)
unease - `worm's-eye` gigantic - `bird's-eye` map logic.

## Lens (`lens`)
- `14mm` / `18mm` ultra-wide: deep space, distortion at edges, speed, scale. Moves feel fast.
- `24mm`-`35mm`: natural, documentary, POV.
- `50mm`: neutral, honest.
- `85mm`-`135mm`: compressed background, isolation, intimacy, shallow focus.
- `macro`: tiny things huge (insects, circuits, cracks).
- `anamorphic`: oval bokeh, horizontal flares, "movie" feel.
In 2D/code engines, lens = how much perspective, how big the background, how blurred the depth layers.

## Camera move (`camera`)
| move | meaning | how (code engines) |
|---|---|---|
| `static` | let the action talk; documentary truth | no transform; something inside moves |
| `push-in` | realisation, tension rising | scale 1.00 -> 1.12 over the shot, ease-in-out |
| `pull-out` | reveal, scale, consequence | scale 1.2 -> 1.0, new elements enter at edges |
| `pan` / `tilt` | follow, reveal along a line | translate x / y, parallax layers at 3 speeds |
| `track` / `truck` | travel with the subject | background scrolls, subject stays |
| `orbit` | importance, hero moment | rotate around subject (3D) or parallax arc (2D) |
| `crane` up/down | grand reveal / descent into detail | y-translate + scale together |
| `dolly-zoom` (Vertigo) | shock, the world shifts | background scales opposite to subject |
| `whip-pan` | time jump, energy, transition | 6-8 frames of motion blur sideways |
| `crash-zoom` | comic or violent emphasis | 1.0 -> 1.6 in 4 frames + shake |
| `handheld` | panic, realism, POV | low-amplitude noise on x/y/rotation |
| `snorricam` | character locked, world spins | subject fixed centre, background rotates |
| `rack-focus` | shift attention | blur A while sharpening B |
| `speed-ramp` | impact, slow-motion beauty | 100% -> 20% -> 100% around the hit |

## Lighting (`lighting`)
Describe: **key direction + hardness + colour temperature + fill ratio + practicals + atmosphere.**
- `high-key`: bright, low contrast, friendly (science for kids, product).
- `low-key / chiaroscuro`: dark with one hard key - mystery, danger, history.
- `Rembrandt`: key 45° high, triangle of light on the far cheek - drama, portraits.
- `rim / back light`: bright outline separates subject from a dark background - the Neesmo default on dark.
- `silhouette`: subject black against bright sky - iconic, tragic, heroic.
- `top light`: from above - interrogation, isolation.
- `under light`: from below - horror, fire, screens.
- `practicals`: light sources in the frame (lamps, screens, lava, warning lights) - make the world real.
- `motivated`: every light has a source the viewer can believe.
- `volumetric / god rays`: haze lit by a hard key - scale, holiness, dust, smoke.
- `colour contrast`: warm key vs cool fill (orange/teal) - instant "cinema".
- `flicker / strobe`: failure, alarm, lightning.
- `neon`: magenta/cyan practicals, wet reflections - future, cities, tech.
Temperatures: candle 1900K, tungsten 3200K, golden hour 3500K, daylight 5600K, overcast 6500K, blue hour 9000K+.

## Colour (`palette`)
2-3 named colours + the channel accent. Accent = where the eye goes. Examples:
`teal shadows / amber highlights / accent orange #ff6b35` - `bleach-bypass steel grey + blood red` -
`sodium orange night + cyan screens` - `desaturated everything + one saturated object (Schindler's List)`.

## Composition (`composition`)
rule of thirds - centre punch (Kubrick one-point) - symmetry (Wes Anderson) - leading lines - frame in frame -
negative space (subject small in emptiness) - foreground occlusion (depth) - shapes rhyme across a cut.
Shorts: keep the subject in the middle 60 % and out of the caption band (top third).

## Transitions (`transition`)
| value | use |
|---|---|
| `cut` | default, invisible |
| `cut-on-action` | movement starts in A, finishes in B - smoothest cut there is |
| `smash-cut` | quiet -> loud (or loud -> silence), shock or comedy |
| `match-cut` | shape/motion in A rhymes with B (bone -> satellite) |
| `match-move` | camera move continues across the cut |
| `whip` | whip-pan blur joins two places/times |
| `morph` | A shape turns into B (code engines do this beautifully) |
| `zoom-through` | push into an object, come out in the next scene |
| `J-cut` | next shot's sound starts before its picture |
| `L-cut` | this shot's sound continues over the next picture |
| `iris` / `wipe` | playful, retro, chapter break |
| `flash` | white frame, 2-3 frames - explosion, memory, photo |
| `fade-black` | end, death, time passing (rare in shorts) |

## VFX (`vfx`)
particles (dust, embers, sparks, snow, bubbles) - glow / bloom - lens flare - heat shimmer - smoke and haze -
motion blur - speed lines - camera shake (amount + frequency) - chromatic aberration - film grain - light leaks -
vignette - halftone / ink (Spider-Verse) - scan lines / CRT - glitch - x-ray reveal - wireframe -> solid build -
counters and live numbers - drawn-on lines - labels with leader lines - shockwave ring - debris - water caustics.

## Sound (`sfx`, `music`)
Layer every shot:
- **hit**: whoosh, impact, boom, click, snap, thud, riser, braaam, sub drop, glass break, metal clang.
- **bed**: room tone, wind, rain, crowd murmur, engine hum, ocean, electrical buzz, heartbeat.
- **detail**: tick, creak, drip, servo whine, paper rustle, keyboard, footsteps, breath.
- **UI** (explainers): pop, ding, swipe, counter tick, typewriter.
Rules: a whoosh on every camera move faster than 0.5 s; an impact on every smash cut; sound leads picture by
2-4 frames (J-cut); silence (or a tinnitus ring) right before the biggest moment; a sub-drop under the reveal.
Music cues: `intro pulse`, `build`, `drop on cut`, `stop dead`, `swell`, `resolve`, `loop back`.
