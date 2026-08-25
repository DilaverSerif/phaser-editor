import { useEffect, useRef, useState, type Ref } from "react";
import {
  containViewport,
  PLAY_DEVICES,
  playDeviceById,
  playViewport,
} from "../play/playLayouts";
import { playSrc } from "../play/playUrl";
import { usePlaySession } from "../play/playSession";
import { stopPlay } from "../play/runPlay";
import { useEditorStore } from "../store/store";

export function PlayPanel() {
  const projectPath = useEditorStore((s) => s.projectPath);
  const status = usePlaySession((s) => s.status);
  const url = usePlaySession((s) => s.url);
  const error = usePlaySession((s) => s.error);
  const reloadToken = usePlaySession((s) => s.reloadToken);
  const deviceId = usePlaySession((s) => s.deviceId);
  const orientation = usePlaySession((s) => s.orientation);
  const setDeviceId = usePlaySession((s) => s.setDeviceId);
  const setOrientation = usePlaySession((s) => s.setOrientation);
  const webviewRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  const device = playDeviceById(deviceId);
  const view = playViewport(device, orientation);

  useEffect(() => {
    return () => {
      void stopPlay();
    };
  }, [projectPath]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const next = containViewport(
        view.width,
        view.height,
        stage.clientWidth,
        stage.clientHeight
      );
      setFrame({ width: next.width, height: next.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [view.width, view.height]);

  const src = status === "running" && url ? playSrc(url, reloadToken) : undefined;

  const focusGame = () => {
    webviewRef.current?.focus();
  };

  return (
    <div className="panel play-panel">
      <div className="panel-head">
        <span>Play</span>
      </div>
      <div className="play-toolbar">
        <div className="play-orient" role="group" aria-label="Yön">
          <button
            type="button"
            className={`btn small${orientation === "portrait" ? " primary" : ""}`}
            onClick={() => setOrientation("portrait")}
          >
            Portrait
          </button>
          <button
            type="button"
            className={`btn small${orientation === "landscape" ? " primary" : ""}`}
            onClick={() => setOrientation("landscape")}
          >
            Landscape
          </button>
        </div>
        <select
          className="play-device"
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
        >
          {PLAY_DEVICES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <span className="play-res">
          {view.width}×{view.height}
        </span>
      </div>
      <div className="panel-body play-body" onMouseDown={focusGame}>
        {status === "idle" && <div className="play-empty">Oyna ile oyunu başlat</div>}
        {status === "starting" && <div className="play-empty">Vite başlıyor…</div>}
        {status === "error" && <div className="play-empty play-error">{error}</div>}
        {src && (
          <div className="play-stage" ref={stageRef}>
            <div
              className="play-device-frame"
              style={{ width: frame.width, height: frame.height }}
            >
              <webview
                ref={webviewRef as Ref<HTMLElement>}
                className="play-frame"
                src={src}
                webpreferences="backgroundThrottling=false"
                onLoad={focusGame}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
