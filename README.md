# Phaser Editor

Electron + React + Phaser 3 sahne ve prefab editörü. Phaser Editor 2D `.scene` / `.prefab` JSON formatıyla uyumludur; sahneleri TypeScript’e derleyebilirsiniz — oyunda resmi Phaser Editor 2D gerekmez.

> Custom editor. Not the official Phaser Editor product.

## Özellikler

- Proje klasörü açma, sahne sekmeleri, kaydet / geri al / kapat uyarısı
- Hierarchy: Shift çoklu seçim, Layer oluştur / seçilenleri grupla
- Sürüklenebilir dock pencereler (Hierarchy, Project, Prefabs, Inspector, Assets, Animation)
- Unity benzeri Inspector (eksen scrub, Arcade Body, Hit Area, Phaser 4 filter bileşenleri)
- 2D transform gizmo: El (pan), Position, Rotate, Scale — `Q` `W` `E` `R`
- Sprite Animation: `*-anims.json` (`generateFrameNames`) dopesheet, clip düzenleme, Ctrl+S
- Prefab: oluştur, instance, override, çift tıklayınca kamerayı odakla
- Derle (TS): `proje/src/scenes` ve `proje/src/prefabs`

## Gereksinimler

- Node.js 20+
- npm
- macOS / Windows / Linux (Electron)

## Çalıştırma

İki süreç gerekir: Vite dev server ve Electron penceresi.

```bash
npm install
npm run dev
```

Başka bir terminalde:

```bash
npm run electron:dev
```

Vite: `http://localhost:5173`. Tam dosya okuma/yazma yalnızca Electron içinde çalışır.

### Üretim

```bash
npm run build    # dist/ + dist-electron/
npm run dist     # electron-builder paketi (release/)
npm test
npm run typecheck
```

## Örnek oyun

`sample-game/` editörün ürettiği kodu kullanan küçük bir Phaser 3 projesidir.

```bash
cd sample-game
npm install
npm run dev
```

Editörde `sample-game` klasörünü proje olarak açıp `Level.scene` / `Dragon.prefab` düzenleyebilir, **Derle (TS)** ile `sample-game/src/` altına yazıp oyunu yenileyebilirsiniz.

## Kısayollar

| Tuş | İşlev |
| --- | --- |
| `Q` `W` `E` `R` | El / Position / Rotate / Scale |
| `Ctrl/Cmd+S` | Sahne + kirli `*-anims.json` kaydet |
| `Ctrl/Cmd+Z` / `Shift+Z` / `Y` | Undo / Redo |

## Klasörler

```
electron/          ana süreç + preload
src/editor/
  model/           Phaser Editor 2D uyumlu tipler, anims, gizmo matematiği
  serialization/   .scene / .prefab oku-yaz
  store/           Zustand (proje, sahne, seçim, undo)
  compiler/        TS kod üretimi
  phaser/          canvas (EditorScene, gizmo, texture)
  layout/          dock yerleşimi
  components/      React UI
sample-game/       derlenen kodu tüketen örnek oyun
```

## Sprite Animation

Clip’ler sahnede değil, `generateFrameNames` alanlı `*-anims.json` dosyalarındadır (`key`, `prefix`, `start`, `end`, `zeroPad`, `frameRate`, `repeat`). Prefab `label` / `texture.key` / dosya adı `atlasKey` veya `previewKey` ile eşleşince Animation penceresi açılır. `anims[]` olmayan dosyalar yok sayılır.

## Sınırlamalar

- Prefab derlemesi tek kök objeyi hedefler; iç içe container children her durumda derlenmeyebilir
- Editör texture’ları base64 ile yükler; oyunda ilgili anahtarın yüklenmiş olması gerekir
- Desteklenen tipler: Image, Sprite, Text, Container, Layer, Rectangle, Arc, Triangle, Line
- Resmi Phaser Editor v5 MCP / bulut ürünü değildir
