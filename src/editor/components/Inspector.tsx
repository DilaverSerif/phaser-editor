import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useEditorStore, findNode } from "../store/store";
import { textureKeyOf, withTextureKey } from "../model/types";
import type { GameObjectNode, PrefabProperty } from "../model/types";
import {
  FILTER_TYPES,
  hasArcade,
  hasHitArea,
  nodeFilters,
  type PhaserAddableKind,
} from "../model/phaserComponents";
import {
  hasSpriteSection,
  hasTextSection,
  inspectorComponentName,
  inspectorObjectTitle,
  isPrefabOverride,
  prefabPropertyValue,
  prefabUserProperties,
} from "./inspectorModel";
import { ArcadeSection, FilterSection, HitAreaSection } from "./InspectorComponents";

function foldIcon(open: boolean) {
  return open ? "▾" : "▸";
}

function InspectorFold({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="u-comp">
      <button type="button" className="u-comp-head" onClick={onToggle}>
        <span className="u-comp-caret">{foldIcon(open)}</span>
        <span className="u-comp-title">{title}</span>
      </button>
      {open && <div className="u-comp-body">{children}</div>}
    </section>
  );
}

function AxisField({
  axis,
  value,
  step,
  override,
  onCommit,
  onBegin,
  onLive,
}: {
  axis: "x" | "y";
  value: number | undefined;
  step: number;
  override?: boolean;
  onCommit: (v: number) => void;
  onBegin: () => void;
  onLive: (v: number) => void;
}) {
  const drag = useRef<{ x: number; value: number } | null>(null);
  const current = value ?? 0;

  const startScrub = (event: PointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onBegin();
    drag.current = { x: event.clientX, value: current };
  };
  const moveScrub = (event: PointerEvent<HTMLSpanElement>) => {
    if (!drag.current) return;
    const next = drag.current.value + (event.clientX - drag.current.x) * step;
    onLive(Math.round(next * 1000) / 1000);
  };
  const endScrub = (event: PointerEvent<HTMLSpanElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <label className={"u-axis" + (override ? " override" : "")}>
      <span
        className={`u-axis-label axis-${axis}`}
        onPointerDown={startScrub}
        onPointerMove={moveScrub}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        title="Sürükleyerek değiştir"
      >
        {axis.toUpperCase()}
      </span>
      <input
        type="number"
        step={step}
        value={current}
        onChange={(e) => onCommit(parseFloat(e.target.value) || 0)}
      />
    </label>
  );
}

function Vec2Row({
  label,
  x,
  y,
  xKey,
  yKey,
  step,
  node,
  onCommit,
  onBegin,
  onLive,
}: {
  label: string;
  x: number | undefined;
  y: number | undefined;
  xKey: string;
  yKey: string;
  step: number;
  node: GameObjectNode;
  onCommit: (patch: Partial<GameObjectNode>) => void;
  onBegin: () => void;
  onLive: (patch: Partial<GameObjectNode>) => void;
}) {
  return (
    <div className="u-row">
      <span className="u-label">{label}</span>
      <div className="u-vec">
        <AxisField
          axis="x"
          value={x}
          step={step}
          override={isPrefabOverride(node, xKey)}
          onCommit={(v) => onCommit({ [xKey]: v } as Partial<GameObjectNode>)}
          onBegin={onBegin}
          onLive={(v) => onLive({ [xKey]: v } as Partial<GameObjectNode>)}
        />
        <AxisField
          axis="y"
          value={y}
          step={step}
          override={isPrefabOverride(node, yKey)}
          onCommit={(v) => onCommit({ [yKey]: v } as Partial<GameObjectNode>)}
          onBegin={onBegin}
          onLive={(v) => onLive({ [yKey]: v } as Partial<GameObjectNode>)}
        />
      </div>
    </div>
  );
}

function InspectorField({
  label,
  override,
  children,
}: {
  label: string;
  override?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={"u-row" + (override ? " override" : "")}>
      <span className="u-label">{label}</span>
      <div className="u-value">{children}</div>
    </label>
  );
}

