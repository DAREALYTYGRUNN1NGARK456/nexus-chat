# Tauri v2 Setup Guide

This project has been configured for Tauri v2. Follow the steps below to build the Windows desktop app.

## Prerequisites

Install these once on your Windows machine:

1. **Rust** — https://rustup.rs/
   ```powershell
   rustup target add x86_64-pc-windows-msvc
   ```
2. **Node.js 18+** — https://nodejs.org/
3. **Microsoft C++ Build Tools** (or Visual Studio with "Desktop development with C++")
   - https://visualstudio.microsoft.com/visual-cpp-build-tools/
4. **WebView2** — already included with Windows 10/11 and Edge. If missing:
   - https://developer.microsoft.com/en-us/microsoft-edge/webview2/

## Install dependencies

```bash
npm install
```

## Development (browser + hot reload, no Rust compile)

```bash
npm run dev
```

## Development (inside Tauri window)

```bash
npm run tauri:dev
```

This compiles the Rust backend and opens a native window loading your Vite dev server at `http://localhost:19274`.

## Build the Windows installer (.exe / .msi)

```bash
npm run tauri:build
```

Output files will be in:
```
src-tauri/target/release/bundle/
  msi/        ← Windows Installer (.msi)
  nsis/       ← NSIS installer (.exe)
```

## Notes

- The Express backend server (`server/`) is **not** bundled into the desktop app.
  The frontend talks directly to InsForge via the SDK (no `/api` proxy needed in production).
  If you still need the Express server, run it separately or package it as a sidecar.
- Discord OAuth uses InsForge's client-side SDK — no server-side callback route needed.
- The app identifier is `cc.yeetdesigns.nexus` — change this in `src-tauri/tauri.conf.json`
  if needed (must be unique per app).
- App icons: replace the placeholder PNGs in `src-tauri/icons/` with your real icons.
  Run `npm run tauri icon path/to/your/icon.png` to auto-generate all sizes.
