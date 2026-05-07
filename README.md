# RL Replay Web

A browser-based Rocket League replay viewer built with React, Three.js, Vite, and a Rust/WASM replay parser.

## Features

- Upload `.replay` files locally in the browser.
- Parse replay metadata, events, car frames, ball frames, boosts, demos, and match state.
- Render a Rocket League-style 3D viewer with Champions Field assets, Octane cars, boost effects, boost pads, scoreboard, timeline controls, camera modes, and replay library storage.
- Deployable as a static GitHub Pages app.

## Development

```sh
npm install
npm run build:wasm
npm run dev
```

## Verification

```sh
npm test
npm run build
```

The GitHub Pages workflow runs `npm ci`, builds the WASM parser, and builds the static app from `main`.

## Notes

Replay files are user-provided and are intentionally ignored by git. Large local extraction folders and debug output are also ignored.
