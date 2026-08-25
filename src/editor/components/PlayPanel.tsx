import { useEffect, useRef, useState, type Ref } from "react";
import { PLAY_PARTITION } from "../../../electron/playPartition";
import {
  containViewport,
  PLAY_DEVICES,
  playDeviceById,
  playViewport,
} from "../play/playLayouts";
import { COLLECT_PLAY_STATS, EMPTY_PLAY_STATS, parsePlayStats } from "../play/playStats";
import { playSrc } from "../play/playUrl";
import { usePlaySession } from "../play/playSession";
import {
  isPlayWebviewReady,
  type PlayWebviewEl,
  type PlayWebviewIpcEvent,
} from "../play/playWebview";
import {
  clearPlaySiteData,
  collectPlayStats,
  playGuestPreloadUrl,
  stopPlay,
} from "../play/runPlay";
import { useEditorStore } from "../store/store";
import { PlayStatsWindow } from "./PlayStatsWindow";

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
  const muted = usePlaySession((s) => s.muted);
  const statsOpen = usePlaySession((s) => s.statsOpen);
  const setMuted = usePlaySession((s) => s.setMuted);
  const setStatsOpen = usePlaySession((s) => s.setStatsOpen);
  const webviewRef = useRef<PlayWebviewEl | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [clearHint, setClearHint] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [stats, setStats] = useState(EMPTY_PLAY_STATS);
  const [guestReady, setGuestReady] = useState(false);
  const [guestPreload, setGuestPreload] = useState("");

  const device = playDeviceById(deviceId);
  const view = playViewport(device, orientation);
  const src = status === "running" && url ? playSrc(url, reloadToken) : undefined;

  useEffect(() => {
    return () => {
      void stopPlay();
    };
  }, [projectPath]);

  useEffect(() => {
    void playGuestPreloadUrl().then(setGuestPreload);
  }, []);

  useEffect(() => {
    if (!clearHint) return;
    const id = window.setTimeout(() => setClearHint(null), 2500);
    return () => window.clearTimeout(id);
  }, [clearHint]);

  useEffect(() => {
    if (!src) {
      setFrame({ width: 0, height: 0 });
      return;
    }
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
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [view.width, view.height, src]);

  useEffect(() => {
    setGuestReady(false);
    const webview = webviewRef.current;
    if (!src || !webview) return;
    const onReady = () => setGuestReady(true);
    webview.addEventListener("dom-ready", onReady);
    if (isPlayWebviewReady(webview)) setGuestReady(true);
    return () => {
      webview.removeEventListener("dom-ready", onReady);
      setGuestReady(false);
    };
  }, [src, frame.width, frame.height]);

  useEffect(() => {
    if (!guestReady) return;
    webviewRef.current?.setAudioMuted?.(muted);
  }, [guestReady, muted]);

  useEffect(() => {
    if (!src || !statsOpen || !guestReady) return;
    const webview = webviewRef.current;
    if (!webview) return;
    let cancelled = false;
    const onIpc = (event: Event) => {
      const ipc = event as PlayWebviewIpcEvent;
      if (ipc.channel !== "play-stats") return;
      if (!cancelled) setStats(parsePlayStats(ipc.args[0]));
    };
    webview.addEventListener("ipc-message", onIpc);
    const poll = async () => {
      if (webview.send) {
        webview.send("play:collect-stats", COLLECT_PLAY_STATS);
        return;
      }
      let id: number | undefined;
      try {
        id = webview.getWebContentsId?.();
      } catch {
        id = undefined;
      }
      if (typeof id !== "number") {
        if (!cancelled) setStats({ ...EMPTY_PLAY_STATS, error: "webview id yok" });
        return;
      }
      try {
        const raw = await collectPlayStats(id);
        if (!cancelled) setStats(parsePlayStats(raw));
      } catch (err) {
        if (!cancelled) {
          setStats({
            ...EMPTY_PLAY_STATS,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 250);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      webview.removeEventListener("ipc-message", onIpc);
    };
  }, [src, statsOpen, guestReady]);

  const focusGame = () => {
    webviewRef.current?.focus();
  };

  const toggleMute = () => {
    setMuted(!muted);
  };

  const onClearSiteData = async () => {
    if (clearing) return;
    setClearing(true);
    setClearHint(null);
    const result = await clearPlaySiteData();
    setClearing(false);
    setClearHint("error" in result ? result.error : "Silindi");
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
        <button
          type="button"
          className={`btn small${muted ? " primary" : ""}`}
          title={muted ? "Sesi aç" : "Sesi kapat"}
          aria-pressed={muted}
          onClick={toggleMute}
        >
          {muted ? "Ses kapalı" : "Ses"}
        </button>
        <button
          type="button"
          className={`btn small${statsOpen ? " primary" : ""}`}
          title={statsOpen ? "İstatistikleri gizle" : "İstatistikleri göster"}
          aria-pressed={statsOpen}
          onClick={() => setStatsOpen(!statsOpen)}
        >
          İstatistikler
        </button>
        <button
          type="button"
          className="btn small play-clear"
          disabled={clearing}
          title="Play oturumunun HTTP önbelleğini, çerezlerini ve localStorage verisini siler"
          onClick={() => void onClearSiteData()}
        >
          {clearing ? "Siliniyor…" : "Cache ve çerezleri sil"}
        </button>
        {clearHint && <span className="play-clear-hint">{clearHint}</span>}
      </div>
      <div className="panel-body play-body" onMouseDown={focusGame}>
        {status === "idle" && <div className="play-empty">Oyna ile oyunu başlat</div>}
        {status === "starting" && <div className="play-empty">Vite başlıyor…</div>}
        {status === "error" && <div className="play-empty play-error">{error}</div>}
        {src && (
          <div className="play-stage" ref={stageRef}>
            {frame.width >= 8 && frame.height >= 8 && (
              <div
                className="play-device-frame"
                style={{ width: frame.width, height: frame.height }}
              >
                <webview
                  ref={webviewRef as Ref<PlayWebviewEl>}
                  className="play-frame"
                  src={src}
                  partition={PLAY_PARTITION}
                  preload={guestPreload || undefined}
                  webpreferences="backgroundThrottling=false"
                  onLoad={focusGame}
                />
              </div>
            )}
          </div>
        )}
        {src && statsOpen && <PlayStatsWindow stats={stats} />}
      </div>
    </div>
  );
}
