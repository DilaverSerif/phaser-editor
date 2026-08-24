import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { EditorScene } from "../phaser/EditorScene";
import { getActiveEditorScene, setActiveEditorScene } from "../phaser/editorController";

export function CanvasView() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    const game = new Phaser.Game({
      // Editor preview'sinde WebGL framebuffer, floating pencere layout'u
      // ilk olusturulurken 0 boyut alabiliyor. Canvas renderer daha kararlidir;
      // kullanicinin asil oyun renderer ayarlarini etkilemez.
      type: Phaser.CANVAS,
      parent: host,
      backgroundColor: "#1e1e2e",
      render: {
        antialias: false,
        roundPixels: true,
        powerPreference: "low-power",
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: "100%",
        height: "100%",
        autoRound: true,
      },
      scene: [EditorScene],
    });
    gameRef.current = game;
    let lastW = 0;
    let lastH = 0;
    const refresh = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w < 8 || h < 8) return;
      if (w === lastW && h === lastH) return;
      const firstRealSize = lastW < 8 || lastH < 8;
      lastW = w;
      lastH = h;
      game.scale.resize(w, h);
      if (firstRealSize) getActiveEditorScene()?.refreshPreview();
    };
    game.events.once("ready", () => {
      getActiveEditorScene()?.refreshPreview();
      requestAnimationFrame(refresh);
    });
    const ro = new ResizeObserver(() => refresh());
    ro.observe(host);
    return () => {
      ro.disconnect();
      getActiveEditorScene()?.abortPendingTextures();
      setActiveEditorScene(null);
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="canvas-wrap">
      <div className="canvas-host" ref={hostRef} />
      <div className="canvas-hint">Sürükle-bırak ile konumlandır · tıkla ile seç</div>
    </div>
  );
}
