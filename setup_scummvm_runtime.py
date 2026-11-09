#!/usr/bin/env python3
"""
Configure et vérifie le runtime ScummVM WebAssembly (moteur Macromedia Director 6.0)
hébergé sur le Mac pour Forestia (1998, Daddy Oak / LaserMedia).

- Télécharge les binaires WASM officiels (scummvm.js, scummvm.wasm, libdirector.so, data/*.dat)
  dans `scummvm_runtime/` s'ils sont absents.
- Crée l'arborescence unifiée `scummvm_runtime/data/games/forestia/` pointant vers `recomp/cd_raw/`.
- Injecte dans `scummvm_runtime/scummvm.js` (à partir de `scummvm.js.orig`) :
  1. Le démarrage direct sur la cible `forestia` (zéro menu intermédiaire, zéro pop-up).
  2. La génération automatique de `scummvm.ini` avec `vkeybdpath=/data`, `savepath=<idbfs>/saves`,
     et la cible `[forestia]` (`director:forestia`, français).
  3. La pré-injection automatique de `forestia-aaafores.txt` (`CheckDrive` CD-ROM) et la
     synchronisation bidirectionnelle des sauvegardes (`forestia-data.cst`, etc.) avec le SSD du Mac (`/api/saves`).
"""
import os
import shutil
import urllib.request

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
RUNTIME_DIR = os.path.join(ROOT_DIR, "scummvm_runtime")
CD_RAW_DIR = os.path.join(ROOT_DIR, "recomp", "cd_raw")
SAVES_DIR = os.path.join(ROOT_DIR, "saves")

KUENDIG_BASE = "https://scummvm.kuendig.io"
REQUIRED_FILES = [
    "scummvm.js",
    "scummvm.wasm",
    "logo.svg",
    "gamepad.svg",
    "scummvm-192.png",
    "data/plugins/libdirector.so",
    "data/classicmacfonts.dat",
    "data/macgui.dat",
    "data/fonts.dat",
    "data/fonts-imgui.dat",
    "data/gui-icons.dat",
    "data/shaders.dat",
    "data/encoding.dat",
    "data/translations.dat",
    "data/vkeybd_default.zip",
    "data/vkeybd_small.zip",
    "data/helpdialog.zip",
    "data/scummmodern.zip",
    "data/scummremastered.zip",
    "data/scummclassic.zip",
    "data/achievements.dat",
]


