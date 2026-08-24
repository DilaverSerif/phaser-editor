import { v4 as uuidv4 } from "uuid";
import type { GameObjectNode } from "./types";

export type PhaserAddableKind = "arcade" | "hitArea" | PhaserFilterType;

export type PhaserFilterType =
  | "Glow"
  | "Shadow"
  | "Pixelate"
  | "Blur"
  | "Barrel"
  | "Displacement"
  | "Bokeh"
  | "Vignette"
  | "ColorMatrix"
  | "Wipe";

export interface PhaserFilter {
  id: string;
  type: PhaserFilterType;
  label: string;
  list: "external" | "internal";
  [key: string]: unknown;
}

export interface ComponentField {
  key: string;
  label: string;
  kind: "number" | "boolean" | "select" | "color" | "text";
  options?: Array<{ value: string | number; label: string }>;
  step?: number;
}

export const FILTER_TYPES: PhaserFilterType[] = [
  "Glow",
  "Shadow",
  "Pixelate",
  "Blur",
  "Barrel",
  "Displacement",
  "Bokeh",
  "Vignette",
  "ColorMatrix",
  "Wipe",
];

const FILTER_DEFAULTS: Record<PhaserFilterType, Record<string, unknown>> = {
  Glow: { color: "#ffffff", outerStrength: 4, innerStrength: 0, scale: 1, knockout: false },
  Shadow: { x: 0, y: 0, decay: 0.1, power: 1, color: "#000000", samples: 6, intensity: 1 },
  Pixelate: { amount: 1 },
  Blur: { x: 2, y: 2, strength: 1, color: "#ffffff", steps: 4 },
  Barrel: { amount: 1 },
  Displacement: { x: 0.005, y: 0.005 },
  Bokeh: { radius: 0.5, amount: 1, contrast: 0.2 },
  Vignette: { x: 0.5, y: 0.5, radius: 0.5, strength: 0.5, color: "#000000" },
  ColorMatrix: { alpha: 1, brightness: 0, saturate: 0, hueRotation: 0, contrast: 0 },
  Wipe: { progress: 0, wipeWidth: 0.1, direction: 0, axis: 0, reveal: 0 },
};

export const ARCADE_FIELDS: ComponentField[] = [
  {
    key: "body.physicsType",
    label: "Body",
    kind: "select",
    options: [
      { value: 0, label: "Dynamic" },
      { value: 1, label: "Static" },
    ],
  },
  {
    key: "body.geometry",
    label: "Shape",
    kind: "select",
    options: [
      { value: 1, label: "Rectangle" },
      { value: 0, label: "Circle" },
    ],
  },
  { key: "body.width", label: "Width", kind: "number", step: 1 },
  { key: "body.height", label: "Height", kind: "number", step: 1 },
  { key: "body.radius", label: "Radius", kind: "number", step: 1 },
  { key: "body.offset.x", label: "Offset X", kind: "number", step: 1 },
  { key: "body.offset.y", label: "Offset Y", kind: "number", step: 1 },
  { key: "body.allowGravity", label: "Gravity", kind: "boolean" },
  { key: "body.immovable", label: "Immovable", kind: "boolean" },
  { key: "body.collideWorldBounds", label: "World Bounds", kind: "boolean" },
  { key: "body.pushable", label: "Pushable", kind: "boolean" },
  { key: "body.mass", label: "Mass", kind: "number", step: 0.1 },
  { key: "body.bounce.x", label: "Bounce X", kind: "number", step: 0.05 },
  { key: "body.bounce.y", label: "Bounce Y", kind: "number", step: 0.05 },
  { key: "body.velocity.x", label: "Velocity X", kind: "number", step: 1 },
  { key: "body.velocity.y", label: "Velocity Y", kind: "number", step: 1 },
];

