import { useRef } from "react";
import { useEditorStore } from "../store/store";

export function AssetBrowser() {
  const assets = useEditorStore((s) => s.assets);
  const addAsset = useEditorStore((s) => s.addAsset);
  const setAssetBase64 = useEditorStore((s) => s.setAssetBase64);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const f of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        const key = f.name;
        addAsset(key, key);
        setAssetBase64(key, reader.result as string);
      };
      reader.readAsDataURL(f);
    }
    e.target.value = "";
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Assets</span>
        <button className="mini" onClick={() => fileRef.current?.click()}>＋</button>
      </div>
      <div className="panel-body">
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFile} />
        {assets.length === 0 && <div className="hint">Görsel yok</div>}
        <div className="asset-grid">
          {assets.map((a) => (
            <div key={a.key} className="asset-item" title={a.key}>
              <span className={"asset-dot" + (a.base64 ? " loaded" : "")} />
              <code>{a.key}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
