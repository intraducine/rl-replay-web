# RL Replay Web

A browser-based Rocket League replay viewer built with React, Three.js, Vite, and a Rust/WASM replay parser.

## Features

- Local `.replay` upload flow with parsing isolated in a Web Worker.
- Rust/WASM replay parser for metadata, events, car frames, ball frames, boost state, demos, scoring, and camera state.
- Three.js viewer with Champions Field assets, Octane-style cars, boost effects, boost pads, scoreboard, timeline controls, camera modes, and player nameplates.
- Browser replay library backed by IndexedDB so parsed timelines can be reopened without re-uploading.
- Static deployment target for GitHub Pages.

## Tech Stack

- React 19 + Vite
- Three.js via `@react-three/fiber` and `@react-three/drei`
- Rust parser compiled to WebAssembly
- Vitest + Testing Library

## Development

```sh
npm install
npm run build:wasm
npm run dev
```

The dev build exposes the replay inspector and coordinate calibration controls. Production builds hide those QA tools so the public app opens directly into upload, library, and viewer workflows.

## Verification

```sh
npm test
npm run build
```

The GitHub Pages workflow runs `npm ci`, builds the WASM parser, and builds the static app from `main`.

Some Champions Field tests verify committed browser-ready textures and their recorded provenance. If you also have the original Rocket League package files and UModel export available locally, run the stricter source-asset check with:

```sh
VERIFY_LOCAL_RL_ASSETS=1 npm test
```

## Notes

Replay files are user-provided and are intentionally ignored by git. Large local extraction folders and debug output are also ignored.