export const HIT_AREA_FIELDS: ComponentField[] = [
  {
    key: "hitArea.shape",
    label: "Shape",
    kind: "select",
    options: [
      { value: "RECTANGLE", label: "Rectangle" },
      { value: "CIRCLE", label: "Circle" },
      { value: "ELLIPSE", label: "Ellipse" },
      { value: "POLYGON", label: "Polygon" },
      { value: "PIXEL_PERFECT", label: "Pixel Perfect" },
    ],
  },
  { key: "hitArea.x", label: "X", kind: "number", step: 1 },
  { key: "hitArea.y", label: "Y", kind: "number", step: 1 },
  { key: "hitArea.width", label: "Width", kind: "number", step: 1 },
  { key: "hitArea.height", label: "Height", kind: "number", step: 1 },
  { key: "hitArea.radius", label: "Radius", kind: "number", step: 1 },
  { key: "hitArea.points", label: "Points", kind: "text" },
];

export function hasArcade(node: GameObjectNode): boolean {
  return node["ArcadeComponent.active"] === true;
}

export function hasHitArea(node: GameObjectNode): boolean {
  const shape = node["hitArea.shape"];
  return typeof shape === "string" && shape !== "NONE";
}

export function nodeFilters(node: GameObjectNode): PhaserFilter[] {
  return Array.isArray(node.filters) ? (node.filters as PhaserFilter[]) : [];
}

export function arcadeDefaults(): Record<string, unknown> {
  return {
    "ArcadeComponent.active": true,
    "body.physicsType": 0,
    "body.geometry": 1,
    "body.width": 0,
    "body.height": 0,
    "body.radius": 0,
    "body.offset.x": 0,
    "body.offset.y": 0,
    "body.allowGravity": true,
    "body.immovable": false,
    "body.collideWorldBounds": false,
    "body.pushable": true,
    "body.mass": 1,
    "body.bounce.x": 0,
    "body.bounce.y": 0,
    "body.velocity.x": 0,
    "body.velocity.y": 0,
  };
}

export function hitAreaDefaults(): Record<string, unknown> {
  return {
    "hitArea.shape": "RECTANGLE",
    "hitArea.x": 0,
    "hitArea.y": 0,
    "hitArea.width": 0,
    "hitArea.height": 0,
    "hitArea.radius": 0,
    "hitArea.points": "",
  };
}

export function createFilter(type: PhaserFilterType): PhaserFilter {
  return {
    id: uuidv4(),
    type,
    label: type,
    list: "external",
    ...FILTER_DEFAULTS[type],
  };
}

export function arcadeKeysOf(node: GameObjectNode): string[] {
  return Object.keys(node).filter(
    (key) => key === "ArcadeComponent.active" || key.startsWith("body.")
  );
}

export function hitAreaKeysOf(node: GameObjectNode): string[] {
  return Object.keys(node).filter((key) => key === "hitArea" || key.startsWith("hitArea."));
}

export function filterFields(type: PhaserFilterType): ComponentField[] {
  return Object.entries(FILTER_DEFAULTS[type]).map(([key, value]) => {
    if (typeof value === "boolean") return { key, label: labelize(key), kind: "boolean" as const };
    if (typeof value === "string" && value.startsWith("#")) {
      return { key, label: labelize(key), kind: "color" as const };
    }
    if (typeof value === "number") {
      return { key, label: labelize(key), kind: "number" as const, step: 0.01 };
    }
    return { key, label: labelize(key), kind: "text" as const };
  });
}

function labelize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (ch) => ch.toUpperCase())
    .trim();
}

export function hexToPhaserColor(value: unknown): string {
  if (typeof value === "number") return `0x${value.toString(16)}`;
  const hex = String(value ?? "#ffffff").replace("#", "");
  return `0x${hex}`;
}