function UserPropField({
  node,
  prop,
  onCommit,
}: {
  node: GameObjectNode;
  prop: PrefabProperty;
  onCommit: (patch: Partial<GameObjectNode>) => void;
}) {
  const value = prefabPropertyValue(node, prop);
  const type = prop.type?.id || typeof value;
  const override = isPrefabOverride(node, prop.name);

  if (type === "boolean") {
    return (
      <InspectorField label={prop.label || prop.name} override={override}>
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onCommit({ [prop.name]: e.target.checked })}
        />
      </InspectorField>
    );
  }

  if (type === "color" || (typeof value === "string" && value.startsWith("#"))) {
    const color = typeof value === "string" ? value : "#ffffff";
    return (
      <InspectorField label={prop.label || prop.name} override={override}>
        <input
          type="color"
          value={color}
          onChange={(e) => onCommit({ [prop.name]: e.target.value })}
        />
        <input
          type="text"
          className="u-color-hex"
          value={color}
          onChange={(e) => onCommit({ [prop.name]: e.target.value })}
        />
      </InspectorField>
    );
  }

  if (type === "number" || typeof value === "number") {
    return (
      <InspectorField label={prop.label || prop.name} override={override}>
        <input
          type="number"
          step="any"
          value={Number(value) || 0}
          onChange={(e) => onCommit({ [prop.name]: parseFloat(e.target.value) || 0 })}
        />
      </InspectorField>
    );
  }

  return (
    <InspectorField label={prop.label || prop.name} override={override}>
      <input
        type="text"
        value={value == null ? "" : String(value)}
        onChange={(e) => onCommit({ [prop.name]: e.target.value })}
      />
    </InspectorField>
  );
}

