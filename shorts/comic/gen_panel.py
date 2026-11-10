#!/usr/bin/env python3
"""Generate one comic panel (art only, no lettering) with a Gemini image model.

    python3 gen_panel.py "two Imperial Guardsmen in a trench, one eager rookie, one tired sergeant" out.png [--ref sample-panel.jpg]

The cloud proxy injects the API key (header x-goog-api-key), so no key is needed here.
Set GEMINI_API_KEY to run elsewhere.
"""
import argparse, base64, json, os, sys, urllib.request

STYLE = (
    "Flat cartoon webcomic panel. Thick uniform black outlines, flat colours with a single "
    "shadow tone, no gradients, no photorealism. Warm orange-yellow sky, dusty brown desert "
    "ground. Chunky, expressive, funny characters with big heads. Grimdark sci-fi soldiers "
    "drawn cute. Vertical 4:5 composition, leave empty sky at the top for speech bubbles. "
    "NO text, NO letters, NO speech bubbles, NO logos, NO signature."
)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene")
    ap.add_argument("out")
    ap.add_argument("--ref", help="style reference image (keeps characters consistent)")
    ap.add_argument("--model", default="gemini-3.1-flash-image-preview")
    a = ap.parse_args()

    parts = []
    if a.ref:
        mime = "image/png" if a.ref.endswith(".png") else "image/jpeg"
        parts.append({"inline_data": {"mime_type": mime,
                      "data": base64.b64encode(open(a.ref, "rb").read()).decode()}})
        parts.append({"text": "Match the drawing style and characters of this reference."})
    parts.append({"text": f"{STYLE}\nScene: {a.scene}"})
    body = {"contents": [{"parts": parts}],
            "generationConfig": {"responseModalities": ["IMAGE"],
                                 "imageConfig": {"aspectRatio": "4:5"}}}
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{a.model}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 "x-goog-api-key": os.environ.get("GEMINI_API_KEY", "proxy-injected")})
    try:
        res = json.load(urllib.request.urlopen(req, timeout=180))
    except urllib.error.HTTPError as e:
        sys.exit(f"Gemini error {e.code}: {e.read().decode()[:400]}")
    for c in res.get("candidates", []):
        for p in c.get("content", {}).get("parts", []):
            d = p.get("inline_data") or p.get("inlineData")
            if d:
                open(a.out, "wb").write(base64.b64decode(d["data"]))
                print(a.out)
                return
    sys.exit("No image in response: " + json.dumps(res)[:400])

if __name__ == "__main__":
    main()
