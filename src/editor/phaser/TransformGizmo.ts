import Phaser from "phaser";
import {
  applyAxisDelta,
  angleFromPoints,
  RING_HIT_OUTER,
  RING_RADIUS,
  ringContains,
  rotateByDelta,
  scaleFromDrag,
  type TransformAxis,
  type TransformTool,
} from "../model/transformGizmo";
import { findNode, useEditorStore } from "../store/store";

const DEPTH = 100001;
const ARROW = 80;
const COLOR_X = 0xe74c3c;
const COLOR_Y = 0x2ecc71;
const COLOR_PLANE = 0x4aa3ff;
const COLOR_ROT = 0xf1c40f;
const COLOR_UNI = 0xecf0f1;

type HandleKind = "move" | "rotate" | "scale";

interface Handle extends Phaser.GameObjects.Zone {
  __gizmo: true;
  __kind: HandleKind;
  __axis: TransformAxis;
}

interface DragState {
  kind: HandleKind;
  axis: TransformAxis;
  id: string;
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  startScaleX: number;
  startScaleY: number;
  startAngle: number;
  startPointerAngle: number;
  startOffsetX: number;
  startOffsetY: number;
}

export function isGizmoObject(obj: object | null | undefined): boolean {
  return !!(obj as { __gizmo?: boolean } | null)?.__gizmo;
}

