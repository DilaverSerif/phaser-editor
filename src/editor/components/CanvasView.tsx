import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { EditorScene } from "../phaser/EditorScene";
import { getActiveEditorScene, setActiveEditorScene } from "../phaser/editorController";

function createEditorGame(host: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    // P4 Canvas renderer is deprecated. Create only after the dock host has a
    // real size so WebGL does not boot a 0x0 framebuffer.
    type: Phaser.AUTO,
    parent: host,
    backgroundColor: "#1e1e2e",
    render: {
      antialias: false,
      roundPixels: true,
      powerPreference: "low-power",
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: host.clientWidth,
      height: host.clientHeight,
      autoRound: true,
    },
    scene: [EditorScene],
  });
}

export function CanvasView() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    let lastW = 0;
    let lastH = 0;
    let cancelled = false;

    const refresh = () => {
      if (cancelled) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w < 8 || h < 8) return;
      if (!gameRef.current) {
        lastW = w;
        lastH = h;
        const game = createEditorGame(host);
        gameRef.current = game;
        game.events.once("ready", () => {
          getActiveEditorScene()?.refreshPreview();
        });
        return;
      }
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      gameRef.current.scale.resize(w, h);
      getActiveEditorScene()?.refreshPreview();
    };

    const ro = new ResizeObserver(() => refresh());
    ro.observe(host);
    requestAnimationFrame(refresh);
    return () => {
      cancelled = true;
      ro.disconnect();
      getActiveEditorScene()?.abortPendingTextures();
      setActiveEditorScene(null);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="canvas-wrap">
      <div
        className="canvas-host"
        ref={hostRef}
        onMouseDown={(event) => {
          if (event.button === 1) event.preventDefault();
        }}
        onAuxClick={(event) => event.preventDefault()}
      />
      <div className="canvas-hint">
        Sürükle-bırak ile konumlandır · tıkla ile seç · orta tuş ile pan
      </div>
    </div>
  );
}