export function emitArcade(varName: string, node: GameObjectNode, sceneExpr: string): string[] {
  if (!hasArcade(node)) return [];
  const isStatic = node["body.physicsType"] === 1;
  const lines = [`${sceneExpr}.physics.add.existing(${varName}, ${isStatic});`];
  const width = Number(node["body.width"] ?? 0);
  const height = Number(node["body.height"] ?? 0);
  const radius = Number(node["body.radius"] ?? 0);
  const geometry = node["body.geometry"];
  if (geometry === 0 && radius > 0) {
    lines.push(`${varName}.body.setCircle(${radius});`);
  } else if (width > 0 || height > 0) {
    lines.push(`${varName}.body.setSize(${width}, ${height});`);
  }
  const ox = Number(node["body.offset.x"] ?? 0);
  const oy = Number(node["body.offset.y"] ?? 0);
  if (ox || oy) lines.push(`${varName}.body.setOffset(${ox}, ${oy});`);
  if (node["body.allowGravity"] === false) lines.push(`${varName}.body.setAllowGravity(false);`);
  if (node["body.immovable"] === true) lines.push(`${varName}.body.setImmovable(true);`);
  if (node["body.collideWorldBounds"] === true) {
    lines.push(`${varName}.body.setCollideWorldBounds(true);`);
  }
  if (node["body.pushable"] === false) lines.push(`${varName}.body.pushable = false;`);
  const mass = Number(node["body.mass"] ?? 1);
  if (mass !== 1) lines.push(`${varName}.body.setMass(${mass});`);
  const bx = Number(node["body.bounce.x"] ?? 0);
  const by = Number(node["body.bounce.y"] ?? 0);
  if (bx || by) lines.push(`${varName}.body.setBounce(${bx}, ${by});`);
  const vx = Number(node["body.velocity.x"] ?? 0);
  const vy = Number(node["body.velocity.y"] ?? 0);
  if (vx || vy) lines.push(`${varName}.body.setVelocity(${vx}, ${vy});`);
  return lines;
}

export function emitHitArea(varName: string, node: GameObjectNode): string[] {
  if (!hasHitArea(node)) return [];
  const shape = String(node["hitArea.shape"]);
  const x = Number(node["hitArea.x"] ?? 0);
  const y = Number(node["hitArea.y"] ?? 0);
  const w = Number(node["hitArea.width"] ?? 0);
  const h = Number(node["hitArea.height"] ?? 0);
  const r = Number(node["hitArea.radius"] ?? 0);
  if (shape === "CIRCLE" && r > 0) {
    return [
      `${varName}.setInteractive(new Phaser.Geom.Circle(${x}, ${y}, ${r}), Phaser.Geom.Circle.Contains);`,
    ];
  }
  if (shape === "ELLIPSE" && w > 0 && h > 0) {
    return [
      `${varName}.setInteractive(new Phaser.Geom.Ellipse(${x}, ${y}, ${w}, ${h}), Phaser.Geom.Ellipse.Contains);`,
    ];
  }
  if (shape === "RECTANGLE" && w > 0 && h > 0) {
    return [
      `${varName}.setInteractive(new Phaser.Geom.Rectangle(${x}, ${y}, ${w}, ${h}), Phaser.Geom.Rectangle.Contains);`,
    ];
  }
  if (shape === "PIXEL_PERFECT") {
    return [`${varName}.setInteractive({ pixelPerfect: true });`];
  }
  return [`${varName}.setInteractive();`];
}

export function emitFilters(varName: string, node: GameObjectNode): string[] {
  const filters = nodeFilters(node);
  if (filters.length === 0) return [];
  const lines = [`${varName}.enableFilters();`];
  for (const filter of filters) {
    const list = filter.list === "internal" ? "internal" : "external";
    const method = `add${filter.type}`;
    const args = filterConfigLiteral(filter);
    lines.push(`${varName}.filters.${list}.${method}(${args});`);
  }
  return lines;
}

function filterConfigLiteral(filter: PhaserFilter): string {
  const skip = new Set(["id", "type", "label", "list"]);
  const parts: string[] = [];
  for (const [key, value] of Object.entries(filter)) {
    if (skip.has(key) || value === undefined) continue;
    if (typeof value === "string" && value.startsWith("#")) {
      parts.push(`${key}: ${hexToPhaserColor(value)}`);
    } else if (typeof value === "string") {
      parts.push(`${key}: ${JSON.stringify(value)}`);
    } else if (typeof value === "boolean" || typeof value === "number") {
      parts.push(`${key}: ${value}`);
    }
  }
  return parts.length ? `{ ${parts.join(", ")} }` : "";
}
