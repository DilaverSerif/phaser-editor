# Phaser Editor

**English** | [Türkçe](README.tr.md)

Electron + React + Phaser 3 scene and prefab editor. It reads and writes Phaser Editor 2D `.scene` / `.prefab` JSON and can compile scenes to TypeScript, so the game runtime does not need official Phaser Editor 2D.

> Custom editor. Not the official Phaser Editor product.

## Features

- Open a project folder, scene tabs, save / revert / unsaved close warning
- Hierarchy: Shift multi-select, create Layer / group selection into a Layer
- Draggable dock windows (Hierarchy, Project, Prefabs, Inspector, Assets, Animation)
- Unity-like Inspector (axis scrub, Arcade Body, Hit Area, Phaser 4 filter components)
- 2D transform gizmo: Hand (pan), Position, Rotate, Scale — `Q` `W` `E` `R`
- Sprite Animation: `*-anims.json` (`generateFrameNames`) dopesheet, clip editing, Ctrl+S
- Prefabs: create, instance, overrides, double-click to focus the camera
- Compile (TS): writes to `project/src/scenes` and `project/src/prefabs`

## Requirements

- Node.js 20+
- npm
- macOS / Windows / Linux (Electron)

## Run

You need two processes: the Vite dev server and the Electron window.

```bash
npm install
npm run dev
```

In another terminal:

```bash
npm run electron:dev
```

Vite: `http://localhost:5173`. Full file read/write only works inside Electron.

### Production

```bash
npm run build    # dist/ + dist-electron/
npm run dist     # electron-builder package (release/)
npm test
npm run typecheck
```

## Sample game

`sample-game/` is a small Phaser 3 project that consumes code produced by the editor.

```bash
cd sample-game
npm install
npm run dev
```

Open the `sample-game` folder as a project, edit `Level.scene` / `Dragon.prefab`, then **Compile (TS)** to write into `sample-game/src/` and refresh the game.

## Shortcuts

| Key | Action |
| --- | --- |
| `Q` `W` `E` `R` | Hand / Position / Rotate / Scale |
| `Ctrl/Cmd+S` | Save scene + dirty `*-anims.json` |
| `Ctrl/Cmd+Z` / `Shift+Z` / `Y` | Undo / Redo |

## Layout

```
electron/          main process + preload
src/editor/
  model/           Phaser Editor 2D types, anims, gizmo math
  serialization/   .scene / .prefab read-write
  store/           Zustand (project, scene, selection, undo)
  compiler/        TypeScript codegen
  phaser/          canvas (EditorScene, gizmo, textures)
  layout/          dock layout
  components/      React UI
sample-game/       sample game that uses compiled output
```

## Sprite Animation

Clips live in `*-anims.json` files with `generateFrameNames` fields (`key`, `prefix`, `start`, `end`, `zeroPad`, `frameRate`, `repeat`), not on the scene. The Animation window opens when a prefab `label` / `texture.key` / file name matches `atlasKey` or `previewKey`. Files without `anims[]` are ignored.

## Limitations

- Prefab compile targets a single root object; nested container children may not always compile
- The editor loads textures as base64; the game still needs those keys loaded
- Supported types: Image, Sprite, Text, Container, Layer, Rectangle, Arc, Triangle, Line
- This is not official Phaser Editor v5 MCP / cloud
