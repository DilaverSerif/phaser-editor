// Phaser Editor 2D ile uyumlu sahne/prefab veri modeli.
// JSON alan isimleri birebir Phaser Editor 2D .scene/.prefab formatina uygundur.

export type SceneType = "SCENE" | "PREFAB";

export type CompilerLanguage = "TYPE_SCRIPT" | "JAVA_SCRIPT";

export interface SceneSettings {
  exportClass: boolean;
  autoImport: boolean;
  preloadMethodName: string;
  preloadPackFiles: string[];
  createMethodName: string;
  compilerOutputLanguage: CompilerLanguage;
  borderWidth: number;
  borderHeight: number;
}

export interface SceneMeta {
  app: string;
  url: string;
  contentType: string;
  version: number;
}

export interface PrefabPropertyType {
  id: string; // "string" | "number" | "boolean" | "option" | "event" | ...
  options?: string[];
}

export interface PrefabProperty {
  name: string;
  label: string;
  tooltip: string;
  defValue: unknown;
  customDefinition: boolean;
  type: PrefabPropertyType;
}

export type GameObjectType =
  | "Image"
  | "Sprite"
  | "Text"
  | "Container"
  | "Layer"
  | "Rectangle"
  | "Arc"
  | "Triangle"
  | "Line"
  | "TileSprite"
  | "BitmapText";

// Bir game object'i temsil eden duger duger node.
// Phaser Editor 2D .scene displayList ogeleriyle ayni anahtarlari kullanir.
export interface GameObjectNode {
  id: string;
  type: GameObjectType | string;
  label: string;

  // transform
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  alpha?: number;
  originX?: number;
  originY?: number;
  visible?: boolean;

  // gorsel — Phaser Editor 2D hem "texture": "key" hem de
  // "texture": { "key": "..." } seklinde saklayabilir
  texture?: string | { key: string; frame?: string };
  frame?: string;
  tint?: number;
  depth?: number;

  // metin
  text?: string;
  style?: Record<string, unknown>;

  // prefab instance
  prefabId?: string;
  prefabName?: string;
  unlock?: string[];

  // container cocuklari
  list?: GameObjectNode[];

  // kullanici componentleri (basit tutuyoruz)
  components?: Array<Record<string, unknown>>;
  // Phaser 4 FilterList (Inspector'dan eklenir)
  filters?: Array<Record<string, unknown>>;

  // diger tip ozgü alanlar (anims vb.)
  [key: string]: unknown;
}

export interface SceneFile {
  id: string;
  sceneType: SceneType;
  settings: SceneSettings;
  displayList: GameObjectNode[];
  plainObjects: unknown[];
  meta: SceneMeta;
  // sadece PREFAB dosyalarinda
  prefabProperties?: PrefabProperty[];
}

export function createDefaultSettings(): SceneSettings {
  return {
    exportClass: true,
    autoImport: true,
    preloadMethodName: "",
    preloadPackFiles: [],
    createMethodName: "",
    compilerOutputLanguage: "TYPE_SCRIPT",
    borderWidth: 1280,
    borderHeight: 720,
  };
}

export function createDefaultMeta(): SceneMeta {
  return {
    app: "Phaser Editor (custom)",
    url: "https://phasereditor2d.com",
    contentType: "phasereditor2d.core.scene.SceneContentType",
    version: 3,
  };
}

export function createEmptyScene(
  id: string,
  sceneType: SceneType,
  name: string
): SceneFile {
  const scene: SceneFile = {
    id,
    sceneType,
    settings: createDefaultSettings(),
    displayList: [],
    plainObjects: [],
    meta: createDefaultMeta(),
  };
  if (sceneType === "PREFAB") {
    scene.prefabProperties = [];
  }
  // dosya adini (sinif adini) label olarak saklamak yardimci olur
  (scene as SceneFile & { name?: string }).name = name;
  return scene;
}

// texture alanini (string veya {key}) bir anahtar string'ine cevirir
export function textureKeyOf(node: GameObjectNode): string {
  const t = node.texture;
  if (!t) return "";
  if (typeof t === "string") return t;
  if (t && typeof t === "object" && "key" in t) return (t as { key: string }).key;
  return "";
}

// inspector'dan texture anahtari degistiginde, orijinal formati korur
// (string ise string, {key} ise {key} olarak geri yazar)
export function withTextureKey(
  node: GameObjectNode,
  key: string
): Partial<GameObjectNode> {
  const t = node.texture;
  if (t && typeof t === "object") {
    return { texture: { ...(t as object), key } } as Partial<GameObjectNode>;
  }
  return { texture: key };
}
