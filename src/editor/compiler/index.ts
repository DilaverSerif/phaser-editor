import {
  GameObjectNode,
  SceneFile,
  textureKeyOf,
} from "../model/types";
import { PrefabIndexEntry } from "../serialization";
import { emitArcade, emitFilters, emitHitArea } from "../model/phaserComponents";

function sanitizeVar(name: string): string {
  const s = name.replace(/[^a-zA-Z0-9_]/g, "_");
  return /^[0-9]/.test(s) ? `_${s}` : s || "obj";
}

function toLiteral(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (v === null || v === undefined) return "undefined";
  return JSON.stringify(v);
}

const FACTORY: Record<string, string> = {
  Image: "image",
  Sprite: "sprite",
  TileSprite: "tileSprite",
  Text: "text",
  Container: "container",
  Rectangle: "rectangle",
  Arc: "circle",
  Triangle: "triangle",
  Line: "line",
  BitmapText: "bitmapText",
};

const BASE_CLASS: Record<string, string> = {
  Image: "Phaser.GameObjects.Image",
  Sprite: "Phaser.GameObjects.Sprite",
  TileSprite: "Phaser.GameObjects.TileSprite",
  Text: "Phaser.GameObjects.Text",
  Container: "Phaser.GameObjects.Container",
  Layer: "Phaser.GameObjects.Layer",
  Rectangle: "Phaser.GameObjects.Rectangle",
  Arc: "Phaser.GameObjects.Arc",
  Triangle: "Phaser.GameObjects.Triangle",
  Line: "Phaser.GameObjects.Line",
  BitmapText: "Phaser.GameObjects.BitmapText",
};

interface Ctx {
  prefabs: PrefabIndexEntry[];
  varNames: Map<string, string>;
  counter: number;
  imports: Set<string>;
  language: "TYPE_SCRIPT" | "JAVA_SCRIPT";
}

function uniqueVar(ctx: Ctx, base: string): string {
  let name = sanitizeVar(base);
  if (!ctx.varNames.has(name)) {
    ctx.varNames.set(name, name);
    return name;
  }
  let i = 1;
  while (ctx.varNames.has(`${name}_${i}`)) i++;
  const final = `${name}_${i}`;
  ctx.varNames.set(final, final);
  return final;
}

function prefabConstructorArgs(
  node: GameObjectNode,
  prefab: PrefabIndexEntry | undefined,
  sceneExpr: string
): string {
  const root = prefab?.scene?.displayList[0];
  const rootType = root?.type;
  const x = node.x ?? root?.x ?? 0;
  const y = node.y ?? root?.y ?? 0;

  // Layer'in Phaser constructor'i sadece scene alir.
  if (rootType === "Layer") return sceneExpr;

  if (rootType === "TileSprite") {
    const width = node.width ?? root?.width ?? 64;
    const height = node.height ?? root?.height ?? 64;
    const texture = textureKeyOf(node) || (root ? textureKeyOf(root) : "");
    const frame = node.frame ?? root?.frame;
    return `${sceneExpr}, ${x}, ${y}, ${width}, ${height}, ${toLiteral(texture)}, ${toLiteral(frame)}`;
  }

  if (rootType === "Image" || rootType === "Sprite") {
    const texture = textureKeyOf(node) || (root ? textureKeyOf(root) : "");
    const frame = node.frame ?? root?.frame;
    return `${sceneExpr}, ${x}, ${y}, ${toLiteral(texture)}, ${toLiteral(frame)}`;
  }

  return `${sceneExpr}, ${x}, ${y}`;
}

