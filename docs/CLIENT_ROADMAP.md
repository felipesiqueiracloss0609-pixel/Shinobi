# Client Roadmap

## Stage 1 — Browser development runtime
Fast iteration, QA, asset debugging and feature prototyping through Phaser 4 + Vite.

## Stage 2 — Desktop packaging
Evaluate Tauri or Electron after the game core and renderer contracts stabilize.

## Stage 3 — Native-feeling client
Installer, update mechanism, local settings, input rebinding, audio device handling, resolution/fullscreen and crash diagnostics.

## Architecture rule
The domain model cannot assume that browser APIs exist. Browser-specific persistence and input sit behind interfaces so the desktop client can replace them.
