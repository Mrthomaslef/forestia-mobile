#!/usr/bin/env python3
"""
Serveur HTTP local haute performance (port 8791) hébergeant sur le Mac :
- Le vrai moteur ScummVM WebAssembly (`director` / Macromedia Director 6.0)
- Les 620 Mo de fichiers originaux du CD-ROM Forestia (1998) servis à la demande (HTTP Range + index.json dynamique)
- La persistance bidirectionnelle des sauvegardes (`saves/` sur le SSD du Mac + `AAAFORES.TXT`)
"""
from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from setup_scummvm_runtime import ensure_runtime_ready

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
RUNTIME_DIR = os.path.join(ROOT_DIR, "scummvm_runtime")
SAVES_DIR = os.path.join(ROOT_DIR, "saves")
CD_AAAFORES = os.path.join(ROOT_DIR, "recomp", "cd_raw", "AAAFORES.TXT")
PLAY_HTML = os.path.join(ROOT_DIR, "play.html")
PORT = int(os.environ.get("FORESTIA_PORT", "8791"))

MIME_OVERRIDES = {
    ".wasm": "application/wasm",
    ".so": "application/wasm",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".html": "text/html; charset=utf-8",
    ".ini": "text/plain; charset=utf-8",
    ".dat": "application/octet-stream",
    ".zip": "application/zip",
    ".dxr": "application/octet-stream",
    ".cxt": "application/octet-stream",
    ".cst": "application/octet-stream",
    ".dir": "application/octet-stream",
    ".aif": "audio/x-aiff",
    ".exe": "application/octet-stream",
}


def resolve_case_insensitive(base_dir: str, rel_path: str) -> str | None:
    """Resolve rel_path inside base_dir safely (allowing symlinks into recomp/cd_raw)."""
    norm_rel = os.path.normpath("/" + rel_path).lstrip("/")
    candidate = os.path.join(base_dir, norm_rel)
    if os.path.exists(candidate):
        return candidate

    cur = base_dir
    if not norm_rel:
        return cur
    for part in norm_rel.split("/"):
        if not os.path.isdir(cur):
            return None
        direct = os.path.join(cur, part)
        if os.path.exists(direct):
            cur = direct
            continue
        lower = part.lower()
        matched = None
        try:
            for entry in os.listdir(cur):
                if entry.lower() == lower:
                    matched = os.path.join(cur, entry)
                    break
        except OSError:
            return None
        if not matched:
            return None
        cur = matched
    return cur if os.path.exists(cur) else None


class ForestiaHTTPRequestHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:
        # Keep logs concise
        sys.stdout.write(f"[forestia-server] {self.address_string()} - {fmt % args}\n")
        sys.stdout.flush()

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range, Content-Type, Accept, Origin")
        self.send_header("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _send_json(self, status: int, payload: dict, head_only: bool = False) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head_only:
            self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._send_cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_HEAD(self) -> None:
        self._handle_get_or_head(head_only=True)

    def do_GET(self) -> None:
        self._handle_get_or_head(head_only=False)

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/api/saves":
            self._send_json(404, {"error": "Not found"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 32 * 1024 * 1024:
            self._send_json(400, {"error": "Invalid payload size"})
            return

        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except Exception:
            self._send_json(400, {"error": "Invalid JSON"})
            return

        files = data.get("files") or {}
        os.makedirs(SAVES_DIR, exist_ok=True)
        written = []
        for name, b64_str in files.items():
            clean = os.path.basename(str(name)).strip()
            if not clean or clean in (".", "..", "forestia-aaafores.txt") or "/" in clean or "\\" in clean:
                continue
            try:
                content = base64.b64decode(b64_str)
            except Exception:
                continue
            if len(content) > 16 * 1024 * 1024:
                continue
            dest = os.path.join(SAVES_DIR, clean)
            tmp = dest + ".tmp"
            with open(tmp, "wb") as f:
                f.write(content)
            os.replace(tmp, dest)
            written.append(clean)

        self._send_json(200, {"ok": True, "written": written})

    def _handle_get_or_head(self, head_only: bool) -> None:
        parsed = urllib.parse.urlparse(self.path)
        req_path = urllib.parse.unquote(parsed.path)

        # 1. Healthcheck endpoint
        if req_path == "/api/health":
            os.makedirs(SAVES_DIR, exist_ok=True)
            saves = sorted(
                f for f in os.listdir(SAVES_DIR)
                if os.path.isfile(os.path.join(SAVES_DIR, f)) and not f.startswith(".")
            )
            self._send_json(
                200,
                {
                    "ok": True,
                    "engine": "scummvm-director-wasm",
                    "game": "director:forestia",
                    "port": PORT,
                    "cdReady": os.path.exists(CD_AAAFORES),
                    "saves": saves,
                },
                head_only=head_only,
            )
            return

        # 2. Save sync endpoint (AAAFORES.TXT + Mac SSD saves)
        if req_path == "/api/saves":
            os.makedirs(SAVES_DIR, exist_ok=True)
            out_files = {}
            if os.path.isfile(CD_AAAFORES):
                with open(CD_AAAFORES, "rb") as f:
                    raw_cd = f.read()
                out_files["forestia-aaafores.txt"] = {
                    "b64": base64.b64encode(raw_cd).decode("ascii"),
                    "size": len(raw_cd),
                    "mtimeMs": int(os.path.getmtime(CD_AAAFORES) * 1000),
                }
            for fname in sorted(os.listdir(SAVES_DIR)):
                if fname.startswith(".") or fname.endswith(".tmp"):
                    continue
                fpath = os.path.join(SAVES_DIR, fname)
                if os.path.isfile(fpath):
                    with open(fpath, "rb") as f:
                        b = f.read()
                    out_files[fname] = {
                        "b64": base64.b64encode(b).decode("ascii"),
                        "size": len(b),
                        "mtimeMs": int(os.path.getmtime(fpath) * 1000),
                    }
            self._send_json(200, {"ok": True, "files": out_files}, head_only=head_only)
            return

        # 3. Main player HTML
        if req_path in ("/", "/play", "/play.html", "/index.html"):
            self._serve_file(PLAY_HTML, head_only=head_only, cache_control="no-cache")
            return

        # 4. Project icons & PWA manifest
        if req_path == "/manifest.json":
            self._serve_file(os.path.join(ROOT_DIR, "manifest.json"), head_only=head_only, cache_control="no-cache")
            return
        if req_path.startswith("/assets/"):
            rel_asset = req_path.lstrip("/")
            asset_path = resolve_case_insensitive(ROOT_DIR, rel_asset)
            if asset_path and os.path.isfile(asset_path):
                self._serve_file(asset_path, head_only=head_only, cache_control="public, max-age=3600")
                return

        # 5. Dynamic ScummVM HTTPFilesystemNode index.json listings for /data and subdirectories
        if req_path == "/data/index.json" or (req_path.startswith("/data/") and req_path.endswith("/index.json")):
            dir_rel = req_path[1:-len("/index.json")].rstrip("/")  # e.g. 'data' or 'data/games/forestia/DATA'
            target_dir = resolve_case_insensitive(RUNTIME_DIR, dir_rel)
            if target_dir and os.path.isdir(target_dir):
                listing = {}
                try:
                    for entry in sorted(os.listdir(target_dir)):
                        if entry.startswith(".") or entry == "index.json":
                            continue
                        full_entry = os.path.join(target_dir, entry)
                        try:
                            if os.path.isdir(full_entry):
                                listing[entry] = {}
                            elif os.path.isfile(full_entry):
                                listing[entry] = os.stat(full_entry).st_size
                        except OSError:
                            continue
                except OSError:
                    pass
                self._send_json(200, listing, head_only=head_only)
                return

        # 6. Runtime files (scummvm.js, scummvm.wasm, data/plugins/libdirector.so, data/games/forestia/...)
        rel = req_path.lstrip("/")
        target = resolve_case_insensitive(RUNTIME_DIR, rel)
        if target and os.path.isfile(target):
            cache = "no-cache" if rel == "scummvm.js" else "public, max-age=86400"
            self._serve_file(target, head_only=head_only, cache_control=cache)
            return

        self._send_json(404, {"error": f"Not found: {req_path}"}, head_only=head_only)

    def _serve_file(self, filepath: str, head_only: bool = False, cache_control: str = "public, max-age=3600") -> None:
        try:
            st = os.stat(filepath)
        except OSError:
            self._send_json(404, {"error": "File not found"}, head_only=head_only)
            return

        total_size = st.st_size
        ext = os.path.splitext(filepath)[1].lower()
        ctype = MIME_OVERRIDES.get(ext) or mimetypes.guess_type(filepath)[0] or "application/octet-stream"

        range_header = self.headers.get("Range")
        start = 0
        end = total_size - 1
        is_partial = False

        if range_header and total_size > 0:
            m = re.match(r"bytes=(\d*)-(\d*)", range_header.strip())
            if m:
                g1, g2 = m.group(1), m.group(2)
                if g1 == "" and g2 != "":
                    suffix = int(g2)
                    start = max(0, total_size - suffix)
                    end = total_size - 1
                elif g1 != "":
                    start = int(g1)
                    end = int(g2) if g2 != "" else total_size - 1
                if start >= total_size or start > end:
                    self.send_response(416)
                    self._send_cors_headers()
                    self.send_header("Content-Range", f"bytes */{total_size}")
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return
                end = min(end, total_size - 1)
                is_partial = True

        length = (end - start + 1) if total_size > 0 else 0
        self.send_response(206 if is_partial else 200)
        self._send_cors_headers()
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", cache_control)
        if is_partial:
            self.send_header("Content-Range", f"bytes {start}-{end}/{total_size}")
        self.send_header("Content-Length", str(length))
        self.end_headers()

        if head_only or length == 0:
            return

        try:
            with open(filepath, "rb") as f:
                if start > 0:
                    f.seek(start)
                remaining = length
                chunk_size = 256 * 1024
                while remaining > 0:
                    buf = f.read(min(chunk_size, remaining))
                    if not buf:
                        break
                    self.wfile.write(buf)
                    remaining -= len(buf)
        except (BrokenPipeError, ConnectionResetError):
            pass


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    ensure_runtime_ready()
    server = ReusableThreadingHTTPServer(("0.0.0.0", PORT), ForestiaHTTPRequestHandler)
    print(f"[forestia-server] Serving real ScummVM Director engine on http://0.0.0.0:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
