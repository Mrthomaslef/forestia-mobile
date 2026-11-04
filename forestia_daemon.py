#!/usr/bin/env python3
"""
Daemon d'orchestration pour Forestia Cloud & Mobile :
1. S'assure que `forestia_bridge` (port 8790) tourne en permanence.
2. Ouvre un tunnel Cloudflare HTTPS (`cloudflared tunnel --url http://127.0.0.1:8790`).
3. Écrit `endpoint.json` et le synchronise automatiquement sur GitHub Pages
   pour que l'URL permanente https://mrthomaslef.github.io/forestia-mobile/
   se connecte toute seule depuis n'importe où (4G/5G/Wi-Fi).
"""
import glob
import json
import os
import re
import subprocess
import threading
import time
from datetime import datetime, timezone

ROOT_DIR = "/Users/thomaslefevre/.t3/projects/forestia-mobile"
BRIDGE_BIN = os.path.join(ROOT_DIR, "forestia_bridge")
ENDPOINT_JSON = os.path.join(ROOT_DIR, "endpoint.json")
PORT = 8790
LAN_URL = f"http://192.168.1.111:{PORT}"


def ensure_bridge_running() -> None:
    while True:
        res = subprocess.run(["/usr/bin/pgrep", "-f", BRIDGE_BIN], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if res.returncode != 0:
            subprocess.Popen(
                [BRIDGE_BIN],
                cwd=ROOT_DIR,
                stdout=open("/tmp/forestia_bridge.log", "a"),
                stderr=subprocess.STDOUT,
            )
        time.sleep(4)


def save_and_push_endpoint(tunnel_url: str) -> None:
    payload = {
        "tunnelUrl": tunnel_url,
        "lanUrl": LAN_URL,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    with open(ENDPOINT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    try:
        subprocess.run(["git", "add", "endpoint.json"], cwd=ROOT_DIR, check=True)
        diff = subprocess.run(["git", "diff", "--cached", "--quiet", "--", "endpoint.json"], cwd=ROOT_DIR)
        if diff.returncode != 0:
            subprocess.run(
                ["git", "commit", "-m", "chore(tunnel): update live Forestia cloudflare tunnel endpoint"],
                cwd=ROOT_DIR,
                check=True,
            )
            subprocess.run(["git", "pull", "--rebase", "--autostash", "origin", "main"], cwd=ROOT_DIR)
            subprocess.run(["git", "push", "origin", "main"], cwd=ROOT_DIR, check=True)
    except Exception as e:
        print("Git sync error:", e)


def run_tunnel_forever() -> None:
    cf_candidates = glob.glob(os.path.expanduser("~/.t3/tools/cloudflared/*/*/cloudflared"))
    if not cf_candidates:
        print("cloudflared not found")
        return
    cf_bin = cf_candidates[0]

    while True:
        try:
            proc = subprocess.Popen(
                [cf_bin, "tunnel", "--url", f"http://127.0.0.1:{PORT}", "--no-autoupdate"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            for line in proc.stdout:
                m = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
                if m:
                    url = m.group(0)
                    print("Active Forestia Tunnel URL:", url, flush=True)
                    save_and_push_endpoint(url)
            proc.wait()
        except Exception as e:
            print("Tunnel error:", e)
        time.sleep(5)


if __name__ == "__main__":
    threading.Thread(target=ensure_bridge_running, daemon=True).start()
    run_tunnel_forever()
