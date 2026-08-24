import { useEditorStore } from "../store/store";

export function ProjectPanel() {
  const activeFileName = useEditorStore((s) => s.activeFileName);
  const projectPath = useEditorStore((s) => s.projectPath);
  const projectFiles = useEditorStore((s) => s.projectFiles);
  const openSceneFile = useEditorStore((s) => s.openSceneFile);
  const refresh = useEditorStore((s) => s.refreshProjectFiles);

  const scnFiles = projectFiles.filter((p) => p.sceneType === "SCENE");
  const prefabFiles = projectFiles.filter((p) => p.sceneType === "PREFAB");

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Proje Dosyaları</span>
        <button className="mini" onClick={() => refresh()} title="Yenile">⟳</button>
      </div>
      <div className="panel-body">
        <div className="subhead">Sahneler ({scnFiles.length})</div>
        {scnFiles.length === 0 && <div className="hint">Sahne yok</div>}
        {scnFiles.map((f) => (
          <div
            key={f.path}
            className={"file-item" + (f.fileName === activeFileName ? " active" : "")}
            onClick={() => openSceneFile(f.fileName)}
          >
            <span>{f.fileName}</span>
          </div>
        ))}

        <div className="subhead">Prefab'lar ({prefabFiles.length})</div>
        {prefabFiles.length === 0 && <div className="hint">Prefab yok</div>}
        {prefabFiles.map((f) => (
          <div
            key={f.path}
            className={"file-item" + (f.fileName === activeFileName ? " active" : "")}
            onClick={() => openSceneFile(f.fileName)}
          >
            <span>{f.fileName}</span>
          </div>
        ))}

        <div className="proj-path">{projectPath}</div>
      </div>
    </div>
  );
}
