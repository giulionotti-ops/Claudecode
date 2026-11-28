"""Look check for a neesmo-3d scene page before any frame is rendered (no tokens, no rendering).

Plain CG fails the "reality with a filter" look for the same few reasons every time. This reads the scene page and
refuses the render when one of the film-look basics is missing, or when the page breaks the time-only contract.

  python3 -m studio.looklint videos/<NNN>/scene.html      -> exit 0 if ok, else a list of fixes

studio.shotrender runs it first and stops on a failure (--force skips it, and the supervisor sees that).
"""
import re
import sys
from pathlib import Path

NEED = [
    (r"\.hdr\b|\.exr\b", "light from a real place: load a Poly Haven HDRI (python3 -m studio.assets <video> hdri \"<place>\") "
                         "as scene.environment, not only RoomEnvironment"),
    (r"roughnessMap|normalMap|aoMap", "real surface wear: give every hero material a scanned roughnessMap and normalMap "
                                      "(python3 -m studio.assets <video> texture \"scratched metal\")"),
    (r"castShadow", "objects must cast soft shadows (castShadow on the key light and the objects)"),
    (r"PCFSoftShadowMap|VSMShadowMap", "soft shadows: renderer.shadowMap.type = THREE.PCFSoftShadowMap"),
    (r"ACESFilmicToneMapping|AgXToneMapping", "film tone mapping: renderer.toneMapping = THREE.ACESFilmicToneMapping"),
    (r"\bFog(Exp2)?\b", "atmosphere: scene.fog (light FogExp2) so depth reads"),
    (r"EffectComposer", "a post stack (EffectComposer): bloom on hot spots, grain, vignette"),
    (r"grain", "film grain stepped at 24 fps"),
]
BANNED = [
    (r"Math\.random\s*\(", "Math.random() breaks re-renders: use the seeded rng()"),
    (r"Date\.now\s*\(|performance\.now\s*\(", "clock time breaks seeking: every value is a function of t"),
    (r"requestAnimationFrame", "no animation loop: the renderer calls seek(t)"),
]


def check(scene: Path) -> list[str]:
    if not scene.exists():
        return [f"no such scene page: {scene}"]
    src = scene.read_text(errors="replace")
    code = re.sub(r"/\*.*?\*/|(?<![:'\"`])//[^\n]*", "", src, flags=re.S)   # comments neither pass nor fail a check
    errs = [msg for pat, msg in NEED if not re.search(pat, code)]
    errs += [msg for pat, msg in BANNED if re.search(pat, code)]
    for ref in sorted(set(re.findall(r"""['"`](assets/[^'"`$]+?\.(?:hdr|exr|jpg|png|gltf|glb))['"`]""", code))):
        if not (scene.parent / ref).exists():
            errs.append(f"{ref} is referenced but missing (fetch it with python3 -m studio.assets)")
    if not re.search(r"window\.seek\s*=", src) or not re.search(r"window\.DUR\s*=", src):
        errs.append("the contract needs window.DUR, window.READY and window.seek(t)")
    return errs


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__)
        return 2
    errs = check(Path(argv[0]))
    if errs:
        print("LOOK NOT OK - fix these before rendering:\n- " + "\n- ".join(errs))
        return 1
    print("look ok")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
