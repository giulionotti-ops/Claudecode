#!/usr/bin/env python3
"""Seller only: sign a release so every buyer's Neesmo can update itself for free.

  python3 scripts/publish_update.py <zip from build_zip.py> [--notes "what's new"] [--out dist/updates]

Writes <out>/latest.json (signed manifest) and copies the zip next to it. Upload both files to the
update host (NEESMO_UPDATE_URL points at latest.json). The private key stays on the seller's machine:
~/.config/neesmo-seller/license_private.pem (never in the repo or the zip).
"""
import argparse
import base64
import datetime
import hashlib
import json
import shutil
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KEY = Path.home() / ".config" / "neesmo-seller" / "license_private.pem"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("zip")
    ap.add_argument("--notes", default="")
    ap.add_argument("--out", default=str(ROOT / "dist" / "updates"))
    a = ap.parse_args()
    from cryptography.hazmat.primitives.serialization import load_pem_private_key
    zp = Path(a.zip)
    names = {n[len("neesmo/"):] for n in zipfile.ZipFile(zp).namelist() if n.startswith("neesmo/")}
    version = (ROOT / "vega" / "VERSION").read_text().strip()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    prev = out / "latest.json"
    removed: list[str] = []
    if prev.exists():   # files the last release had that this one drops
        old = json.loads(prev.read_text())["manifest"]
        removed = sorted(set(old.get("files", [])) - names)
    manifest = {"version": version, "url": zp.name, "sha256": hashlib.sha256(zp.read_bytes()).hexdigest(),
                "notes": a.notes, "date": datetime.date.today().isoformat(), "files": sorted(names), "removed": removed,
                "commit": subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"],
                                         capture_output=True, text=True).stdout.strip()}
    key = load_pem_private_key(KEY.read_bytes(), None)
    sig = key.sign(json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode())
    shutil.copy(zp, out / zp.name)
    prev.write_text(json.dumps({"manifest": manifest, "sig": base64.b64encode(sig).decode()}, indent=1))
    print(f"{prev}  version {version}  ({len(names)} files, {len(removed)} removed)")


if __name__ == "__main__":
    main()
