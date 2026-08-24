import { useEffect, useState } from "react";
import type { GameObjectNode } from "../model/types";
import { flattenVisibleIds } from "../model/sceneTree";
import { getActiveEditorScene } from "../phaser/editorController";
import { useEditorStore } from "../store/store";

type MenuState = { x: number; y: number };

export function HierarchyPanel() {
  const activeFileName = useEditorStore((s) => s.activeFileName);
  const scenes = useEditorStore((s) => s.scenes);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectNode = useEditorStore((s) => s.selectNode);
  const createLayer = useEditorStore((s) => s.createLayer);
  const groupSelectionInLayer = useEditorStore((s) => s.groupSelectionInLayer);
  const scene = scenes.find((s) => s.fileName === activeFileName)?.scene;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<MenuState | null>(null);

  useEffect(() => {
    setCollapsed(new Set());
    setMenu(null);
  }, [activeFileName]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", close, true);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", close, true);
    };
  }, [menu]);

  const toggle = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleIds = scene ? flattenVisibleIds(scene.displayList, collapsed) : [];
  const hasSelection = selectedIds.length > 0;

  const openMenu = (event: React.MouseEvent, id?: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (id && !selectedIds.includes(id)) {
      selectNode(id);
    }
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 260),
      y: Math.min(event.clientY, window.innerHeight - 100),
    });
  };

  return (
    <div className="panel hierarchy-panel">
      <div className="panel-head">
        <span>Hierarchy</span>
        <span className="hierarchy-count">
          {scene ? scene.displayList.length : 0}
        </span>
      </div>
      <div
        className="panel-body hierarchy-body"
        onContextMenu={(event) => openMenu(event)}
      >
        {!scene && <div className="hint">Bir sahne aç</div>}
        {scene && scene.displayList.length === 0 && (
          <div className="hint">Sahne boş</div>
        )}
        {scene?.displayList.map((node) => (
          <HierarchyNode
            key={node.id}
            node={node}
            depth={0}
            selectedIds={selectedIds}
            collapsed={collapsed}
            onToggle={toggle}
            onSelect={(id, shift) => selectNode(id, { shift, visibleIds })}
            onFocus={(id) => getActiveEditorScene()?.focusNode(id)}
            onContextMenu={openMenu}
          />
        ))}
      </div>
      {menu && (
        <div
          className="ctx-menu"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            className="ctx-menu-item"
            disabled={!scene}
            onClick={() => {
              createLayer();
              setMenu(null);
            }}
          >
            Layer oluştur
          </button>
          <button
            className="ctx-menu-item"
            disabled={!scene || !hasSelection}
            onClick={() => {
              groupSelectionInLayer();
              setMenu(null);
            }}
          >
            Layer oluştur ve seçilenleri ekle
          </button>
        </div>
      )}
    </div>
  );
}

function HierarchyNode({
  node,
  depth,
  selectedIds,
  collapsed,
  onToggle,
  onSelect,
  onFocus,
  onContextMenu,
}: {
  node: GameObjectNode;
  depth: number;
  selectedIds: string[];
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string, shift?: boolean) => void;
  onFocus: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, id: string) => void;
}) {
  const children = node.list ?? [];
  const hasChildren = children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const isPrefab = !!node.prefabId;
  const displayType = isPrefab ? "Prefab" : node.type || "Object";
  const icon =
    isPrefab ? "P" : node.type === "Layer" ? "L" : node.type === "Container" ? "C" : "O";
  const iconClass = isPrefab
    ? " prefab"
    : node.type === "Layer"
      ? " layer"
      : "";

  return (
    <div className="hierarchy-node">
      <div
        className={`hierarchy-row${selectedIds.includes(node.id) ? " selected" : ""}`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={(event) => onSelect(node.id, event.shiftKey)}
        onDoubleClick={(event) => {
          event.preventDefault();
          onSelect(node.id);
          onFocus(node.id);
        }}
        onContextMenu={(event) => onContextMenu(event, node.id)}
        title={`${node.label} (${displayType}) · çift tık: kamerayı ortala`}
      >
        <button
          className={`hierarchy-toggle${hasChildren ? "" : " empty"}`}
          onClick={(event) => {
            event.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          onDoubleClick={(event) => event.stopPropagation()}
          aria-label={hasChildren ? (isCollapsed ? "Expand" : "Collapse") : "No children"}
        >
          {hasChildren ? (isCollapsed ? ">" : "v") : " "}
        </button>
        <span className={`hierarchy-icon${iconClass}`}>{icon}</span>
        <span className="hierarchy-label">{node.label || displayType}</span>
        <span className="hierarchy-type">{displayType}</span>
      </div>
      {hasChildren && !isCollapsed && (
        <div>
          {children.map((child) => (
            <HierarchyNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedIds={selectedIds}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
              onFocus={onFocus}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
