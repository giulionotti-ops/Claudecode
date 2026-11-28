"""Art references for the director: how real artists drew the things the script names (no AI, no credits).

Searches free open-access collections (Wikimedia Commons and the Cleveland Museum of Art),
downloads small copies and tiles them into one contact sheet per subject, so the director can look at
real drawings, paintings, engravings and photos before planning the details of each shot.

  python3 -m studio.artrefs videos/<NNN> "griffin" "griffin engraving" "car engine cutaway"
  python3 -m studio.artrefs videos/<NNN> --n 12 "lighthouse at night"

Writes videos/<NNN>/refs/<subject>/: 01.jpg ... , sheet.jpg (numbered tiles) and refs.json (title, artist,
date, licence, source page per number). Plain HTTP to public APIs; costs nothing per run.
"""
import hashlib
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

UA = {"User-Agent": "neesmo-artrefs/1.0 (open-access art reference fetcher)"}
TIMEOUT = 20
THUMB = 480


def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read()


def _json(url: str) -> dict:
    return json.loads(_get(url).decode("utf-8", "replace"))


def _strip(html: str) -> str:
    return re.sub(r"<[^>]+>", "", html or "").strip()[:160]


# keep only files that Commons files under art (free text search alone returns people named Griffin)
ART = re.compile(r"art\b|artwork|drawing|painting|engraving|etching|woodcut|illustrat|print|sculpt|statue|relief|"
                 r"heraldr|coat of arms|manuscript|mosaic|fresco|museum|mytholog|fantasy|concept|diagram|cutaway|"
                 r"bestiar|medieval|ancient|carving|tapestry|fine art", re.I)
NOT_ART = re.compile(r"\bpeople\b|actress|actors|convention|portrait photographs|selfies", re.I)


def _commons(q: str, n: int, art: bool) -> list[dict]:
    # "<subject> art" finds how artists drew it (paintings, engravings, illustrations), not snapshots
    if art:
        q = q if re.search(r"\bart$", q.strip(), re.I) else f"{q.strip()} art"
    p = {"action": "query", "format": "json", "generator": "search", "gsrsearch": f"{q} filetype:bitmap",
         "gsrnamespace": 6, "gsrlimit": min(50, n * 5), "prop": "imageinfo|categories", "clshow": "!hidden",
         "cllimit": "max", "iiprop": "url|extmetadata", "iiurlwidth": THUMB}
    pages = _json("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(p)).get("query", {}).get("pages", {})
    out = []
    for pg in sorted(pages.values(), key=lambda x: x.get("index", 0)):
        ii = (pg.get("imageinfo") or [{}])[0]
        m = ii.get("extmetadata", {})
        cats = " ".join(c.get("title", "") for c in pg.get("categories", []))
        if ii.get("thumburl") and (not art or (ART.search(cats + " " + pg.get("title", ""))
                                         and not NOT_ART.search(cats))):
            out.append({"src": "Wikimedia Commons", "title": pg.get("title", "").removeprefix("File:"),
                        "artist": _strip(m.get("Artist", {}).get("value", "")),
                        "date": _strip(m.get("DateTimeOriginal", {}).get("value", "")),
                        "license": _strip(m.get("LicenseShortName", {}).get("value", "")),
                        "page": ii.get("descriptionurl", ""), "img": ii["thumburl"]})
        if len(out) >= n:
            break
    return out


def commons(q: str, n: int) -> list[dict]:
    """Art first ("<subject> art", art categories only); a technical subject with little art falls back to a
    plain search (photos, diagrams, cutaways)."""
    out = _commons(q, n, art=True)
    if len(out) < 3:
        seen = {x["page"] for x in out}
        out += [x for x in _commons(q, n, art=False) if x["page"] not in seen][:n - len(out)]
    return out


def artic(q: str, n: int) -> list[dict]:
    p = {"q": q, "limit": n, "fields": "id,title,artist_display,date_display,image_id,is_public_domain"}
    data = _json("https://api.artic.edu/api/v1/artworks/search?" + urllib.parse.urlencode(p)).get("data", [])
    return [{"src": "Art Institute of Chicago", "title": d.get("title", ""), "artist": (d.get("artist_display") or "")[:160],
             "date": d.get("date_display", ""), "license": "public domain" if d.get("is_public_domain") else "reference only",
             "page": f"https://www.artic.edu/artworks/{d['id']}",
             "img": f"https://www.artic.edu/iiif/2/{d['image_id']}/full/{THUMB},/0/default.jpg"}
            for d in data if d.get("image_id")]


def cleveland(q: str, n: int) -> list[dict]:
    p = {"q": q, "has_image": 1, "limit": n}
    data = _json("https://openaccess-api.clevelandart.org/api/artworks/?" + urllib.parse.urlencode(p)).get("data", [])
    out = []
    for d in data:
        img = ((d.get("images") or {}).get("web") or {}).get("url")
        if img:
            cr = (d.get("creators") or [{}])[0]
            out.append({"src": "Cleveland Museum of Art", "title": d.get("title", ""), "artist": cr.get("description", ""),
                        "date": d.get("creation_date", ""), "license": d.get("share_license_status", ""),
                        "page": d.get("url", ""), "img": img})
    return out


SOURCES = (commons, cleveland)   # artic(): its image server refuses scripts (403), kept for reference only


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:48] or "subject-" + hashlib.md5(s.encode()).hexdigest()[:8]


