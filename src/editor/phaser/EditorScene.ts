import Phaser from "phaser";
import { GameObjectNode, SceneFile, textureKeyOf } from "../model/types";
import { collectNodeIds } from "../model/sceneTree";
import { useEditorStore } from "../store/store";
import { missingTexturePlaceholderSize } from "../store/sceneAssets";
import { focusCenter, focusZoomForBounds } from "./cameraFocus";
import { setActiveEditorScene } from "./editorController";
import { ignoreOverlayMouseDown } from "./overlayInput";
import { canAcceptTexture, keysNeedingHydration } from "./textureHydrate";
import {
  isGizmoObject,
  toolAllowsBodyDrag,
  TransformGizmo,
} from "./TransformGizmo";

type GO = Phaser.GameObjects.GameObject & {
  x?: number;
  y?: number;
  setScale?: (x: number, y?: number) => any;
  setAngle?: (a: number) => any;
  setAlpha?: (a: number) => any;
  setOrigin?: (x: number, y?: number) => any;
  setVisible?: (v: boolean) => any;
  setDepth?: (d: number) => any;
  setTint?: (c: number) => any;
  setTileScale?: (x: number, y?: number) => any;
  setInteractive?: (...args: any[]) => any;
  disableInteractive?: () => any;
};

interface Tagged extends GO {
  __nodeId?: string;
  __type?: string;
  __prefabId?: string;
  __childSig?: string;
  __childIds?: string[];
  __visualSig?: string;
}

function isContainerLike(node: GameObjectNode): boolean {
  return node.type === "Container" || node.type === "Layer";
}

export class EditorScene extends Phaser.Scene {
  private nodes = new Map<string, Tagged>();
  private rootContainer!: Phaser.GameObjects.Container;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private selectionGfx!: Phaser.GameObjects.Graphics;
  private unsub: (() => void) | null = null;
  private syncQueued = false;
  private hydrating = new Set<string>();
  private pendingImages: HTMLImageElement[] = [];
  private textureGen = 0;
  private destroyed = false;
  private restoreOverlayInput: (() => void) | null = null;
  private gizmo: TransformGizmo | null = null;
  private pan:
    | { startClientX: number; startClientY: number; scrollX: number; scrollY: number }
    | null = null;

  constructor() {
    super("Editor");
  }

