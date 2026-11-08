#!/usr/bin/env python3
"""
Extract all files from extracted/FORESTIA.BIN (MODE2/2352 ISO9660),
plus embedded STARTERPC.DIR from FORESTIA.EXE and data.cst from Win98 image.
"""
import os
import struct
import subprocess

BIN_PATH = "extracted/FORESTIA.BIN"
IMG_PATH = "extracted/system/fr_windows_98_se.img"
OUT_DIR = "recomp/cd_raw"


def extract_iso():
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(BIN_PATH, "rb") as f:
        def read_sector(lba: int) -> bytes:
            f.seek(lba * 2352 + 24)
            return f.read(2048)

        def read_bytes(lba: int, length: int) -> bytes:
            num_sectors = (length + 2047) // 2048
            chunks = []
            for i in range(num_sectors):
                chunks.append(read_sector(lba + i))
            return b"".join(chunks)[:length]

        pvd = read_sector(16)
        root_rec = pvd[156:156 + 34]
        root_lba = struct.unpack("<I", root_rec[2:6])[0]
        root_len = struct.unpack("<I", root_rec[10:14])[0]

        files = {}

        def walk(lba: int, length: int, prefix: str = ""):
            data = read_bytes(lba, length)
            pos = 0
            while pos < len(data):
                rec_len = data[pos]
                if rec_len == 0:
                    pos = ((pos // 2048) + 1) * 2048
                    continue
                rec = data[pos:pos + rec_len]
                ext_lba = struct.unpack("<I", rec[2:6])[0]
                ext_len = struct.unpack("<I", rec[10:14])[0]
                flags = rec[25]
                name_len = rec[32]
                name = rec[33:33 + name_len].decode("latin1", errors="ignore").split(";")[0]
                if name not in ("\x00", "\x01"):
                    full = f"{prefix}/{name}" if prefix else name
                    if flags & 2:
                        walk(ext_lba, ext_len, full)
                    else:
                        # Keep the data fork (larger than the 509-byte Mac resource header on hybrid CD)
                        prev = files.get(full)
                        if prev is None or ext_len > prev[1]:
                            files[full] = (ext_lba, ext_len)
                pos += rec_len

        walk(root_lba, root_len)

        total_bytes = 0
        for rel_path, (lba, length) in sorted(files.items()):
            dest = os.path.join(OUT_DIR, rel_path)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            content = read_bytes(lba, length)
            with open(dest, "wb") as out:
                out.write(content)
            total_bytes += length

        print(f"Extracted {len(files)} files ({total_bytes / (1024*1024):.1f} MB) to {OUT_DIR}")

    # Extract embedded STARTERPC.DIR from FPC/FORESTIA.EXE
    exe_path = os.path.join(OUT_DIR, "FPC/FORESTIA.EXE")
    if os.path.exists(exe_path):
        with open(exe_path, "rb") as ef:
            exe_bytes = ef.read()
        idx = exe_bytes.find(b"XFIR\xcaQ\x00\x0039VM")
        if idx != -1:
            size = struct.unpack("<I", exe_bytes[idx + 4:idx + 8])[0] + 8
            starter_pc = exe_bytes[idx:idx + size]
            starter_out = os.path.join(OUT_DIR, "STARTERPC.DIR")
            with open(starter_out, "wb") as sf:
                sf.write(starter_pc)
            print(f"Extracted embedded STARTERPC.DIR ({len(starter_pc)} bytes) from FORESTIA.EXE")

    # Extract data.cst from Win98 image
    if os.path.exists(IMG_PATH):
        subprocess.run(
            ["7z", "e", "-y", f"-o{os.path.join(OUT_DIR, 'FPC/F_DATA')}", IMG_PATH, "Program Files/Lasermedia/Forestia/F_DATA/data.cst"],
            check=False,
            stdout=subprocess.DEVNULL,
        )
        cst_path = os.path.join(OUT_DIR, "FPC/F_DATA/data.cst")
        if os.path.exists(cst_path):
            print(f"Extracted data.cst ({os.path.getsize(cst_path)} bytes) from Win98 image")


if __name__ == "__main__":
    extract_iso()
