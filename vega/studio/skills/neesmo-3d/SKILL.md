---
name: neesmo-3d
description: Neesmo's 3D engine for videos that should look like real footage with a filter on it (real 3D objects, physically based materials, real lighting and shadows, depth of field, bloom, film grain). Builds each shot as a seekable Three.js scene and renders it frame by frame in headless Chromium, with or without a GPU. Use when style.json says "engine": "neesmo-3d", or when the shot list asks for x-ray, exploded or cutaway views, machines, products, physics or anything that needs depth and light.
---

# Neesmo 3D engine

The look we are after: the viewer should feel they are watching **reality with a filter on it**. Real objects
with weight, light that behaves like light, a camera that moves like a camera. Flat 2D motion graphics are
not this engine.

## Files
- `engine/render.js`: the renderer. `node <this skill>/engine/render.js <scene.html> <out.mp4> --w 1080 --h 1920 --fps 30`
  - `--stills 0.5,3.2,9.0` writes PNGs at those times instead of a video (look before the full render).
  - `--from 4 --to 8` renders only part of the timeline (re-render one shot).
- `engine/scene.html`: the starter scene. **Copy it into the video folder** and replace the subject. Keep the
  contract and the look stack.
- First use on a machine: `cd <this skill>/engine && npm i --no-audit --no-fund` (installs three.js 0.170.0).

## Contract (the renderer needs it)
- `window.DUR` (seconds), `window.READY` (a Promise), `window.seek(t)` draws the frame at `t`, synchronously.
- **Time is the only input.** No `Date.now()`, `requestAnimationFrame` loops, `Math.random()` (use the seeded
  `rng()`), or physics that carries state. Precompute simulations at load and read them by `t`.
- One timeline object in the page with the shot list's beats in seconds. Every animated value is a function of
  `t` and a beat. No bare frame numbers.

## The look stack (each item is there for a reason)
1. **Physically based materials.** `MeshStandardMaterial`/`MeshPhysicalMaterial` with real `metalness` and
   `roughness`. Real things vary: add roughness or normal detail (procedural noise textures) so surfaces are
   not plastic-perfect. Glass: `transmission`, `ior`. Liquids: physical material plus clearcoat.
2. **Environment light.** `RoomEnvironment` through `PMREMGenerator`, or a procedural sky, so metal reflects
   something. Keep `environmentIntensity` low (0.2-0.5) so the key light still shapes the object.
3. **A key, a rim, a dark fill.** Warm key with soft shadows (`PCFSoftShadowMap`), cool rim to cut the
   silhouette off the background. Motivate the light (a window, a lamp, the sun) and keep it consistent
   across shots.
4. **ACES Filmic tone mapping.** Exposure about 1.0. Never leave the default linear look.
5. **Atmosphere.** Light exponential fog, a few slow dust motes in the key light. They give depth.
6. **Lens.** A vertical FOV of 25-40 degrees (a 50-85 mm look). `BokehPass` focus on the subject; rack focus
   between subjects on a beat. Wide 60-75 degrees only for scale shots.
7. **Post.** `UnrealBloomPass` with a high threshold (only hot or emissive parts glow), film grain stepped at
   24 fps, a soft vignette. Optional: slight chromatic aberration at the frame edges, a colour grade via `LUTPass`.
8. **Camera moves like a rig.** Ease every move (cubic ease-in/out), no linear pans, no shake unless the shot
   list asks for it. Dolly, orbit, crane and push-in come from the shot list.

## House-style tools (from the director's references)
- **X-ray / cutaway:** draw the outer shell with a `MeshPhysicalMaterial` at `opacity` 0.15-0.3 plus a fresnel
  rim (`onBeforeCompile`), and the inner parts at full opacity. Or clip with `material.clippingPlanes` and
  animate the plane to slice the object open.
- **Exploded view:** each part has an `explode` offset; position = rest + offset * ease(beat). Parts lag their
  parents by 2-4 frames.
- **Time-scale badge (REAL SPEED -> 256x SLOWER):** drive every motion with `simT = f(t)`, a piecewise time
  remap, and show the factor as an HTML/canvas overlay that is drawn by `seek(t)` too.
- **Leader labels and HUD:** project a 3D point to the screen (`vector.project(cam)`) and draw the label on a
  2D canvas layered over the WebGL canvas, inside `seek(t)`. Text at least 48 px at 1080 wide, 7:1 contrast.

## Workflow (with the shot list)
1. Build the scene for the hook shot first. `--stills` at 2-4 key times. Look at them: does it read as a real
   object in real light? Fix materials and light before animating more.
2. Build shot by shot. One page can hold the whole film (switch subjects and cameras by beat) or one page per
   shot (render each, then join with ffmpeg). Keep shared materials and lights in one place.
3. Draft: `--w 540 --h 960 --fps 15` (about 1.5 s per frame on a CPU-only server, so a 30 s draft is about
   10 minutes). Final: the size in `style.json` at 30 fps. Render in the foreground with a long timeout.
4. Voice, SFX, music and captions are mixed with ffmpeg afterwards, timed on the same beats.

## Speed
- Heavy passes cost the most: drop `BokehPass` on shots without a focus change, and lower the shadow map to 512 for drafts.
- Reuse geometries and materials; never create them inside `seek`.
- Keep instance counts reasonable (`InstancedMesh` for many parts).
