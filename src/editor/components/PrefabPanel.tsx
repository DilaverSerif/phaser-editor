import { useEditorStore } from "../store/store";

const OBJECT_TYPES = [
  "Image",
  "Sprite",
  "Text",
  "Container",
  "Rectangle",
  "Arc",
  "Triangle",
];

export function PrefabPanel() {
  const addNode = useEditorStore((s) => s.addNode);
  const prefabIndex = useEditorStore((s) => s.prefabIndex);
  const instantiatePrefab = useEditorStore((s) => s.instantiatePrefab);
  const selectedId = useEditorStore((s) => s.selectedId);

  return (
    <div className="panel">
      <div className="panel-head"><span>Obje & Prefab</span></div>
      <div className="panel-body">
        <div className="subhead">Obje Ekle</div>
        <div className="btn-row">
          {OBJECT_TYPES.map((t) => (
            <button key={t} className="btn small" onClick={() => addNode(t, selectedId ?? undefined)}>
              {t}
            </button>
          ))}
        </div>
        <div className="subhead">Prefab'lar</div>
        {prefabIndex.length === 0 && <div className="hint">Prefab yok</div>}
        <div className="btn-row">
          {prefabIndex.map((p) => (
            <button
              key={p.id}
              className="btn small"
              title={`${p.fileName} instance ekle`}
              onClick={() => instantiatePrefab(p.id, 200, 200)}
            >
              {p.className}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