// Bir node icin Phaser olusturma ifadesini ve ozellik atamalarini uretir.
function emitNode(
  node: GameObjectNode,
  ctx: Ctx,
  indent: string,
  lines: string[],
  sceneExpr = "this"
): string {
  const v = uniqueVar(ctx, node.label || node.type);

  if (node.prefabId) {
    const pref = ctx.prefabs.find((p) => p.id === node.prefabId);
    const cls = pref ? pref.className : sanitizeVar(node.label);
    if (pref) ctx.imports.add(cls);
    lines.push(`const ${v} = new ${cls}(${prefabConstructorArgs(node, pref, sceneExpr)});`);
    lines.push(`${sceneExpr}.add.existing(${v});`);
  } else {
    const factory = FACTORY[node.type] || "rectangle";
    if (node.type === "Image" || node.type === "Sprite") {
      const tex = textureKeyOf(node) ? toLiteral(textureKeyOf(node)) : '""';
      const frame = node.frame ? toLiteral(node.frame) : "undefined";
      lines.push(
        `const ${v} = ${sceneExpr}.add.${factory}(${node.x ?? 0}, ${node.y ?? 0}, ${tex}, ${frame});`
      );
    } else if (node.type === "TileSprite") {
      const tex = textureKeyOf(node) ? toLiteral(textureKeyOf(node)) : '""';
      const frame = node.frame ? toLiteral(node.frame) : "undefined";
      lines.push(
        `const ${v} = ${sceneExpr}.add.tileSprite(${node.x ?? 0}, ${node.y ?? 0}, ${node.width ?? 64}, ${node.height ?? 64}, ${tex}, ${frame});`
      );
    } else if (node.type === "Text") {
      lines.push(
        `const ${v} = ${sceneExpr}.add.text(${node.x ?? 0}, ${node.y ?? 0}, ${toLiteral(
          node.text || ""
        )}, ${JSON.stringify(node.style || {})});`
      );
    } else if (node.type === "Container") {
      lines.push(`const ${v} = ${sceneExpr}.add.container(${node.x ?? 0}, ${node.y ?? 0});`);
    } else if (node.type === "Layer") {
      lines.push(`const ${v} = ${sceneExpr}.add.layer();`);
    } else if (node.type === "Rectangle") {
      lines.push(`const ${v} = ${sceneExpr}.add.rectangle(${node.x ?? 0}, ${node.y ?? 0}, 64, 64, 0x44aa88);`);
    } else if (node.type === "Arc") {
      lines.push(`const ${v} = ${sceneExpr}.add.circle(${node.x ?? 0}, ${node.y ?? 0}, 32, 0xaa8844);`);
    } else if (node.type === "Triangle") {
      lines.push(`const ${v} = ${sceneExpr}.add.triangle(${node.x ?? 0}, ${node.y ?? 0}, 0, 32, 16, 0, 32, 32, 0x8844aa);`);
    } else if (node.type === "Line") {
      lines.push(`const ${v} = ${sceneExpr}.add.line(${node.x ?? 0}, ${node.y ?? 0}, 0, 0, 64, 0, 0xffffff);`);
    } else {
      lines.push(`const ${v} = ${sceneExpr}.add.rectangle(${node.x ?? 0}, ${node.y ?? 0}, 64, 64, 0x888888);`);
    }
  }

  // ortak ozellikler
  if (node.originX !== undefined && node.originY !== undefined) {
    lines.push(`${v}.setOrigin(${node.originX}, ${node.originY});`);
  }
  if ((node.scaleX ?? 1) !== 1 || (node.scaleY ?? 1) !== 1) {
    lines.push(`${v}.setScale(${node.scaleX ?? 1}, ${node.scaleY ?? 1});`);
  }
  if ((node.angle ?? 0) !== 0) lines.push(`${v}.setAngle(${node.angle});`);
  if ((node.alpha ?? 1) !== 1) lines.push(`${v}.setAlpha(${node.alpha});`);
  if ((node.depth ?? 0) !== 0) lines.push(`${v}.setDepth(${node.depth});`);
  if (node.visible === false) lines.push(`${v}.setVisible(false);`);
  if (node.tint !== undefined) lines.push(`${v}.setTint(${node.tint});`);
  if (node.type === "TileSprite" && (node.tileScaleX !== undefined || node.tileScaleY !== undefined)) {
    lines.push(`${v}.setTileScale(${node.tileScaleX ?? 1}, ${node.tileScaleY ?? 1});`);
  }
  lines.push(...emitHitArea(v, node));
  lines.push(...emitArcade(v, node, sceneExpr));
  lines.push(...emitFilters(v, node));

  // cocuklar (container)
  if (node.list && node.list.length) {
    for (const child of node.list) {
      const cv = emitNode(child, ctx, indent, lines, sceneExpr);
      lines.push(`${v}.add(${cv});`);
    }
  }

  return v;
}

export function compileScene(
  scene: SceneFile,
  className: string,
  prefabs: PrefabIndexEntry[]
): string {
  if (scene.sceneType === "PREFAB") return compilePrefab(scene, className, prefabs);
  return compileRegularScene(scene, className, prefabs);
}