  create() {
    this.destroyed = false;
    this.cameras.main.setBackgroundColor("#1e1e2e");
    this.gridGfx = this.add.graphics();
    this.rootContainer = this.add.container(0, 0);
    this.selectionGfx = this.add.graphics();
    this.selectionGfx.setDepth(100000);
    this.input.setTopOnly(true);
    this.gizmo = new TransformGizmo(this, () => {
      const id = useEditorStore.getState().selectedId;
      if (!id) return null;
      const go = this.nodes.get(id);
      if (!go || go.x === undefined || go.y === undefined) return null;
      return { id, x: go.x, y: go.y };
    });

    this.drawGrid();

    this.unsub = useEditorStore.subscribe((state, prev) => {
      if (state.assets !== prev.assets) this.hydrateTextures();
      // Zoom / transform araci tek basina sahneyi yeniden kurmamali.
      const overlayOnly =
        state.activeFileName === prev.activeFileName &&
        state.selectedId === prev.selectedId &&
        state.selectedIds === prev.selectedIds &&
        state.scenes === prev.scenes &&
        state.assets === prev.assets &&
        state.prefabIndex === prev.prefabIndex;
      if (overlayOnly) {
        this.refreshOverlay();
        return;
      }
      this.queueSync();
    });

    this.input.on(
      "drag",
      (_p: Phaser.Input.Pointer, obj: Tagged, dragX: number, dragY: number) => {
        if (isGizmoObject(obj)) return;
        if (!toolAllowsBodyDrag(useEditorStore.getState().transformTool)) return;
        const id = obj.__nodeId;
        if (!id) return;
        obj.x = dragX;
        obj.y = dragY;
        useEditorStore.getState().updateNodeLive(id, {
          x: Math.round(dragX),
          y: Math.round(dragY),
        });
      }
    );

    this.textures.on("addtexture", (key: string) => {
      if (this.destroyed) return;
      this.hydrating.delete(key);
      this.queueSync();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    setActiveEditorScene(this);
    this.restoreOverlayInput = ignoreOverlayMouseDown(this.input.manager);

    // fare tekerlegi ile zoom (isaretci merkezli)
    this.input.on(
      "wheel",
      (
        pointer: Phaser.Input.Pointer,
        _objs: unknown,
        _dx: number,
        dy: number
      ) => {
        const cam = this.cameras.main;
        const old = cam.zoom;
        const factor = dy > 0 ? 0.9 : 1.1;
        const next = Phaser.Math.Clamp(old * factor, 0.1, 6);
        // isaretcinin dünya konumunu koruyarak merkezle
        const worldPoint = pointer.positionToCamera(cam) as Phaser.Math.Vector2;
        cam.setZoom(next);
        const after = pointer.positionToCamera(cam) as Phaser.Math.Vector2;
        cam.scrollX += worldPoint.x - after.x;
        cam.scrollY += worldPoint.y - after.y;
        useEditorStore.getState().setZoom(next);
      }
    );

    this.input.on(
      "pointerdown",
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.some((obj) => isGizmoObject(obj))) return;
        if (over.length === 0) useEditorStore.getState().selectNode(null);
        if (useEditorStore.getState().transformTool === "pan") {
          this.beginPan(pointer);
        }
      }
    );
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.gizmo?.isDragging()) return;
      this.updatePan(pointer);
    });
    this.input.on("pointerup", () => {
      this.pan = null;
    });

    this.hydrateTextures();
    this.syncScene();
    // Sahne + texture'lar create ile ayni anda gelebilir; bir kare sonra tekrar kur.
    this.queueSync();
  }

  refreshPreview() {
    if (this.destroyed) return;
    this.hydrateTextures();
    this.queueSync();
  }

  abortPendingTextures() {
    this.destroyed = true;
    this.textureGen += 1;
    for (const image of this.pendingImages) {
      image.onload = null;
      image.onerror = null;
      image.src = "";
    }
    this.pendingImages = [];
    this.hydrating.clear();
  }

  private shutdown() {
    this.abortPendingTextures();
    this.gizmo?.destroy();
    this.gizmo = null;
    this.restoreOverlayInput?.();
    this.restoreOverlayInput = null;
    this.textures.off("addtexture");
    this.unsub?.();
    this.unsub = null;
    this.syncQueued = false;
  }

  private canHydrate(): boolean {
    return canAcceptTexture({
      destroyed: this.destroyed,
      game: this.game,
    });
  }

  private hydrateTextures() {
    if (!this.canHydrate()) return;
    const assets = useEditorStore.getState().assets;
    const keys = keysNeedingHydration(assets, (key) => {
      return this.textures.exists(key) || this.hydrating.has(key);
    });
    for (const key of keys) {
      const asset = assets.find((a) => a.key === key);
      if (!asset?.base64) continue;
      this.hydrating.add(key);
      this.addTextureFromBase64(key, asset.base64);
    }
  }

  private addTextureFromBase64(key: string, data: string) {
    const gen = this.textureGen;
    const image = new Image();
    this.pendingImages.push(image);
    image.onload = () => {
      this.pendingImages = this.pendingImages.filter((item) => item !== image);
      if (gen !== this.textureGen || !this.canHydrate()) {
        this.hydrating.delete(key);
        return;
      }
      try {
        if (!this.textures.exists(key)) this.textures.addImage(key, image);
      } catch (err) {
        console.warn("[EditorScene] texture add skipped:", key, err);
      }
      this.hydrating.delete(key);
      this.queueSync();
    };
    image.onerror = () => {
      this.pendingImages = this.pendingImages.filter((item) => item !== image);
      this.hydrating.delete(key);
    };
    image.src = data;
  }

  private queueSync() {
    if (this.destroyed || this.syncQueued) return;
    this.syncQueued = true;
    requestAnimationFrame(() => {
      this.syncQueued = false;
      if (this.destroyed || !this.sys || !this.sys.displayList) return;
      this.syncScene();
    });
  }

  private drawGrid() {
    this.gridGfx.clear();
    this.gridGfx.lineStyle(1, 0x333344, 1);
    const w = 4000;
    const h = 4000;
    const step = 32;
    for (let x = -w / 2; x <= w / 2; x += step) {
      this.gridGfx.lineBetween(x, -h / 2, x, h / 2);
    }
    for (let y = -h / 2; y <= h / 2; y += step) {
      this.gridGfx.lineBetween(-w / 2, y, w / 2, y);
    }
  }

  private getActiveScene(): SceneFile | null {
    const st = useEditorStore.getState();
    const sc = st.scenes.find((s) => s.fileName === st.activeFileName);
    return sc ? sc.scene : null;
  }

  syncScene() {
    const scene = this.getActiveScene();
    if (!scene) {
      this.rootContainer.removeAll(true);
      this.nodes.clear();
      this.selectionGfx.clear();
      this.refreshOverlay();
      return;
    }
    try {
      // Ilk kurulumda Layer/Container cocuklari build() ile nodes'a yazilir
      // ama process sadece kokleri present'e eklerdi. Cleanup bu cocuklari
      // hemen silerdi; ilk tiklama sameType dalinda process(list) calistirip
      // prefab'lari yeniden kuruyordu.
      const present = collectNodeIds(scene.displayList);
      const process = (
        nodes: GameObjectNode[],
        parent: Phaser.GameObjects.Container
      ) => {
        for (const node of nodes) {
          present.add(node.id);
          const childSig =
            isContainerLike(node) && node.list
              ? node.list.map((c) => c.id).join(",")
              : "";
          const visualSig = this.visualSignature(node);
          let go = this.nodes.get(node.id);
          const sameType =
            go &&
            go.__type === node.type &&
            (go.__prefabId ?? "") === (node.prefabId ?? "") &&
            (go.__childSig ?? "") === childSig &&
            (go.__visualSig ?? "") === visualSig;

          if (!sameType) {
            if (go) {
              const childIds = go.__childIds || [];
              go.destroy();
              this.nodes.delete(node.id);
              for (const cid of childIds) this.nodes.delete(cid);
              go = undefined;
            }
            try {
              const created = this.build(node, false) as Tagged | null;
              if (created) {
                created.__type = node.type;
                created.__prefabId = node.prefabId ?? "";
                created.__childSig = childSig;
                created.__visualSig = visualSig;
                parent.add(created);
                this.nodes.set(node.id, created);
                go = created;
              }
            } catch (err) {
              console.error("[EditorScene] node build failed:", node.id, node.type, err);
            }
          } else if (go) {
            try {
              this.applyTransform(go, node);
            } catch (err) {
              console.error("[EditorScene] applyTransform failed:", node.id, err);
            }
          }

          if (go && isContainerLike(node) && node.list) {
            process(node.list, go as Phaser.GameObjects.Container);
          }

          // Phaser Container'da son child en ustte cizilir. Hierarchy'deki
          // sirayi render sirasi yap: listede altta olan obje one gelir.
          if (go) parent.bringToTop(go);
        }
      };

      process(scene.displayList, this.rootContainer);

      for (const [id, go] of this.nodes) {
        if (!present.has(id)) {
          go.destroy();
          this.nodes.delete(id);
        }
      }
      this.updateSelection();
      this.applyDragGate();
    } catch (err) {
      console.error("[EditorScene.syncScene] FATAL:", err);
    }
  }

  private build(node: GameObjectNode, renderOnly: boolean, depth = 0): GO | null {
    let go: GO | null = null;
    const childIds: string[] = [];

    if (node.prefabId) {
      if (depth > 20) {
        console.warn("[EditorScene] prefab recursion siniri asildi:", node.prefabId);
        const container = this.add.container(node.x ?? 0, node.y ?? 0);
        container.add(this.add.rectangle(0, 0, 48, 48, 0xffaa00, 0.6));
        go = container;
        this.applyTransform(go, node);
      } else {
        const prefab = useEditorStore
          .getState()
          .prefabIndex.find((p) => p.id === node.prefabId);
        const root = prefab?.scene?.displayList[0];
        const instanceX = node.x ?? root?.x ?? 0;
        const instanceY = node.y ?? root?.y ?? 0;
        const container = this.add.container(instanceX, instanceY);
        if (prefab && prefab.scene) {
          if (root) {
            // Phaser Editor prefab instance override'larini prefab köküne
            // uygula. Aksi halde StreetBg icindeki tum TileSprite'lar,
            // prefab varsayilan texture'i olan bg-sky olarak görünür.
            const previewRoot = this.mergePrefabOverrides(root, node);
            const inner = this.build(previewRoot, true, depth + 1);
            if (inner) container.add(inner);
          }
        } else {
          container.add(this.add.rectangle(0, 0, 48, 48, 0x4488ff, 0.6));
        }
        go = container;
        this.applyTransform(go, node);
      }
    } else {
      go = this.createBase(node);
      if (!go) return null;
      this.applyTransform(go, node);
      if (isContainerLike(node) && node.list) {
        for (const child of node.list) {
          const cgo = this.build(child, renderOnly, depth + 1);
          if (cgo) {
            (go as Phaser.GameObjects.Container).add(cgo);
            childIds.push(child.id);
          }
        }
      }
    }

    if (!renderOnly) {
      const tagged = go as Tagged;
      tagged.__nodeId = node.id;
      (tagged as any).__childIds = childIds;
      this.nodes.set(node.id, tagged);
      this.makeInteractive(go, node);
      go.on("pointerdown", () => {
        useEditorStore.getState().selectNode(node.id);
      });
    }
    return go;
  }

  private mergePrefabOverrides(
    root: GameObjectNode,
    instance: GameObjectNode
  ): GameObjectNode {
    const excluded = new Set([
      "id",
      "type",
      "label",
      "prefabId",
      "unlock",
      "scope",
      "prefabProps",
      "components",
      "list",
      // Instance'in pozisyonu outer preview container'da tutulur.
      "x",
      "y",
    ]);
    const overrides: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(instance)) {
      if (!excluded.has(key)) overrides[key] = value;
    }
    return {
      ...root,
      ...overrides,
      x: 0,
      y: 0,
    };
  }

  // Texture'lar async yuklendigi icin placeholder'in gercek Image/Sprite'a
  // donusmesi gerekir. Bu imza degisince syncScene objeyi yeniden kurar.
  private visualSignature(node: GameObjectNode, depth = 0): string {
    if (depth > 20) return "recursion-limit";

    if (node.prefabId) {
      const prefab = useEditorStore
        .getState()
        .prefabIndex.find((p) => p.id === node.prefabId);
      const root = prefab?.scene?.displayList[0];
      const previewRoot = root
        ? this.mergePrefabOverrides(root, node)
        : null;
      return `prefab:${node.prefabId}:${previewRoot ? this.visualSignature(previewRoot, depth + 1) : "missing"}`;
    }

    const texture = textureKeyOf(node);
    const textureState = texture
      ? this.textures.exists(texture)
        ? "loaded"
        : "missing"
      : "none";
    const children = isContainerLike(node) && node.list
      ? node.list.map((child) => this.visualSignature(child, depth + 1)).join(",")
      : "";
    return `${node.type}|${texture}|${textureState}|${children}`;
  }

  private createBase(node: GameObjectNode): GO | null {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    let go: GO;
    switch (node.type) {
      case "Image":
      case "Sprite": {
        const key = textureKeyOf(node);
        if (key && this.textures.exists(key)) {
          go =
            node.type === "Sprite"
              ? this.add.sprite(x, y, key, node.frame as string)
              : this.add.image(x, y, key, node.frame as string);
        } else {
          go = this.addMissingTexture(x, y, 64, 64);
        }
        break;
      }
      case "TileSprite": {
        const key = textureKeyOf(node);
        const width = Number(node.width) || 64;
        const height = Number(node.height) || 64;
        if (key && this.textures.exists(key)) {
          // Editor onizlemesinde gercek TileSprite kullanma: her katman
          // 2048x1024 fill canvas acar; StreetBg 11 katmanda makineyi kilitler.
          const img = this.add.image(x, y, key, node.frame as string);
          img.setDisplaySize(width, height);
          go = img;
        } else {
          go = this.addMissingTexture(x, y, width, height);
        }
        break;
      }
      case "Text": {
        go = this.add.text(x, y, node.text || "", (node.style as any) || {});
        break;
      }
      case "Container": {
        go = this.add.container(x, y);
        break;
      }
      case "Layer": {
        // Phaser Editor 2D Layer'i editor onizlemesinde Container gibi
        // kullanmak, Layer altindaki prefab instance'larini korur.
        go = this.add.container(x, y);
        break;
      }
      case "Rectangle": {
        go = this.add.rectangle(x, y, 64, 64, 0x44aa88, 1);
        break;
      }
      case "Arc": {
        go = this.add.circle(x, y, 32, 0xaa8844, 1);
        break;
      }
      case "Triangle": {
        go = this.add.triangle(x, y, 0, 32, 16, 0, 32, 32, 0x8844aa, 1);
        break;
      }
      case "Line": {
        go = this.add.line(x, y, 0, 0, 64, 0, 0xffffff, 1);
        break;
      }
      default: {
        go = this.add.rectangle(x, y, 64, 64, 0x888888, 1);
      }
    }
    return go;
  }

  private addMissingTexture(x: number, y: number, width: number, height: number): GO {
    const size = missingTexturePlaceholderSize(width, height);
    return this.add.rectangle(x, y, size.width, size.height, 0xff3399, 0.5);
  }

  private applyTransform(go: GO, node: GameObjectNode) {
    go.x = node.x ?? 0;
    go.y = node.y ?? 0;
    if (go.setScale && node.scaleX !== undefined)
      go.setScale(node.scaleX ?? 1, node.scaleY ?? 1);
    if (go.setAngle) go.setAngle(node.angle ?? 0);
    if (go.setAlpha && node.alpha !== undefined) go.setAlpha(node.alpha ?? 1);
    if (go.setOrigin && node.originX !== undefined)
      go.setOrigin(node.originX ?? 0.5, node.originY ?? 0.5);
    if (go.setVisible && node.visible !== undefined)
      go.setVisible(node.visible !== false);
    if (go.setDepth && node.depth !== undefined) go.setDepth(node.depth ?? 0);
    if (go.setTint && node.tint !== undefined) go.setTint(node.tint as number);
    if (go.setTileScale && (node.tileScaleX !== undefined || node.tileScaleY !== undefined)) {
      go.setTileScale(
        Number(node.tileScaleX) || 1,
        Number(node.tileScaleY) || 1
      );
    }
  }

  private makeInteractive(go: GO, node: GameObjectNode) {
    if (!go.setInteractive) return;
    try {
      if (isContainerLike(node) || node.prefabId) {
        const b = (go as Phaser.GameObjects.Container).getBounds();
        const w = Math.max(b.width, 8);
        const h = Math.max(b.height, 8);
        go.setInteractive(
          new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
          Phaser.Geom.Rectangle.Contains
        );
      } else {
        go.setInteractive();
      }
      this.input.setDraggable(go as any);
      go.on("dragstart", () => {
        useEditorStore.getState().beginInteraction();
      });
    } catch {
      /* yoksay */
    }
  }

  private updateSelection() {
    this.selectionGfx.clear();
    const st = useEditorStore.getState();
    const ids = st.selectedIds.length
      ? st.selectedIds
      : st.selectedId
        ? [st.selectedId]
        : [];
    if (ids.length > 0) {
      this.selectionGfx.lineStyle(2, 0x00ffcc, 1);
      for (const id of ids) {
        const go = this.nodes.get(id);
        if (!go) continue;
        const b = (go as any).getBounds
          ? (go as Phaser.GameObjects.Container).getBounds()
          : new Phaser.Geom.Rectangle(go.x, go.y, 10, 10);
        this.selectionGfx.strokeRect(b.x, b.y, b.width, b.height);
      }
    }
    this.refreshOverlay();
  }

  private refreshOverlay() {
    this.gizmo?.refresh();
    this.applyDragGate();
  }

  private applyDragGate() {
    const allow = toolAllowsBodyDrag(useEditorStore.getState().transformTool);
    for (const go of this.nodes.values()) {
      if (go.input) go.input.draggable = allow;
    }
  }

  private beginPan(pointer: Phaser.Input.Pointer) {
    const event = pointer.event as MouseEvent | undefined;
    if (!event) return;
    this.pan = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      scrollX: this.cameras.main.scrollX,
      scrollY: this.cameras.main.scrollY,
    };
  }

  private updatePan(pointer: Phaser.Input.Pointer) {
    if (!this.pan) return;
    const event = pointer.event as MouseEvent | undefined;
    if (!event) return;
    const zoom = this.cameras.main.zoom || 1;
    this.cameras.main.scrollX =
      this.pan.scrollX - (event.clientX - this.pan.startClientX) / zoom;
    this.cameras.main.scrollY =
      this.pan.scrollY - (event.clientY - this.pan.startClientY) / zoom;
  }

  focusNode(id: string) {
    const go = this.nodes.get(id);
    if (!go) return;
    const b = (go as any).getBounds
      ? (go as Phaser.GameObjects.Container).getBounds()
      : new Phaser.Geom.Rectangle(go.x ?? 0, go.y ?? 0, 64, 64);
    const width = Math.max(b.width, 8);
    const height = Math.max(b.height, 8);
    const cam = this.cameras.main;
    const zoom = focusZoomForBounds(width, height, cam.width, cam.height);
    const center = focusCenter({ x: b.x, y: b.y, width, height });
    cam.setZoom(zoom);
    cam.centerOn(center.x, center.y);
    useEditorStore.getState().setZoom(zoom);
    this.updateSelection();
  }

  zoomIn() {
    this.applyZoom(this.cameras.main.zoom * 1.2);
  }

  zoomOut() {
    this.applyZoom(this.cameras.main.zoom * 0.8);
  }

  zoomReset() {
    this.applyZoom(1);
  }

  private applyZoom(next: number) {
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(next, 0.1, 6));
    useEditorStore.getState().setZoom(cam.zoom);
  }
}