export function Inspector() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const activeFileName = useEditorStore((s) => s.activeFileName);
  const scenes = useEditorStore((s) => s.scenes);
  const assets = useEditorStore((s) => s.assets);
  const prefabIndex = useEditorStore((s) => s.prefabIndex);
  const updateNode = useEditorStore((s) => s.updateNode);
  const updateNodeLive = useEditorStore((s) => s.updateNodeLive);
  const beginInteraction = useEditorStore((s) => s.beginInteraction);
  const removeNode = useEditorStore((s) => s.removeNode);
  const createPrefab = useEditorStore((s) => s.createPrefabFromSelection);
  const openSceneFile = useEditorStore((s) => s.openSceneFile);
  const addPhaserComponent = useEditorStore((s) => s.addPhaserComponent);
  const removePhaserComponent = useEditorStore((s) => s.removePhaserComponent);

  const [open, setOpen] = useState<Record<string, boolean>>({
    transform: true,
    sprite: true,
    text: true,
    prefab: true,
    arcade: true,
    hitArea: true,
  });
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const scene = scenes.find((s) => s.fileName === activeFileName);
  const node = selectedId && scene ? findNode(scene.scene, selectedId) : null;

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const openMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 240),
      y: Math.min(event.clientY, window.innerHeight - 280),
    });
  };

  const addKind = (kind: PhaserAddableKind) => {
    if (selectedId) addPhaserComponent(selectedId, kind);
    setMenu(null);
  };

  if (!node) {
    return (
      <div className="panel inspector" onContextMenu={openMenu}>
        <div className="inspector-empty">Nesne seçilmedi</div>
        {menu && (
          <ComponentContextMenu
            x={menu.x}
            y={menu.y}
            disabled
            hasArcade={false}
            hasHitArea={false}
            onAdd={addKind}
          />
        )}
      </div>
    );
  }

  const isPrefabInstance = !!node.prefabId;
  const prefabEntry = isPrefabInstance
    ? prefabIndex.find((p) => p.id === node.prefabId)
    : undefined;
  const userProps = prefabUserProperties(node, prefabIndex);
  const commit = (patch: Partial<GameObjectNode>) => updateNode(node.id, patch);
  const live = (patch: Partial<GameObjectNode>) => updateNodeLive(node.id, patch);
  const toggle = (key: string) =>
    setOpen((current) => ({ ...current, [key]: !current[key] }));
  const filters = nodeFilters(node);

  return (
    <div className="panel inspector" onContextMenu={openMenu}>
      <header className="u-go-head">
        <input
          type="checkbox"
          className="u-active"
          checked={node.visible !== false}
          title="Visible"
          onChange={(e) => commit({ visible: e.target.checked })}
        />
        <input
          className="u-go-name"
          value={node.label}
          onChange={(e) => commit({ label: e.target.value })}
        />
        <span className="u-go-type">{node.type || "Prefab"}</span>
      </header>

      {isPrefabInstance && (
        <div className="u-prefab-bar">
          <span className="u-prefab-icon">P</span>
          <span className="u-prefab-name">
            {prefabEntry?.className || node.prefabName || "Prefab"}
          </span>
          {prefabEntry && (
            <button
              type="button"
              className="u-prefab-open"
              onClick={() => openSceneFile(prefabEntry.fileName)}
            >
              Open
            </button>
          )}
        </div>
      )}

      <InspectorFold
        title="Transform"
        open={open.transform}
        onToggle={() => toggle("transform")}
      >
        <Vec2Row
          label="Position"
          x={node.x}
          y={node.y}
          xKey="x"
          yKey="y"
          step={0.4}
          node={node}
          onCommit={commit}
          onBegin={beginInteraction}
          onLive={live}
        />
        <InspectorField label="Rotation" override={isPrefabOverride(node, "angle")}>
          <input
            type="number"
            step="0.1"
            value={node.angle ?? 0}
            onChange={(e) => commit({ angle: parseFloat(e.target.value) || 0 })}
          />
        </InspectorField>
        <Vec2Row
          label="Scale"
          x={node.scaleX ?? 1}
          y={node.scaleY ?? 1}
          xKey="scaleX"
          yKey="scaleY"
          step={0.01}
          node={node}
          onCommit={commit}
          onBegin={beginInteraction}
          onLive={live}
        />
      </InspectorFold>

      {hasSpriteSection(node) && (
        <InspectorFold
          title={inspectorComponentName(node)}
          open={open.sprite}
          onToggle={() => toggle("sprite")}
        >
          {(!isPrefabInstance || isPrefabOverride(node, "texture")) && (
            <InspectorField label="Texture" override={isPrefabOverride(node, "texture")}>
              <select
                value={textureKeyOf(node)}
                onChange={(e) => commit(withTextureKey(node, e.target.value))}
              >
                <option value="">None</option>
                {assets.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.key}
                  </option>
                ))}
              </select>
            </InspectorField>
          )}
          <InspectorField label="Alpha" override={isPrefabOverride(node, "alpha")}>
            <input
              type="number"
              min={0}
              max={1}
              step="0.05"
              value={node.alpha ?? 1}
              onChange={(e) => commit({ alpha: parseFloat(e.target.value) || 0 })}
            />
          </InspectorField>
          <Vec2Row
            label="Origin"
            x={node.originX}
            y={node.originY}
            xKey="originX"
            yKey="originY"
            step={0.01}
            node={node}
            onCommit={commit}
            onBegin={beginInteraction}
            onLive={live}
          />
          <InspectorField label="Depth" override={isPrefabOverride(node, "depth")}>
            <input
              type="number"
              step="1"
              value={Number(node.depth) || 0}
              onChange={(e) => commit({ depth: parseFloat(e.target.value) || 0 })}
            />
          </InspectorField>
          {node.type === "TileSprite" && (
            <>
              <Vec2Row
                label="Size"
                x={Number(node.width) || 0}
                y={Number(node.height) || 0}
                xKey="width"
                yKey="height"
                step={1}
                node={node}
                onCommit={commit}
                onBegin={beginInteraction}
                onLive={live}
              />
              <Vec2Row
                label="Tile Scale"
                x={Number(node.tileScaleX) || 1}
                y={Number(node.tileScaleY) || 1}
                xKey="tileScaleX"
                yKey="tileScaleY"
                step={0.01}
                node={node}
                onCommit={commit}
                onBegin={beginInteraction}
                onLive={live}
              />
            </>
          )}
        </InspectorFold>
      )}

      {hasTextSection(node) && (
        <InspectorFold title="Text" open={open.text} onToggle={() => toggle("text")}>
          <InspectorField label="Text">
            <input
              type="text"
              value={node.text || ""}
              onChange={(e) => commit({ text: e.target.value })}
            />
          </InspectorField>
          <InspectorField label="Color">
            <input
              type="color"
              value={String((node.style as { color?: string } | undefined)?.color || "#ffffff")}
              onChange={(e) =>
                commit({
                  style: { ...(node.style as object), color: e.target.value },
                })
              }
            />
          </InspectorField>
        </InspectorFold>
      )}

      {hasArcade(node) && (
        <ArcadeSection
          node={node}
          open={open.arcade !== false}
          onToggle={() => toggle("arcade")}
          onChange={commit}
          onRemove={() => removePhaserComponent(node.id, "arcade")}
        />
      )}

      {hasHitArea(node) && (
        <HitAreaSection
          node={node}
          open={open.hitArea !== false}
          onToggle={() => toggle("hitArea")}
          onChange={commit}
          onRemove={() => removePhaserComponent(node.id, "hitArea")}
        />
      )}

      {filters.map((filter) => (
        <FilterSection
          key={filter.id}
          filter={filter}
          open={open[`filter:${filter.id}`] !== false}
          onToggle={() => toggle(`filter:${filter.id}`)}
          onChange={(patch) =>
            commit({
              filters: filters.map((item) =>
                item.id === filter.id ? { ...item, ...patch } : item
              ),
            })
          }
          onRemove={() => removePhaserComponent(node.id, { filterId: filter.id })}
        />
      ))}

      {userProps.length > 0 && (
        <InspectorFold
          title={prefabEntry?.className || "Prefab"}
          open={open.prefab}
          onToggle={() => toggle("prefab")}
        >
          {userProps.map((prop) => (
            <UserPropField key={prop.name} node={node} prop={prop} onCommit={commit} />
          ))}
        </InspectorFold>
      )}

      <div className="u-add">
        {!isPrefabInstance && (
          <button
            type="button"
            className="u-add-btn"
            onClick={() => {
              const name = prompt("Prefab adı:", inspectorObjectTitle(node));
              if (name) createPrefab(name);
            }}
          >
            Prefab Yap
          </button>
        )}
        <button type="button" className="u-add-btn danger" onClick={() => removeNode(node.id)}>
          Sil
        </button>
      </div>
      {menu && (
        <ComponentContextMenu
          x={menu.x}
          y={menu.y}
          disabled={false}
          hasArcade={hasArcade(node)}
          hasHitArea={hasHitArea(node)}
          onAdd={addKind}
        />
      )}
    </div>
  );
}

function ComponentContextMenu({
  x,
  y,
  disabled,
  hasArcade,
  hasHitArea,
  onAdd,
}: {
  x: number;
  y: number;
  disabled: boolean;
  hasArcade: boolean;
  hasHitArea: boolean;
  onAdd: (kind: PhaserAddableKind) => void;
}) {
  return (
    <div
      className="ctx-menu"
      style={{ left: x, top: y }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="ctx-menu-label">Component Ekle</div>
      <button
        className="ctx-menu-item"
        disabled={disabled || hasArcade}
        onClick={() => onAdd("arcade")}
      >
        Arcade Physics Body
      </button>
      <button
        className="ctx-menu-item"
        disabled={disabled || hasHitArea}
        onClick={() => onAdd("hitArea")}
      >
        Hit Area
      </button>
      <div className="ctx-menu-label">Phaser 4 Filters</div>
      {FILTER_TYPES.map((type) => (
        <button
          key={type}
          className="ctx-menu-item"
          disabled={disabled}
          onClick={() => onAdd(type)}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
