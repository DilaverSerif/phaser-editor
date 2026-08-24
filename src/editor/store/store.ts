import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { v4 as uuidv4 } from "uuid";
import {
  GameObjectNode,
  SceneFile,
  SceneType,
  textureKeyOf,
} from "../model/types";
import {
  classNameFromFileName,
  defaultNode,
  deserializeScene,
  serializeScene,
} from "../serialization";
import { PrefabIndexEntry } from "../serialization";
import { collectRequiredTextureKeys, parseAssetPack } from "./sceneAssets";
import {
  extractNodesByIds,
  findNodeLocation,
  pruneNestedSelection,
  rangeSelectIds,
} from "../model/sceneTree";
import {
  arcadeDefaults,
  arcadeKeysOf,
  createFilter,
  FILTER_TYPES,
  hasArcade,
  hasHitArea,
  hitAreaDefaults,
  hitAreaKeysOf,
  nodeFilters,
  type PhaserFilterType,
} from "../model/phaserComponents";
import type { TransformTool } from "../model/transformGizmo";
import { getActiveEditorScene } from "../phaser/editorController";
import {
  cloneSpriteAnims,
  matchSpriteAnims,
  parseSpriteAnimsJson,
  patchAnimClip,
  serializeSpriteAnims,
  type SpriteAnimClip,
  type SpriteAnimsFile,
  type SpriteAnimsSource,
} from "../model/spriteAnims";

export interface AnimsWorking {
  path: string;
  fileName: string;
  data: SpriteAnimsFile;
  lastSaved: string;
  dirty: boolean;
}

export interface AssetEntry {
  key: string;
  path: string; // proje icinde relatif yol
  base64?: string;
}

export interface ProjectFileEntry {
  fileName: string;
  path: string; // tam yol
  sceneType: SceneType;
}

export interface SceneHistory {
  past: string[];
  future: string[];
}

export interface OpenScene {
  fileName: string; // ornek: Level.scene
  path: string; // tam dosya yolu (kaydetmede kullanilir)
  scene: SceneFile;
  dirty: boolean;
  lastSaved: string;
  history: SceneHistory;
}

interface EditorState {
  projectPath: string | null;
  scenes: OpenScene[];
  activeFileName: string | null;
  selectedId: string | null;
  selectedIds: string[];
  selectionAnchorId: string | null;
  zoom: number;
  transformTool: TransformTool;
  prefabIndex: PrefabIndexEntry[];
  assets: AssetEntry[];
  projectFiles: ProjectFileEntry[];
  spriteAnims: SpriteAnimsSource[];
  animsWorking: AnimsWorking | null;

  // actions
  openProject: (path: string) => Promise<void>;
  refreshProjectFiles: () => Promise<void>;
  newScene: (name: string, type: SceneType) => void;
  openSceneFile: (fileName: string) => Promise<void>;
  openScenePath: (path: string) => Promise<void>;
  loadSceneAssets: (scene: SceneFile) => Promise<void>;
  saveActiveScene: () => Promise<void>;
  saveScene: (fileName: string) => Promise<void>;
  saveAllDirtyScenes: () => Promise<void>;
  saveActiveSceneAs: (fileName: string) => Promise<void>;
  revertActiveScene: () => void;
  setActiveScene: (fileName: string) => void;
  closeScene: (fileName: string) => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;

  selectNode: (
    id: string | null,
    opts?: { shift?: boolean; visibleIds?: string[] }
  ) => void;
  createLayer: () => void;
  groupSelectionInLayer: () => void;
  setZoom: (z: number) => void;
  setTransformTool: (tool: TransformTool) => void;
  addNode: (type: string, parentId?: string) => void;
  addPhaserComponent: (id: string, kind: import("../model/phaserComponents").PhaserAddableKind) => void;
  removePhaserComponent: (
    id: string,
    kind: "arcade" | "hitArea" | { filterId: string }
  ) => void;
  updateNode: (id: string, patch: Partial<GameObjectNode>) => void;
  updateNodeLive: (id: string, patch: Partial<GameObjectNode>) => void;
  beginInteraction: () => void;
  removeNode: (id: string) => void;

  createPrefabFromSelection: (name: string) => Promise<void>;
  instantiatePrefab: (prefabId: string, x: number, y: number) => void;