export class TransformGizmo {
  private readonly root: Phaser.GameObjects.Container;
  private readonly posLayer: Phaser.GameObjects.Container;
  private readonly rotLayer: Phaser.GameObjects.Container;
  private readonly scaleLayer: Phaser.GameObjects.Container;
  private drag: DragState | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getTarget: () => {
      id: string;
      x: number;
      y: number;
    } | null
  ) {
    this.root = scene.add.container(0, 0);
    this.root.setDepth(DEPTH);
    this.posLayer = scene.add.container(0, 0);
    this.rotLayer = scene.add.container(0, 0);
    this.scaleLayer = scene.add.container(0, 0);
    this.root.add([this.posLayer, this.rotLayer, this.scaleLayer]);

    this.posLayer.add([
      this.drawPlane(),
      this.drawArrow(COLOR_X, 0, "move", "x"),
      this.drawArrow(COLOR_Y, 90, "move", "y"),
    ]);
    this.rotLayer.add(this.drawRing());
    this.scaleLayer.add([
      this.drawBox(COLOR_UNI, 0, 0, 16, "scale", "xy"),
      this.drawBox(COLOR_X, ARROW, 0, 12, "scale", "x"),
      this.drawBox(COLOR_Y, 0, ARROW, 12, "scale", "y"),
    ]);

    scene.input.on("pointermove", this.onPointerMove, this);
    scene.input.on("pointerup", this.onPointerUp, this);
  }

  isDragging(): boolean {
    return this.drag !== null;
  }

  destroy() {
    this.scene.input.off("pointermove", this.onPointerMove, this);
    this.scene.input.off("pointerup", this.onPointerUp, this);
    this.scene.input.setDefaultCursor("default");
    this.root.destroy(true);
  }

  refresh() {
    const tool = useEditorStore.getState().transformTool;
    const target = this.getTarget();
    if (!target || tool === "pan") {
      this.root.setVisible(false);
      return;
    }
    this.root.setVisible(true);
    this.root.setPosition(target.x, target.y);
    const zoom = this.scene.cameras.main.zoom || 1;
    this.root.setScale(1 / zoom);
    this.posLayer.setVisible(tool === "position");
    this.rotLayer.setVisible(tool === "rotate");
    this.scaleLayer.setVisible(tool === "scale");
  }

  private drawArrow(color: number, angle: number, kind: HandleKind, axis: TransformAxis) {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(color, 1);
    gfx.fillRect(10, -3, 54, 6);
    gfx.fillTriangle(64, -8, 64, 8, ARROW, 0);
    const wrap = this.scene.add.container(0, 0, [gfx]);
    wrap.setAngle(angle);
    const zone = this.makeHandle(8, -12, 76, 24, kind, axis);
    wrap.add(zone);
    return wrap;
  }

  private drawPlane() {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(COLOR_PLANE, 0.35);
    gfx.fillRect(4, 4, 18, 18);
    gfx.lineStyle(1, COLOR_PLANE, 0.9);
    gfx.strokeRect(4, 4, 18, 18);
    const wrap = this.scene.add.container(0, 0, [gfx]);
    wrap.add(this.makeHandle(2, 2, 22, 22, "move", "xy"));
    return wrap;
  }

  private drawRing() {
    const gfx = this.scene.add.graphics();
    gfx.lineStyle(8, COLOR_ROT, 0.95);
    gfx.strokeCircle(0, 0, RING_RADIUS);
    gfx.fillStyle(COLOR_ROT, 1);
    for (const [x, y] of [
      [RING_RADIUS, 0],
      [0, RING_RADIUS],
      [-RING_RADIUS, 0],
      [0, -RING_RADIUS],
    ] as const) {
      gfx.fillCircle(x, y, 8);
    }
    gfx.setInteractive(
      new Phaser.Geom.Circle(0, 0, RING_HIT_OUTER),
      (_area: Phaser.Geom.Circle, x: number, y: number) => ringContains(x, y)
    );
    tagHandle(gfx as unknown as Handle, "rotate", "xy");
    gfx.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 1) return;
      this.beginDrag(pointer, "rotate", "xy");
    });
    gfx.on("pointerover", () => this.scene.input.setDefaultCursor("grab"));
    gfx.on("pointerout", () => {
      if (!this.drag) this.scene.input.setDefaultCursor("default");
    });
    return gfx;
  }

  private drawBox(
    color: number,
    x: number,
    y: number,
    size: number,
    kind: HandleKind,
    axis: TransformAxis
  ) {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(color, 1);
    gfx.fillRect(-size / 2, -size / 2, size, size);
    gfx.lineStyle(1, 0x111111, 0.6);
    gfx.strokeRect(-size / 2, -size / 2, size, size);
    const wrap = this.scene.add.container(x, y, [gfx]);
    wrap.add(this.makeHandle(-size / 2 - 2, -size / 2 - 2, size + 4, size + 4, kind, axis));
    return wrap;
  }

  private makeHandle(
    x: number,
    y: number,
    w: number,
    h: number,
    kind: HandleKind,
    axis: TransformAxis
  ): Handle {
    const zone = this.scene.add.zone(x + w / 2, y + h / 2, w, h) as Handle;
    zone.setInteractive();
    tagHandle(zone, kind, axis);
    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 1) return;
      this.beginDrag(pointer, kind, axis);
    });
    return zone;
  }

  private beginDrag(
    pointer: Phaser.Input.Pointer,
    kind: HandleKind,
    axis: TransformAxis
  ) {
    const target = this.getTarget();
    if (!target) return;
    const st = useEditorStore.getState();
    const active = st.scenes.find((item) => item.fileName === st.activeFileName);
    const node = active ? findNode(active.scene, target.id) : null;
    if (!node) return;
    const world = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    st.beginInteraction();
    if (kind === "rotate") this.scene.input.setDefaultCursor("grabbing");
    this.drag = {
      kind,
      axis,
      id: target.id,
      originX: target.x,
      originY: target.y,
      startX: node.x ?? target.x,
      startY: node.y ?? target.y,
      startScaleX: node.scaleX ?? 1,
      startScaleY: node.scaleY ?? 1,
      startAngle: node.angle ?? 0,
      startPointerAngle: angleFromPoints(target.x, target.y, world.x, world.y),
      startOffsetX: world.x - target.x,
      startOffsetY: world.y - target.y,
    };
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    const drag = this.drag;
    if (!drag) return;
    const world = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    if (drag.kind === "move") {
      const next = applyAxisDelta(
        drag.startX,
        drag.startY,
        world.x - drag.originX - drag.startOffsetX,
        world.y - drag.originY - drag.startOffsetY,
        drag.axis
      );
      useEditorStore.getState().updateNodeLive(drag.id, {
        x: Math.round(next.x),
        y: Math.round(next.y),
      });
      return;
    }
    if (drag.kind === "rotate") {
      const current = angleFromPoints(drag.originX, drag.originY, world.x, world.y);
      const angle = rotateByDelta(drag.startAngle, drag.startPointerAngle, current);
      useEditorStore.getState().updateNodeLive(drag.id, {
        angle: Math.round(angle * 10) / 10,
      });
      return;
    }
    const next = scaleFromDrag(
      { x: drag.startScaleX, y: drag.startScaleY },
      { x: drag.startOffsetX, y: drag.startOffsetY },
      { x: world.x - drag.originX, y: world.y - drag.originY },
      drag.axis
    );
    useEditorStore.getState().updateNodeLive(drag.id, {
      scaleX: Math.round(next.scaleX * 1000) / 1000,
      scaleY: Math.round(next.scaleY * 1000) / 1000,
    });
  }

  private onPointerUp() {
    this.drag = null;
    this.scene.input.setDefaultCursor("default");
  }
}

function tagHandle(zone: Handle, kind: HandleKind, axis: TransformAxis) {
  zone.__gizmo = true;
  zone.__kind = kind;
  zone.__axis = axis;
}

export function toolAllowsBodyDrag(tool: TransformTool): boolean {
  return tool === "position";
}