def download_if_missing() -> None:
    os.makedirs(RUNTIME_DIR, exist_ok=True)
    os.makedirs(SAVES_DIR, exist_ok=True)
    orig_js = os.path.join(RUNTIME_DIR, "scummvm.js.orig")

    for rel in REQUIRED_FILES:
        dest = os.path.join(RUNTIME_DIR, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        check_target = orig_js if rel == "scummvm.js" and os.path.exists(orig_js) else dest
        if not os.path.exists(check_target) or os.path.getsize(check_target) == 0:
            url = f"{KUENDIG_BASE}/{rel}"
            print(f"[setup] Downloading {url} -> {dest}")
            urllib.request.urlretrieve(url, dest)

    js_path = os.path.join(RUNTIME_DIR, "scummvm.js")
    if not os.path.exists(orig_js) and os.path.exists(js_path):
        shutil.copy2(js_path, orig_js)


def link_cd_files() -> None:
    game_dir = os.path.join(RUNTIME_DIR, "data", "games", "forestia")
    os.makedirs(game_dir, exist_ok=True)
    os.makedirs(os.path.join(RUNTIME_DIR, "data", "shaders"), exist_ok=True)
    os.makedirs(os.path.join(RUNTIME_DIR, "data", "gui-icons"), exist_ok=True)

    links = {
        "FORESTIA.EXE": os.path.join(CD_RAW_DIR, "FPC", "FORESTIA.EXE"),
        "STARTERPC.DIR": os.path.join(CD_RAW_DIR, "STARTERPC.DIR"),
        "AAAFORES.TXT": os.path.join(CD_RAW_DIR, "AAAFORES.TXT"),
        "DATA": os.path.join(CD_RAW_DIR, "DATA"),
        "F_DATA": os.path.join(CD_RAW_DIR, "FPC", "F_DATA"),
        "Xtras": os.path.join(CD_RAW_DIR, "FPC", "Xtras"),
    }
    for name, target in links.items():
        if not os.path.exists(target):
            raise FileNotFoundError(f"Missing CD-ROM asset: {target}")
        dst = os.path.join(game_dir, name)
        rel_target = os.path.relpath(target, game_dir)
        if os.path.islink(dst) or os.path.exists(dst):
            if os.path.islink(dst) and os.readlink(dst) == rel_target:
                continue
            if os.path.islink(dst) or os.path.isfile(dst):
                os.unlink(dst)
        os.symlink(rel_target, dst)


def patch_scummvm_js() -> None:
    orig_js = os.path.join(RUNTIME_DIR, "scummvm.js.orig")
    out_js = os.path.join(RUNTIME_DIR, "scummvm.js")
    with open(orig_js, "r", encoding="utf-8") as f:
        src = f.read()

    # 1. Default CLI launch argument: boot directly into 'forestia' unless '#--launcher' is requested
    old_args_block = """// Add all parameters passed via the fragment identifier
if (window.location.hash.length > 0) {
    params = decodeURI(window.location.hash.substring(1)).split(" ")
    params.forEach((param) => {
        Module["arguments"].push(param);
    })
}"""

    new_args_block = """// Add all parameters passed via the fragment identifier (default: boot straight into Forestia)
if (window.location.hash.length > 0 && window.location.hash !== "#--launcher") {
    params = decodeURI(window.location.hash.substring(1)).split(" ").filter(Boolean);
    params.forEach((param) => {
        Module["arguments"].push(param);
    });
} else if (window.location.hash !== "#--launcher") {
    Module["arguments"].push("forestia");
}"""

    if old_args_block not in src:
        raise RuntimeError("Could not locate Module['arguments'] block in scummvm.js.orig")
    src = src.replace(old_args_block, new_args_block, 1)

    # 2. Pre-configure scummvm.ini, saves directory, AAAFORES.TXT CD-check, and 2-way Mac save sync
    old_fs_block = """              // Check if the settings file exists and download a default copy if needed.
              if (!exists(settingsPath)) {
                  console.debug('EmscriptenFilesystemFactory_initDefaultConfigFile: Download default scummvm.ini');
                  const response = await fetch('scummvm.ini');
                  if (response.ok) {
                      const text = await response.text();
                      FS.writeFile(settingsPath, text);
                  }
              }"""

    new_fs_block = """              // Forestia Mac-Hosted Runtime: ensure saves folder, scummvm.ini, CD-check AAAFORES.TXT & Mac SSD sync
              const savesDir = path + "/saves";
              if (!exists(savesDir)) {
                  FS.mkdir(savesDir);
              }

              const b64ToBytes = (b64) => {
                  const bin = atob(b64);
                  const out = new Uint8Array(bin.length);
                  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
                  return out;
              };
              const bytesToB64 = (u8) => {
                  let s = "";
                  const chunk = 0x8000;
                  for (let i = 0; i < u8.length; i += chunk) {
                      s += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
                  }
                  return btoa(s);
              };

              const iniContent = [
                  "[scummvm]",
                  "versioninfo=2.10.0git",
                  "always_run_fallback_detection_extern=false",
                  "savepath=" + savesDir,
                  "vkeybdpath=/data",
                  "vkeybd_pack_name=vkeybd_default",
                  "aspect_ratio=true",
                  "stretch_mode=fit",
                  "gfx_mode=opengl",
                  "mute=false",
                  "music_volume=192",
                  "sfx_volume=192",
                  "speech_volume=192",
                  "subtitles=true",
                  "",
                  "[forestia]",
                  "platform=windows",
                  "gameid=forestia",
                  "description=Forestia (1998, CD-ROM Francais)",
                  "language=fr",
                  "path=/data/games/forestia",
                  "engineid=director",
                  "guioptions=noAspect plat_windows gameOption2",
                  ""
              ].join("\\n");
              FS.writeFile(settingsPath, iniContent);

              // Pull AAAFORES.TXT + server-side saves from Mac SSD
              try {
                  const saveResp = await originalFetch("api/saves", { cache: "no-store" });
                  if (saveResp.ok) {
                      const payload = await saveResp.json();
                      const serverFiles = (payload && payload.files) || {};
                      for (const [fname, info] of Object.entries(serverFiles)) {
                          const fpath = savesDir + "/" + fname;
                          const rawBytes = b64ToBytes(info.b64);
                          if (fname === "forestia-aaafores.txt" || !exists(fpath)) {
                              FS.writeFile(fpath, rawBytes);
                          } else if (info.mtimeMs) {
                              try {
                                  const st = FS.stat(fpath);
                                  const localMs = st.mtime ? st.mtime.getTime() : 0;
                                  if (info.mtimeMs > localMs + 2000 && rawBytes.length > 0) {
                                      FS.writeFile(fpath, rawBytes);
                                  }
                              } catch (e) {}
                          }
                      }
                  }
              } catch (syncErr) {
                  console.warn("Initial Mac save pull warning:", syncErr);
              }

              // Fallback: if forestia-aaafores.txt still missing, fetch from /data/games/forestia/AAAFORES.TXT
              if (!exists(savesDir + "/forestia-aaafores.txt")) {
                  const cdResp = await originalFetch("data/games/forestia/AAAFORES.TXT");
                  if (cdResp.ok) {
                      const buf = new Uint8Array(await cdResp.arrayBuffer());
                      FS.writeFile(savesDir + "/forestia-aaafores.txt", buf);
                  }
              }

              // Sync local IDBFS saves back to Mac SSD whenever ScummVM writes/updates a save
              const lastUploadedHash = {};
              const syncSavesToMac = async () => {
                  try {
                      const entries = FS.readdir(savesDir).filter((n) => n !== "." && n !== ".." && n !== "forestia-aaafores.txt");
                      const toUpload = {};
                      let count = 0;
                      for (const name of entries) {
                          const full = savesDir + "/" + name;
                          const st = FS.stat(full);
                          if (FS.isDir(st.mode)) continue;
                          const data = FS.readFile(full);
                          const sig = data.length + ":" + (st.mtime ? st.mtime.getTime() : 0);
                          if (lastUploadedHash[name] !== sig) {
                              lastUploadedHash[name] = sig;
                              toUpload[name] = bytesToB64(data);
                              count++;
                          }
                      }
                      if (count > 0) {
                          await originalFetch("api/saves", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ files: toUpload })
                          });
                      }
                      window.dispatchEvent(new CustomEvent("forestia-saves-synced", {
                          detail: { files: entries, syncedAt: Date.now() }
                      }));
                  } catch (err) {
                      console.warn("Mac save push warning:", err);
                  }
              };

              IDBFS.onAutoPersistStateChanged = (busy) => {
                  if (!busy) {
                      syncSavesToMac();
                  }
              };

              await new Promise((resolve) => FS.syncfs(false, () => resolve()));
              syncSavesToMac();
              window.ForestiaEngine = {
                  ready: true,
                  FS: FS,
                  savesDir: savesDir,
                  syncSavesToMac: syncSavesToMac,
                  listSaves: () => FS.readdir(savesDir).filter((n) => n !== "." && n !== "..")
              };"""

    if old_fs_block not in src:
        raise RuntimeError("Could not locate _EmscriptenFilesystemFactory_initDefaultConfigFile block in scummvm.js.orig")
    src = src.replace(old_fs_block, new_fs_block, 1)

    with open(out_js, "w", encoding="utf-8") as f:
        f.write(src)
    print(f"[setup] Patched {out_js} ({len(src)} bytes) successfully.")


def ensure_runtime_ready() -> None:
    download_if_missing()
    link_cd_files()
    patch_scummvm_js()


if __name__ == "__main__":
    ensure_runtime_ready()