  addAsset: (key: string, path: string) => void;
  setAssetBase64: (key: string, base64: string) => void;

  undo: () => void;
  redo: () => void;

  syncAnimsWorking: () => void;
  updateAnimClip: (clipIndex: number, patch: Partial<SpriteAnimClip>) => void;
  saveSpriteAnims: () => Promise<void>;
}

// --- yardimcilar ---

export function findNode(
  scene: SceneFile,
  id: string
): GameObjectNode | null {
  const stack: GameObjectNode[] = [...scene.displayList];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.id === id) return n;
    if (n.list) stack.push(...n.list);
  }
  return null;
}

function removeNodeRec(
  list: GameObjectNode[],
  id: string
): boolean {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list.splice(i, 1);
      return true;
    }
    if (list[i].list && removeNodeRec(list[i].list!, id)) return true;
  }
  return false;
}

function getActiveScene(state: EditorState): OpenScene | undefined {
  return state.scenes.find((s) => s.fileName === state.activeFileName);
}

function snapshot(scene: SceneFile): string {
  return serializeScene(scene);
}

function emptyHistory(): SceneHistory {
  return { past: [], future: [] };
}

function markSceneDirty(sc: OpenScene) {
  sc.dirty = snapshot(sc.scene) !== sc.lastSaved;
}

function pushHistory(sc: OpenScene, snap: string) {
  sc.history.past.push(snap);
  if (sc.history.past.length > 100) sc.history.past.shift();
  sc.history.future = [];
}

export function hasDirtyScenes(state: {
  scenes: OpenScene[];
  animsWorking?: AnimsWorking | null;
}): boolean {
  return state.scenes.some((scene) => scene.dirty) || !!state.animsWorking?.dirty;
}

function selectOnly(
  s: Pick<EditorState, "selectedId" | "selectedIds" | "selectionAnchorId">,
  id: string | null
) {
  s.selectedId = id;
  s.selectedIds = id ? [id] : [];
  s.selectionAnchorId = id;
}

function canAcceptChildren(node: GameObjectNode): boolean {
  return node.type === "Container" || node.type === "Layer";
}

function animHints(state: EditorState) {
  const active = getActiveScene(state);
  const selected =
    active && state.selectedId ? findNode(active.scene, state.selectedId) : null;
  const prefab = selected?.prefabId
    ? state.prefabIndex.find((item) => item.id === selected.prefabId)
    : active?.scene.sceneType === "PREFAB"
      ? state.prefabIndex.find((item) => item.fileName === active.fileName)
      : undefined;
  const root =
    prefab?.scene?.displayList[0] ??
    (active?.scene.sceneType === "PREFAB" ? active.scene.displayList[0] : null);
  const node = selected ?? root ?? undefined;
  return {
    fileName: prefab?.fileName ?? active?.fileName ?? undefined,
    className: prefab?.className,
    label: node?.label,
    textureKey: node ? textureKeyOf(node) : undefined,
  };
}

