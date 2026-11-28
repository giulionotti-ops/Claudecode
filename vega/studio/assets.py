"""Film-grade 3D building blocks for neesmo-3d, free (Poly Haven, CC0: no credits, no attribution needed).

Plain CG looks plain because it has perfect light and perfect surfaces. Real footage has light from a real place
(an HDRI photographed on location) and surfaces with wear (scanned textures). This script fetches both, plus
scanned models, into the video folder so the scene page can load them.

  python3 -m studio.assets videos/<NNN> search texture "brass"          # list matches, download nothing
  python3 -m studio.assets videos/<NNN> hdri "workshop"           # assets/hdri/<id>/... + assets/env.hdr
  python3 -m studio.assets videos/<NNN> texture "scratched metal" [--res 1k]   # maps + assets/wear_<map>.jpg
  python3 -m studio.assets videos/<NNN> model "padlock"                  # glTF + its textures

Writes videos/<NNN>/assets/<kind>/<id>/... and appends to videos/<NNN>/assets/assets.json.
Drafts use 1k (default); finals can use 2k.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

API = "https://api.polyhaven.com"
UA = {"User-Agent": "neesmo-assets/1.0 (CC0 asset fetcher)"}
KIND = {"hdri": "hdris", "texture": "textures", "model": "models"}
MAPS = {"Diffuse": "diff", "nor_gl": "nor_gl", "Rough": "rough", "AO": "ao", "arm": "arm"}


def _get(url: str, timeout: int = 60) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def search(kind: str, query: str, n: int = 8) -> list[tuple[str, dict]]:
    """Rank by how many query words hit the id, name, tags and categories; popular assets first on ties."""
    assets = json.loads(_get(f"{API}/assets?t={KIND[kind]}"))
    words = [w for w in re.findall(r"[a-z0-9]+", query.lower()) if len(w) > 1]
    scored = []
    for aid, a in assets.items():
        hay = re.findall(r"[a-z0-9]+", " ".join([aid.replace("_", " "), a.get("name", ""), *a.get("tags", []),
                                                 *a.get("categories", [])]).lower())
        hits = sum(1 for w in words if any(t == w or t.startswith(w) for t in hay))   # whole words: "lock" is not "clock"
        if hits:
            scored.append((hits, a.get("download_count", 0), aid, a))
    exact = query.strip().lower().replace(" ", "_")
    if exact in assets:   # an id from a search listing fetches that exact asset
        scored.append((99, 0, exact, assets[exact]))
    scored.sort(key=lambda x: (-x[0], -x[1]))
    return [(aid, a) for _, _, aid, a in scored[:n]]


def _save(url: str, f: Path) -> None:
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_bytes(_get(url))


def fetch(vdir: Path, kind: str, query: str, res: str = "1k") -> dict:
    hits = search(kind, query, 1)
    if not hits:
        return {"kind": kind, "query": query, "error": "no match; try a simpler word (search lists options)"}
    aid, meta = hits[0]
    files = json.loads(_get(f"{API}/files/{aid}"))
    d = vdir / "assets" / kind / aid
    got = {}
    missing = []
    if kind == "hdri":
        rr = res if res in files["hdri"] else "1k"
        f = d / f"{aid}_{rr}.hdr"
        _save(files["hdri"][rr]["hdr"]["url"], f)
        got["hdr"] = str(f.relative_to(vdir))
        # stable name the starter scene loads: the last HDRI fetched is the video's light
        (vdir / "assets" / "env.hdr").write_bytes(f.read_bytes())
        got["scene_name"] = "assets/env.hdr"
    elif kind == "texture":
        for key, name in MAPS.items():
            opts = files.get(key) or {}
            rr = res if res in opts else "1k"
            if rr in opts and "jpg" in opts[rr]:
                f = d / f"{aid}_{name}_{rr}.jpg"
                _save(opts[rr]["jpg"]["url"], f)
                got[name] = str(f.relative_to(vdir))
                # stable names the starter scene loads (assets/wear_rough.jpg ...): the last texture fetched
                (vdir / "assets" / f"wear_{name}.jpg").write_bytes(f.read_bytes())
            else:
                missing.append(name)
    else:
        g = (files["gltf"].get(res) or files["gltf"]["1k"])["gltf"]
        f = d / f"{aid}.gltf"
        _save(g["url"], f)
        for rel, inc in (g.get("include") or {}).items():   # buffers and textures the glTF points to
            _save(inc["url"], d / rel)
        got["gltf"] = str(f.relative_to(vdir))
    rec = {"kind": kind, "query": query, "id": aid, "name": meta.get("name"), "license": "CC0 (Poly Haven)",
           "page": f"https://polyhaven.com/a/{aid}", "files": got, "missing_maps": missing}
    log = vdir / "assets" / "assets.json"
    rows = json.loads(log.read_text()) if log.exists() else []
    rows = [x for x in rows if x.get("id") != aid] + [rec]
    log.write_text(json.dumps(rows, indent=1))
    return rec


def main(argv: list[str]) -> int:
    res = "1k"
    if "--res" in argv:
        i = argv.index("--res")
        res = argv[i + 1] if i + 1 < len(argv) else "1k"
        del argv[i:i + 2]
    if len(argv) < 3 or (argv[1] == "search" and len(argv) < 4):
        print(__doc__)
        return 2
    vdir = Path(argv[0])
    if not vdir.is_dir():
        print(f"no such video folder: {vdir}")
        return 1
    if argv[1] == "search":
        kind, query = argv[2], " ".join(argv[3:])
        if kind not in KIND:
            print(f"kind must be one of {', '.join(KIND)}")
            return 2
        for aid, a in search(kind, query):
            print(f"{aid}: {a.get('name')} - {', '.join(a.get('tags', [])[:6])}")
        return 0
    kind, query = argv[1], " ".join(argv[2:])
    if kind not in KIND:
        print(f"kind must be one of {', '.join(KIND)} (or search)")
        return 2
    try:
        r = fetch(vdir, kind, query, res)
    except Exception as e:
        print(f"{kind} '{query}' failed: {str(e)[:120]}")
        return 1
    print(json.dumps(r, indent=1))
    return 0 if "error" not in r else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
