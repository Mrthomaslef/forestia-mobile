#!/usr/bin/env python3
"""
Daemon d'orchestration permanent sur le Mac pour Forestia (ScummVM Director WebAssembly) :
1. Maintient `forestia_server.py` actif en permanence sur le port 8791 (le port 8790 étant utilisé par film-et-serie).
2. Ouvre et supervise le tunnel HTTPS Cloudflare (`cloudflared tunnel --url http://127.0.0.1:8791`).
3. Met à jour `endpoint.json` + `endpoint.js` et les pousse automatiquement sur GitHub Pages
   pour que https://mrthomaslef.github.io/forestia-mobile/ rejoigne toujours le Mac en Wi-Fi ou 4G/5G.
"""
import glob
import json
import os
import re
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.request
from datetime import datetime, timezone

ROOT_DIR = "/Users/thomaslefevre/.t3/projects/forestia-mobile"
SERVER_SCRIPT = os.path.join(ROOT_DIR, "forestia_server.py")
ENDPOINT_JSON = os.path.join(ROOT_DIR, "endpoint.json")
ENDPOINT_JS = os.path.join(ROOT_DIR, "endpoint.js")
PORT = 8791

server_proc: subprocess.Popen | None = None
tunnel_proc: subprocess.Popen | None = None
stop_event = threading.Event()


def detect_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(1.0)
        s.connect(("1.1.1.1", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass
    return "192.168.1.111"


def check_server_healthy() -> bool:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/health", timeout=2.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("engine") == "scummvm-director-wasm"
    except Exception:
        pass
    return False


def supervise_server() -> None:
    global server_proc
    env = os.environ.copy()
    env["FORESTIA_PORT"] = str(PORT)
    while not stop_event.is_set():
        if not check_server_healthy():
            if server_proc is not None and server_proc.poll() is None:
                try:
                    server_proc.terminate()
                    server_proc.wait(timeout=3)
                except Exception:
                    try:
                        server_proc.kill()
                    except Exception:
                        pass
            log_f = open("/tmp/forestia_server.log", "a", encoding="utf-8")
            print(f"[daemon] Starting forestia_server.py on port {PORT}...", flush=True)
            server_proc = subprocess.Popen(
                [sys.executable, SERVER_SCRIPT],
                cwd=ROOT_DIR,
                env=env,
                stdout=log_f,
                stderr=subprocess.STDOUT,
            )
            for _ in range(20):
                if check_server_healthy():
                    print(f"[daemon] forestia_server.py healthy on port {PORT}.", flush=True)
                    break
                time.sleep(0.5)
        time.sleep(4)


def save_and_push_endpoint(tunnel_url: str) -> None:
    lan_url = f"http://{detect_lan_ip()}:{PORT}"
    try:
        if os.path.exists(ENDPOINT_JSON):
            with open(ENDPOINT_JSON, "r", encoding="utf-8") as f:
                existing = json.load(f)
            if (
                existing.get("tunnelUrl") == tunnel_url
                and existing.get("lanUrl") == lan_url
                and existing.get("engine") == "scummvm-director-wasm"
            ):
                return
    except Exception:
        pass

    payload = {
        "tunnelUrl": tunnel_url,
        "lanUrl": lan_url,
        "engine": "scummvm-director-wasm",
        "port": PORT,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    with open(ENDPOINT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")

    with open(ENDPOINT_JS, "w", encoding="utf-8") as f:
        f.write(f"window.FORESTIA_ENDPOINT = {json.dumps(payload)};\n")

    try:
        subprocess.run(["git", "add", "--", "endpoint.json", "endpoint.js"], cwd=ROOT_DIR, check=True)
        diff = subprocess.run(
            ["git", "diff", "--cached", "--quiet", "--", "endpoint.json", "endpoint.js"],
            cwd=ROOT_DIR,
        )
        if diff.returncode != 0:
            subprocess.run(
                [
                    "git",
                    "commit",
                    "--only",
                    "endpoint.json",
                    "endpoint.js",
                    "-m",
                    "chore(tunnel): update live Forestia ScummVM Mac endpoint",
                ],
                cwd=ROOT_DIR,
                check=True,
            )
            subprocess.run(["git", "push", "origin", "main"], cwd=ROOT_DIR, check=True)
            print(f"[daemon] Synced {tunnel_url} & {lan_url} to GitHub Pages.", flush=True)
    except Exception as e:
        print("[daemon] Git sync warning:", e, flush=True)


def find_cloudflared() -> str | None:
    candidates = sorted(
        glob.glob(os.path.expanduser("~/.t3/tools/cloudflared/*/*/cloudflared")),
        reverse=True,
    )
    for c in candidates:
        if os.path.isfile(c) and os.access(c, os.X_OK):
            return c
    for p in ("/opt/homebrew/bin/cloudflared", "/usr/local/bin/cloudflared"):
        if os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    return None


def run_tunnel_forever() -> None:
    global tunnel_proc
    cf_bin = find_cloudflared()
    if not cf_bin:
        print("[daemon] ERROR: cloudflared binary not found!", flush=True)
        while not stop_event.is_set():
            time.sleep(10)
        return

    while not stop_event.is_set():
        try:
            tunnel_proc = subprocess.Popen(
                [cf_bin, "tunnel", "--url", f"http://127.0.0.1:{PORT}", "--no-autoupdate"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            assert tunnel_proc.stdout is not None
            for line in tunnel_proc.stdout:
                if stop_event.is_set():
                    break
                m = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
                if m:
                    url = m.group(0)
                    print("[daemon] Active Forestia Tunnel URL:", url, flush=True)
                    save_and_push_endpoint(url)
            tunnel_proc.wait()
        except Exception as e:
            print("[daemon] Tunnel error:", e, flush=True)
        if not stop_event.is_set():
            time.sleep(5)


def handle_shutdown(signum, _frame) -> None:
    print(f"[daemon] Received signal {signum}, shutting down...", flush=True)
    stop_event.set()
    for p in (tunnel_proc, server_proc):
        if p is not None and p.poll() is None:
            try:
                p.terminate()
            except Exception:
                pass
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)
    threading.Thread(target=supervise_server, daemon=True).start()
    run_tunnel_forever()
