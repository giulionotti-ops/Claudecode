#!/usr/bin/env python3
"""Generate a full comic PAGE (several panels, one image call) with Gemini.

    python3 gen_page.py prompt.txt out.jpg --ref layout.png --ref style.jpg [--aspect 2:3] [--size 2K]

Refs are sent in order before the prompt. The cloud proxy injects the key (x-goog-api-key).
"""
import argparse, base64, json, os, sys, urllib.request

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prompt_file"); ap.add_argument("out")
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--aspect", default="2:3"); ap.add_argument("--size", default="2K")
    ap.add_argument("--model", default="gemini-3-pro-image-preview")
    a = ap.parse_args()
    parts = []
    for r in a.ref:
        mime = "image/png" if r.lower().endswith(".png") else "image/jpeg"
        parts.append({"inline_data": {"mime_type": mime, "data": base64.b64encode(open(r, "rb").read()).decode()}})
    parts.append({"text": open(a.prompt_file).read()})
    body = {"contents": [{"parts": parts}],
            "generationConfig": {"responseModalities": ["IMAGE"],
                                 "imageConfig": {"aspectRatio": a.aspect, "imageSize": a.size}}}
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{a.model}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": os.environ.get("GEMINI_API_KEY", "proxy-injected")})
    try:
        res = json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e:
        sys.exit(f"Gemini error {e.code}: {e.read().decode()[:400]}")
    for c in res.get("candidates", []):
        for p in c.get("content", {}).get("parts", []):
            d = p.get("inline_data") or p.get("inlineData")
            if d:
                open(a.out, "wb").write(base64.b64decode(d["data"])); print(a.out, d.get("mimeType") or d.get("mime_type")); return
    sys.exit("No image in response: " + json.dumps(res)[:400])

if __name__ == "__main__":
    main()