function compileRegularScene(
  scene: SceneFile,
  className: string,
  prefabs: PrefabIndexEntry[]
): string {
  const ctx: Ctx = {
    prefabs,
    varNames: new Map(),
    counter: 0,
    imports: new Set(),
    language: scene.settings.compilerOutputLanguage,
  };
  // prefab sinif adi ve Phaser gibi rezerve isimlerle degisken cakismasini onle
  for (const p of prefabs) ctx.varNames.set(p.className, p.className);
  ctx.varNames.set("Phaser", "Phaser");
  const body: string[] = [];
  for (const node of scene.displayList) {
    const lines: string[] = [];
    emitNode(node, ctx, "        ", lines);
    body.push(lines.join("\n"));
  }
  const importLines = [...ctx.imports]
    .map((c) => `import ${c} from "../prefabs/${c}";`)
    .join("\n");

  return `/* START OF COMPILED CODE */
import Phaser from "phaser";
${importLines ? importLines + "\n" : ""}
export default class ${className} extends Phaser.Scene {
    constructor() {
        super("${className}");
    }

    create() {
${body.join("\n")}
    }
}
/* END OF COMPILED CODE */
`;
}

function compilePrefab(
  scene: SceneFile,
  className: string,
  prefabs: PrefabIndexEntry[]
): string {
  const root = scene.displayList[0];
  const base =
    root && BASE_CLASS[root.type]
      ? BASE_CLASS[root.type]
      : "Phaser.GameObjects.Image";
  const tex = root ? toLiteral(textureKeyOf(root)) : '""';
  const frame = root?.frame ? toLiteral(root.frame) : "undefined";
  const dx = root?.x ?? 0;
  const dy = root?.y ?? 0;

  const ctx: Ctx = {
    prefabs,
    varNames: new Map(),
    counter: 0,
    imports: new Set(),
    language: scene.settings.compilerOutputLanguage,
  };
  for (const p of prefabs) ctx.varNames.set(p.className, p.className);
  ctx.varNames.set("Phaser", "Phaser");
  ctx.varNames.set(className, className);

  const children: string[] = [];
  if (root && (root.type === "Layer" || root.type === "Container") && root.list) {
    for (const child of root.list) {
      const childVar = emitNode(child, ctx, "        ", children, "scene");
      children.push(`this.add(${childVar});`);
    }
  }

  const props: string[] = [];
  if (root?.type !== "Layer" && root?.originX !== undefined && root?.originY !== undefined)
    props.push(`        this.setOrigin(${root.originX}, ${root.originY});`);
  if (root?.type !== "Layer" && ((root?.scaleX ?? 1) !== 1 || (root?.scaleY ?? 1) !== 1))
    props.push(`        this.setScale(${root?.scaleX ?? 1}, ${root?.scaleY ?? 1});`);
  if (root?.type !== "Layer" && (root?.angle ?? 0) !== 0)
    props.push(`        this.setAngle(${root.angle});`);
  if ((root?.alpha ?? 1) !== 1) props.push(`        this.setAlpha(${root.alpha});`);
  if ((root?.depth ?? 0) !== 0) props.push(`        this.setDepth(${root.depth});`);
  if (root?.visible === false) props.push("        this.setVisible(false);");
  if (root?.type === "TileSprite" && (root.tileScaleX !== undefined || root.tileScaleY !== undefined))
    props.push(`        this.setTileScale(${root.tileScaleX ?? 1}, ${root.tileScaleY ?? 1});`);
  if (root) {
    for (const line of [
      ...emitHitArea("this", root),
      ...emitArcade("this", root, "scene"),
      ...emitFilters("this", root),
    ]) {
      props.push(`        ${line}`);
    }
  }

  const importLines = [...ctx.imports]
    .map((c) => `import ${c} from "../prefabs/${c}";`)
    .join("\n");

  if (root?.type === "Layer") {
    return `/* START OF COMPILED CODE */
import Phaser from "phaser";
${importLines ? importLines + "\n" : ""}
export default class ${className} extends Phaser.GameObjects.Layer {
    constructor(scene: Phaser.Scene) {
        super(scene);
${children.join("\n")}
${props.join("\n")}
    }
}
/* END OF COMPILED CODE */
`;
  }

  let superArgs = `scene, x ?? ${dx}, y ?? ${dy}`;
  if (root?.type === "TileSprite") {
    superArgs += `, width ?? ${root.width ?? 64}, height ?? ${root.height ?? 64}, texture || ${tex}, frame || ${frame}`;
  } else if (root?.type === "Image" || root?.type === "Sprite") {
    superArgs += `, texture || ${tex}, frame || ${frame}`;
  }

  return `/* START OF COMPILED CODE */
import Phaser from "phaser";
${importLines ? importLines + "\n" : ""}
export default class ${className} extends ${base} {
    constructor(scene: Phaser.Scene, x?: number, y?: number, width?: number, height?: number, texture?: string, frame?: string) {
        super(${superArgs});
${children.join("\n")}
${props.join("\n")}
    }
}
/* END OF COMPILED CODE */
`;
}