def _sheet(files: list[Path], out: Path) -> None:
    from PIL import Image, ImageDraw
    cols, tile = 4, 300
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tile, rows * tile), "black")
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGB")
        im.thumbnail((tile - 6, tile - 6))
        x, y = (i % cols) * tile, (i // cols) * tile
        sheet.paste(im, (x + (tile - im.width) // 2, y + (tile - im.height) // 2))
        d.rectangle([x + 4, y + 4, x + 34, y + 26], fill="black")
        d.text((x + 9, y + 8), f"{i + 1:02d}", fill="yellow")
    sheet.save(out, quality=85)


def fetch(vdir: Path, subject: str, n: int = 12) -> dict:
    """Up to n references for one subject, spread over the sources. Never raises for a dead source."""
    d = vdir / "refs" / _slug(subject)
    d.mkdir(parents=True, exist_ok=True)
    for old in [*d.glob("[0-9][0-9].jpg"), d / "sheet.jpg"]:   # a re-run replaces the old set
        old.unlink(missing_ok=True)
    per = max(2, n // len(SOURCES) + 1)
    found, errors = [], []
    for src in SOURCES:
        try:
            found.append(src(subject, per))
        except Exception as e:   # one dead source never stops the others
            errors.append(f"{src.__name__}: {str(e)[:80]}")
    # interleave so the sheet mixes museums and styles
    picks = [x for grp in zip(*[g + [None] * (per - len(g)) for g in found]) for x in grp if x][:n] if found else []
    kept, files = [], []
    try:
        from PIL import Image
    except ImportError:
        errors.append("Pillow is not installed (pip install pillow)")
        picks = []
    for item in picks:
        f = d / f"{len(kept) + 1:02d}.jpg"
        try:
            Image.open(io.BytesIO(_get(item["img"]))).convert("RGB").save(f, quality=85)
        except Exception as e:
            errors.append(f"{item['src']}: {str(e)[:60]}")
            continue
        kept.append({"n": len(kept) + 1, **{k: v for k, v in item.items() if k != "img"}})
        files.append(f)
    if files:
        try:
            _sheet(files, d / "sheet.jpg")
        except Exception as e:
            errors.append(f"sheet: {str(e)[:80]}")
    res = {"subject": subject, "count": len(kept), "sheet": str((d / "sheet.jpg").relative_to(vdir)) if (d / "sheet.jpg").exists() else None,
           "refs": kept, "errors": errors}
    (d / "refs.json").write_text(json.dumps(res, indent=1, ensure_ascii=False))
    return res


def main(argv: list[str]) -> int:
    n = 12
    if "--n" in argv:
        i = argv.index("--n")
        try:
            n = max(1, int(argv[i + 1]))
        except (IndexError, ValueError):
            print("--n needs a whole number, e.g. --n 12")
            return 2
        del argv[i:i + 2]
    if len(argv) < 2:
        print(__doc__)
        return 2
    vdir = Path(argv[0])
    if not vdir.is_dir():
        print(f"no such video folder: {vdir}")
        return 1
    for subject in argv[1:]:
        r = fetch(vdir, subject, n)
        print(f"{subject}: {r['count']} refs -> {vdir / r['sheet'] if r['sheet'] else 'none found'}"
              + (f" ({len(r['errors'])} source errors)" if r["errors"] else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
