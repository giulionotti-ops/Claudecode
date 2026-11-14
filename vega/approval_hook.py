#!/usr/bin/env python3
"""Claude Code PermissionRequest hook: send the permission prompt to Neesmo and wait for a decision.

Install once in ~/.claude/settings.json on the server (see README). If Neesmo is down, or nobody
answers within NEESMO_APPROVAL_WAIT_S seconds, it prints nothing and the normal prompt in the
Claude app takes over. Standard library only.
"""
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

URL = os.environ.get("NEESMO_URL", "http://127.0.0.1:8080")
WAIT_S = int(os.environ.get("NEESMO_APPROVAL_WAIT_S", 172800))  # 2 days: answerable the next day
TOKEN_FILE = Path(os.environ.get("NEESMO_DIR", Path.home() / ".config" / "neesmo")) / "hook_token"


def call(method: str, path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(URL + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json", "X-Neesmo-Hook": TOKEN_FILE.read_text().strip()})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read() or b"{}")


def main() -> None:
    event = json.load(sys.stdin)
    try:
        nid = call("POST", "/api/approvals", event)["id"]
    except Exception:
        return  # Neesmo not running: leave the prompt to the Claude app
    deadline = time.time() + WAIT_S
    while time.time() < deadline:
        time.sleep(2 if time.time() - deadline + WAIT_S < 600 else 15)  # poll slower after 10 min
        try:
            status = call("GET", f"/api/approvals/{nid}")["status"]
        except Exception:
            continue
        if status in ("approved", "denied"):
            decision = {"behavior": "allow"} if status == "approved" else \
                {"behavior": "deny", "message": "The user denied this in Neesmo."}
            print(json.dumps({"hookSpecificOutput": {"hookEventName": "PermissionRequest", "decision": decision}}))
            return
        if status != "pending":
            return
    try:
        call("POST", f"/api/approvals/{nid}/expire", {})
    except Exception:
        pass


if __name__ == "__main__":
    main()
