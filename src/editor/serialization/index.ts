import { v4 as uuidv4 } from "uuid";
import {
  createDefaultMeta,
  createDefaultSettings,
  GameObjectNode,
  GameObjectType,
  SceneFile,
  SceneType,
} from "../model/types";

export function defaultNode(type: GameObjectType | string, label: string): GameObjectNode {
  const base: GameObjectNode = {
    id: uuidv4(),
    type,
    label: label || `${type}_${Math.floor(Math.random() * 10000)}`,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    alpha: 1,
    originX: 0.5,
    originY: 0.5,
    visible: true,
  };
  if (type === "Image" || type === "Sprite" || type === "TileSprite") {
    base.texture = "";
  }
  if (type === "Text") {
    base.text = "Text";
    base.style = { fontSize: "24px", color: "#ffffff" };
  }
  if (type === "Container" || type === "Layer") {
    base.list = [];
    base.x = 0;
    base.y = 0;
  }
  if (type === "Rectangle" || type === "Arc" || type === "Triangle" || type === "Line") {
    base.x = 0;
    base.y = 0;
  }
  return base;
}

// .scene / .prefab dosyasini oku (Phaser Editor 2D uyumlu JSON)
export function deserializeScene(json: string, name: string): SceneFile {
  const parsed = JSON.parse(json) as SceneFile;
  if (!parsed.settings) parsed.settings = createDefaultSettings();
  if (!parsed.meta) parsed.meta = createDefaultMeta();
  if (!parsed.displayList) parsed.displayList = [];
  if (!parsed.plainObjects) parsed.plainObjects = [];
  (parsed as SceneFile & { name?: string }).name = name;
  return parsed;
}

export function serializeScene(scene: SceneFile): string {
  const out: SceneFile = { ...scene };
  delete (out as Partial<SceneFile & { name?: string }>).name;
  return JSON.stringify(out, null, 2);
}

// Projedeki prefab dosyalarini tarayip id -> {name, className} eslemesi
export interface PrefabIndexEntry {
  id: string;
  fileName: string; // ornek: Dragon.scene
  className: string; // ornek: Dragon
  filePath: string;
  scene?: SceneFile;
}

export function classNameFromFileName(fileName: string): string {
  // Dragon.prefab / Dragon.scene -> Dragon
  const base = fileName.replace(/\.(prefab|scene)$/i, "");
  return base;
}

export function sceneTypeFromExtension(fileName: string): SceneType {
  return fileName.toLowerCase().endsWith(".prefab") ? "PREFAB" : "SCENE";
}