function bindAnimsWorking(state: EditorState) {
  const match = matchSpriteAnims(animHints(state), state.spriteAnims);
  if (!match) {
    if (state.animsWorking && !state.animsWorking.dirty) state.animsWorking = null;
    return;
  }
  if (state.animsWorking?.path === match.path) return;
  if (state.animsWorking?.dirty) return;
  state.animsWorking = {
    path: match.path,
    fileName: match.fileName,
    data: cloneSpriteAnims(match.data),
    lastSaved: serializeSpriteAnims(match.data),
    dirty: false,
  };
}

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    projectPath: null,
    scenes: [],
    activeFileName: null,
    selectedId: null,
    selectedIds: [],
    selectionAnchorId: null,
    zoom: 1,
    transformTool: "position",
    prefabIndex: [],
    assets: [],
    projectFiles: [],
    spriteAnims: [],
    animsWorking: null,

    openProject: async (path) => {
      set((s) => {
        s.projectPath = path;
        s.scenes = [];
        s.activeFileName = null;
        s.selectedId = null;
        s.selectedIds = [];
        s.selectionAnchorId = null;
        s.spriteAnims = [];
        s.animsWorking = null;
      });
      await get().refreshProjectFiles();
    },

    refreshProjectFiles: async () => {
      const api = (window as any).editor as
        | import("../../../electron/preload").EditorApi
        | undefined;
      const root = get().projectPath;
      if (!api || !root) return;
      const prefabs: PrefabIndexEntry[] = [];
      const projectFiles: ProjectFileEntry[] = [];
      const spriteAnims: SpriteAnimsSource[] = [];
      const assetMap = new Map<string, AssetEntry>();
      let hasAssetPack = false;

      // KuchoVector gibi projelerde node_modules/android/public icindeki
      // binlerce dosyayi taramak yerine bilinen generated klasorleri atla.
      const skippedDirectories = new Set([
        "node_modules",
        ".git",
        ".gradle",
        ".idea",
        "dist",
        "build",
        "android",
        "ios",
      ]);

      // Asset pack'i once oku. Base64 yuklemesi daha sonra, aktif sahne icin
      // gereken texture'larla sinirli yapilacak.
      const packPath = `${root}/asset-pack.json`;
      try {
        const packContent = (await api.readFile(packPath)) as string;
        if (typeof packContent === "string") {
          const parsed = parseAssetPack(JSON.parse(packContent), root);
          for (const asset of parsed) {
            assetMap.set(asset.key, asset);
            hasAssetPack = true;
          }
        }
      } catch {
        /* asset pack opsiyoneldir */
      }

      const scan = async (dir: string, rel: string) => {
        const res = await api.readDir(dir);
        if (!res || (res as any).error) return;
        for (const e of res as Array<{ name: string; isDirectory: boolean }>) {
          const full = `${dir}/${e.name}`;
          const r = rel ? `${rel}/${e.name}` : e.name;
          if (e.isDirectory) {
            if (skippedDirectories.has(e.name)) continue;
            await scan(full, r);
          } else if (e.name.toLowerCase().endsWith(".scene") || e.name.toLowerCase().endsWith(".prefab")) {
            const content = (await api.readFile(full)) as string;
            let sf: SceneFile | null = null;
            try {
              sf = deserializeScene(content, e.name);
            } catch {
              /* bozuk dosya, yoksay */
            }
            if (!sf) continue;
            projectFiles.push({
              fileName: e.name,
              path: full,
              sceneType: sf.sceneType,
            });
            if (sf.sceneType === "PREFAB") {
              prefabs.push({
                id: sf.id,
                fileName: e.name,
                className: classNameFromFileName(e.name),
                filePath: full,
                scene: sf,
              });
            }
          } else if (e.name.toLowerCase().endsWith("-anims.json")) {
            const content = (await api.readFile(full)) as string;
            if (typeof content !== "string") continue;
            const data = parseSpriteAnimsJson(content);
            if (data) spriteAnims.push({ path: full, fileName: e.name, data });
          } else if (/\.(png|jpe?g|webp|gif)$/i.test(e.name)) {
            // Asset pack varsa key bilgisi pack'ten gelmelidir. Pack olmayan
            // projelerde relatif dosya yolu fallback olarak kullanilir.
            if (!hasAssetPack && !assetMap.has(r))
              assetMap.set(r, { key: r, path: full });
          }
        }
      };

      await scan(root, "");

      const assets = [...assetMap.values()];

      set((s) => {
        s.prefabIndex = prefabs;
        s.projectFiles = projectFiles;
        s.assets = assets;
        s.spriteAnims = spriteAnims;
        if (s.animsWorking && !s.animsWorking.dirty) {
          const fresh = spriteAnims.find((item) => item.path === s.animsWorking!.path);
          if (fresh) {
            s.animsWorking.data = cloneSpriteAnims(fresh.data);
            s.animsWorking.lastSaved = serializeSpriteAnims(fresh.data);
            s.animsWorking.dirty = false;
          }
        }
        bindAnimsWorking(s);
      });
    },

    newScene: (name, type) => {
      const fileName = name.endsWith(".scene")
        ? name
        : name.endsWith(".prefab")
        ? name
        : `${name}.${type === "PREFAB" ? "prefab" : "scene"}`;
      const scene = {
        id: uuidv4(),
        sceneType: type,
        settings: {
          exportClass: true,
          autoImport: true,
          preloadMethodName: "",
          preloadPackFiles: [],
          createMethodName: "",
          compilerOutputLanguage: "TYPE_SCRIPT",
          borderWidth: 1280,
          borderHeight: 720,
        },
        displayList: [],
        plainObjects: [],
        meta: {
          app: "Phaser Editor (custom)",
          url: "https://phasereditor2d.com",
          contentType: "phasereditor2d.core.scene.SceneContentType",
          version: 3,
        },
      } as SceneFile;
      if (type === "PREFAB") scene.prefabProperties = [];
      set((s) => {
        const path = `${get().projectPath}/${fileName}`;
        s.scenes.push({
          fileName,
          path,
          scene,
          dirty: true,
          lastSaved: "",
          history: emptyHistory(),
        });
        s.activeFileName = fileName;
        selectOnly(s, null);
        bindAnimsWorking(s);
      });
    },

    openSceneFile: async (fileName) => {
      const entry = get().projectFiles.find((p) => p.fileName === fileName);
      if (!entry) return;
      await get().openScenePath(entry.path);
    },

    openScenePath: async (path) => {
      const api = (window as any).editor as
        | import("../../../electron/preload").EditorApi
        | undefined;
      const root = get().projectPath;
      if (!api || !root) return;
      const fileName = path.split("/").pop()!;
      // zaten aciksa sadece aktif yap
      if (get().scenes.some((s) => s.path === path)) {
        set((s) => {
          s.activeFileName = fileName;
          selectOnly(s, null);
          bindAnimsWorking(s);
        });
        const opened = get().scenes.find((s) => s.path === path);
        getActiveEditorScene()?.refreshPreview();
        if (opened) void get().loadSceneAssets(opened.scene);
        return;
      }
      const content = (await api.readFile(path)) as string;
      const scene = deserializeScene(content, fileName);
      set((s) => {
        s.scenes.push({
          fileName,
          path,
          scene,
          dirty: false,
          lastSaved: snapshot(scene),
          history: emptyHistory(),
        });
        s.activeFileName = fileName;
        selectOnly(s, null);
        bindAnimsWorking(s);
      });
      // Sahneyi hemen ac; asset'leri bekletmeden arka planda yukle.
      getActiveEditorScene()?.refreshPreview();
      void get().loadSceneAssets(scene);
    },

    loadSceneAssets: async (scene) => {
      const api = (window as any).editor as
        | import("../../../electron/preload").EditorApi
        | undefined;
      if (!api) return;

      const state = get();
      const required = new Set(collectRequiredTextureKeys(scene, state.prefabIndex));

      const pending = state.assets.filter((a) => required.has(a.key) && !a.base64);
      const loaded = await Promise.all(
        pending.map(async (asset) => {
          try {
            const value = (await api.readAsset(asset.path)) as string;
            return typeof value === "string" && value.startsWith("data:")
              ? { key: asset.key, base64: value }
              : null;
          } catch {
            return null;
          }
        })
      );

      set((s) => {
        for (const item of loaded) {
          if (!item) continue;
          const asset = s.assets.find((a) => a.key === item.key);
          if (asset) asset.base64 = item.base64;
        }
      });
      getActiveEditorScene()?.refreshPreview();
    },

    saveActiveScene: async () => {
      const active = getActiveScene(get());
      if (active) await get().saveScene(active.fileName);
      await get().saveSpriteAnims();
    },

    saveScene: async (fileName) => {
      const api = (window as any).editor as
        | import("../../../electron/preload").EditorApi
        | undefined;
      const target = get().scenes.find((x) => x.fileName === fileName);
      if (!api || !target) return;
      const serialized = snapshot(target.scene);
      await api.writeFile(target.path, serialized);
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === fileName);
        if (!sc) return;
        sc.lastSaved = serialized;
        sc.dirty = false;
      });
      await get().refreshProjectFiles();
    },

    saveAllDirtyScenes: async () => {
      for (const scene of get().scenes.filter((item) => item.dirty)) {
        await get().saveScene(scene.fileName);
      }
      await get().saveSpriteAnims();
    },

    saveActiveSceneAs: async (fileName) => {
      const active = getActiveScene(get());
      if (!active) return;
      const newScene: OpenScene = {
        ...active,
        fileName,
        path: `${get().projectPath}/${fileName}`,
        dirty: true,
        lastSaved: "",
        history: emptyHistory(),
      };
      set((s) => {
        s.scenes.push(newScene);
        s.activeFileName = fileName;
      });
      await get().saveActiveScene();
    },

    revertActiveScene: () => {
      const active = getActiveScene(get());
      if (!active || !active.lastSaved) return;
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName);
        if (!sc || !sc.lastSaved) return;
        sc.scene = deserializeScene(sc.lastSaved, sc.fileName);
        sc.history = emptyHistory();
        sc.dirty = false;
        selectOnly(s, null);
      });
      getActiveEditorScene()?.refreshPreview();
    },

    setActiveScene: (fileName) => {
      set((s) => {
        s.activeFileName = fileName;
        selectOnly(s, null);
        bindAnimsWorking(s);
      });
      getActiveEditorScene()?.refreshPreview();
      const opened = get().scenes.find((s) => s.fileName === fileName);
      if (opened) void get().loadSceneAssets(opened.scene);
    },

    closeScene: (fileName) => {
      set((s) => {
        s.scenes = s.scenes.filter((x) => x.fileName !== fileName);
        if (s.activeFileName === fileName)
          s.activeFileName = s.scenes[0]?.fileName ?? null;
        bindAnimsWorking(s);
      });
      getActiveEditorScene()?.refreshPreview();
    },

    reorderScenes: (fromIndex, toIndex) =>
      set((s) => {
        if (
          fromIndex === toIndex ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= s.scenes.length ||
          toIndex > s.scenes.length
        ) {
          return;
        }
        const next = s.scenes.slice();
        const [item] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, item);
        s.scenes = next;
      }),

    selectNode: (id, opts) =>
      set((s) => {
        if (!id) {
          s.selectedId = null;
          s.selectedIds = [];
          s.selectionAnchorId = null;
          bindAnimsWorking(s);
          return;
        }
        if (opts?.shift && s.selectionAnchorId && opts.visibleIds?.length) {
          s.selectedIds = rangeSelectIds(opts.visibleIds, s.selectionAnchorId, id);
          s.selectedId = id;
          bindAnimsWorking(s);
          return;
        }
        s.selectedId = id;
        s.selectedIds = [id];
        s.selectionAnchorId = id;
        bindAnimsWorking(s);
      }),

    createLayer: () => {
      const active = getActiveScene(get());
      if (!active) return;
      const snap = snapshot(active.scene);
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName)!;
        pushHistory(sc, snap);
        const count = sc.scene.displayList.filter((n) => n.type === "Layer").length + 1;
        const layer = defaultNode("Layer", `Layer_${count}`);
        sc.scene.displayList.push(layer);
        markSceneDirty(sc);
        selectOnly(s, layer.id);
      });
    },

    groupSelectionInLayer: () => {
      const active = getActiveScene(get());
      if (!active) return;
      const selectedId = get().selectedId;
      const raw = get().selectedIds.length
        ? get().selectedIds
        : selectedId
          ? [selectedId]
          : [];
      const ids = pruneNestedSelection(active.scene.displayList, raw);
      if (ids.length === 0) return;
      const snap = snapshot(active.scene);
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName)!;
        pushHistory(sc, snap);
        const idSet = new Set(ids);
        const first = findNodeLocation(sc.scene.displayList, ids[0]);
        const insertList = first?.list ?? sc.scene.displayList;
        const rawIndex = first?.index ?? sc.scene.displayList.length;
        const beforeCount = first
          ? insertList.slice(0, rawIndex).filter((n) => idSet.has(n.id)).length
          : 0;
        const moved = extractNodesByIds(sc.scene.displayList, idSet);
        if (moved.length === 0) return;
        const count = sc.scene.displayList.filter((n) => n.type === "Layer").length + 1;
        const layer = defaultNode("Layer", `Layer_${count}`);
        layer.list = moved;
        const index = Math.min(Math.max(0, rawIndex - beforeCount), insertList.length);
        insertList.splice(index, 0, layer);
        markSceneDirty(sc);
        selectOnly(s, layer.id);
      });
    },

    setZoom: (z) =>
      set((s) => {
        s.zoom = Math.max(0.1, Math.min(6, z));
      }),

    setTransformTool: (tool) =>
      set((s) => {
        s.transformTool = tool;
      }),

    addPhaserComponent: (id, kind) => {
      const active = getActiveScene(get());
      if (!active) return;
      const snap = snapshot(active.scene);
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName)!;
        const node = findNode(sc.scene, id);
        if (!node) return;
        if (kind === "arcade") {
          if (hasArcade(node)) return;
          pushHistory(sc, snap);
          Object.assign(node, arcadeDefaults());
        } else if (kind === "hitArea") {
          if (hasHitArea(node)) return;
          pushHistory(sc, snap);
          Object.assign(node, hitAreaDefaults());
        } else if (FILTER_TYPES.includes(kind as PhaserFilterType)) {
          pushHistory(sc, snap);
          const filters = nodeFilters(node);
          node.filters = [...filters, createFilter(kind as PhaserFilterType)];
        } else {
          return;
        }
        markSceneDirty(sc);
      });
    },

    removePhaserComponent: (id, kind) => {
      const active = getActiveScene(get());
      if (!active) return;
      const snap = snapshot(active.scene);
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName)!;
        const node = findNode(sc.scene, id);
        if (!node) return;
        pushHistory(sc, snap);
        if (kind === "arcade") {
          for (const key of arcadeKeysOf(node)) delete node[key];
        } else if (kind === "hitArea") {
          for (const key of hitAreaKeysOf(node)) delete node[key];
        } else {
          node.filters = nodeFilters(node).filter((item) => item.id !== kind.filterId);
        }
        markSceneDirty(sc);
      });
    },

    addNode: (type, parentId) => {
      const active = getActiveScene(get());
      if (!active) return;
      const label = `${type}_${(active.scene.displayList.length + 1)}`;
      const node = defaultNode(type, label);
      const snap = snapshot(active.scene);
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName)!;
        pushHistory(sc, snap);
        if (parentId) {
          const parent = findNode(sc.scene, parentId);
          if (parent && canAcceptChildren(parent)) {
            parent.list = parent.list || [];
            parent.list.push(node);
          } else {
            sc.scene.displayList.push(node);
          }
        } else {
          sc.scene.displayList.push(node);
        }
        markSceneDirty(sc);
        selectOnly(s, node.id);
      });
    },

    updateNode: (id, patch) => {
      const active = getActiveScene(get());
      if (!active) return;
      const snap = snapshot(active.scene);
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName)!;
        const node = findNode(sc.scene, id);
        if (!node) return;
        pushHistory(sc, snap);
        Object.assign(node, patch);
        markSceneDirty(sc);
      });
    },

    beginInteraction: () => {
      const active = getActiveScene(get());
      if (!active) return;
      const snap = snapshot(active.scene);
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName);
        if (!sc) return;
        pushHistory(sc, snap);
      });
    },

    updateNodeLive: (id, patch) => {
      const active = getActiveScene(get());
      if (!active) return;
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName)!;
        const node = findNode(sc.scene, id);
        if (!node) return;
        Object.assign(node, patch);
        markSceneDirty(sc);
      });
    },

    removeNode: (id) => {
      const active = getActiveScene(get());
      if (!active) return;
      const snap = snapshot(active.scene);
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName)!;
        pushHistory(sc, snap);
        removeNodeRec(sc.scene.displayList, id);
        s.selectedIds = s.selectedIds.filter((x) => x !== id);
        if (s.selectedId === id) s.selectedId = s.selectedIds[0] ?? null;
        if (s.selectionAnchorId === id) s.selectionAnchorId = s.selectedId;
        markSceneDirty(sc);
      });
    },

    createPrefabFromSelection: async (name) => {
      const active = getActiveScene(get());
      const selId = get().selectedId;
      if (!active || !selId) return;
      const node = findNode(active.scene, selId);
      if (!node) return;

      const className = name;
      const fileName = `${name}.prefab`;
      const prefabScene: SceneFile = {
        id: uuidv4(),
        sceneType: "PREFAB",
        settings: {
          exportClass: true,
          autoImport: true,
          preloadMethodName: "",
          preloadPackFiles: [],
          createMethodName: "",
          compilerOutputLanguage: "TYPE_SCRIPT",
          borderWidth: 1280,
          borderHeight: 720,
        },
        displayList: [JSON.parse(JSON.stringify(node))],
        plainObjects: [],
        meta: {
          app: "Phaser Editor (custom)",
          url: "https://phasereditor2d.com",
          contentType: "phasereditor2d.core.scene.SceneContentType",
          version: 3,
        },
        prefabProperties: [],
      };
      // aktif sahnedeki ogeyi prefab instance'a cevir
      const instanceNode: GameObjectNode = {
        id: uuidv4(),
        type: node.type,
        label: className,
        prefabId: prefabScene.id,
        prefabName: className,
        x: node.x ?? 0,
        y: node.y ?? 0,
        unlock: [],
      };
      const snap = snapshot(active.scene);
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName)!;
        pushHistory(sc, snap);
        // orijinal node'u instance ile degistir
        const replace = (list: GameObjectNode[]): boolean => {
          for (let i = 0; i < list.length; i++) {
            if (list[i].id === selId) {
              list[i] = instanceNode;
              return true;
            }
            if (list[i].list && replace(list[i].list!)) return true;
          }
          return false;
        };
        replace(sc.scene.displayList);
        markSceneDirty(sc);
        selectOnly(s, instanceNode.id);
        const prefabPath = `${s.projectPath}/prefabs/${fileName}`;
        if (!s.scenes.some((item) => item.fileName === fileName)) {
          s.scenes.push({
            fileName,
            path: prefabPath,
            scene: prefabScene,
            dirty: true,
            lastSaved: "",
            history: emptyHistory(),
          });
        }
        if (!s.prefabIndex.some((item) => item.id === prefabScene.id)) {
          s.prefabIndex.push({
            id: prefabScene.id,
            fileName,
            className,
            filePath: prefabPath,
            scene: prefabScene,
          });
        }
      });
    },

    instantiatePrefab: (prefabId, x, y) => {
      const active = getActiveScene(get());
      if (!active) return;
      const entry = get().prefabIndex.find((p) => p.id === prefabId);
      if (!entry) return;
      const node: GameObjectNode = {
        id: uuidv4(),
        type: "", // prefab instance tipi bilinmeyebilir; derlemede prefabName kullanilir
        label: entry.className,
        prefabId: entry.id,
        prefabName: entry.className,
        x,
        y,
        unlock: [],
      };
      const snap = snapshot(active.scene);
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName)!;
        pushHistory(sc, snap);
        sc.scene.displayList.push(node);
        markSceneDirty(sc);
        selectOnly(s, node.id);
      });
    },

    addAsset: (key, path) =>
      set((s) => {
        if (!s.assets.find((a) => a.key === key))
          s.assets.push({ key, path });
      }),

    setAssetBase64: (key, base64) =>
      set((s) => {
        const a = s.assets.find((x) => x.key === key);
        if (a) a.base64 = base64;
      }),

    syncAnimsWorking: () => set((s) => void bindAnimsWorking(s)),

    updateAnimClip: (clipIndex, patch) =>
      set((s) => {
        const working = s.animsWorking;
        if (!working || !working.data.anims[clipIndex]) return;
        working.data = patchAnimClip(working.data, clipIndex, patch);
        working.dirty = serializeSpriteAnims(working.data) !== working.lastSaved;
      }),

    saveSpriteAnims: async () => {
      const api = (window as any).editor as
        | import("../../../electron/preload").EditorApi
        | undefined;
      const working = get().animsWorking;
      if (!api || !working?.dirty) return;
      const serialized = serializeSpriteAnims(working.data);
      await api.writeFile(working.path, serialized);
      set((s) => {
        if (!s.animsWorking || s.animsWorking.path !== working.path) return;
        s.animsWorking.lastSaved = serialized;
        s.animsWorking.dirty = false;
        const listed = s.spriteAnims.find((item) => item.path === working.path);
        if (listed) listed.data = s.animsWorking.data;
      });
    },

    undo: () => {
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName);
        if (!sc || sc.history.past.length === 0) return;
        const prev = sc.history.past.pop()!;
        sc.history.future.push(snapshot(sc.scene));
        sc.scene = deserializeScene(prev, sc.fileName);
        markSceneDirty(sc);
      });
    },

    redo: () => {
      set((s) => {
        const sc = s.scenes.find((x) => x.fileName === s.activeFileName);
        if (!sc || sc.history.future.length === 0) return;
        const next = sc.history.future.pop()!;
        sc.history.past.push(snapshot(sc.scene));
        sc.scene = deserializeScene(next, sc.fileName);
        markSceneDirty(sc);
      });
    },
  }))
);

export function activeSceneFile(state: EditorState): OpenScene | undefined {
  return state.scenes.find((s) => s.fileName === state.activeFileName);
}
