import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  clipDurationSec,
  clipFrameNames,
  parseAtlasFrames,
  resolveProjectUrl,
  shiftClipRange,
  type AtlasFrameRect,
  type SpriteAnimClip,
} from "../model/spriteAnims";
import { useEditorStore } from "../store/store";

const CELL = 22;

export function AnimationPanel() {
  const projectPath = useEditorStore((s) => s.projectPath);
  const working = useEditorStore((s) => s.animsWorking);
  const updateAnimClip = useEditorStore((s) => s.updateAnimClip);
  const saveSpriteAnims = useEditorStore((s) => s.saveSpriteAnims);

  const [clipIndex, setClipIndex] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [atlasFrames, setAtlasFrames] = useState<Map<string, AtlasFrameRect>>(
    new Map()
  );
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const clips = working?.data.anims ?? [];
  const clip = clips[clipIndex] ?? clips[0];
  const frames = useMemo(() => (clip ? clipFrameNames(clip) : []), [clip]);
  const frameName = frames[playhead] ?? frames[0] ?? "";
  const rate = clip && clip.frameRate > 0 ? clip.frameRate : 12;
  const playheadRef = useRef(playhead);
  playheadRef.current = playhead;

  useEffect(() => {
    setClipIndex(0);
    setPlayhead(0);
    setPlaying(false);
  }, [working?.path]);

  useEffect(() => {
    setPlayhead(0);
    setPlaying(false);
  }, [clipIndex]);

  useEffect(() => {
    if (playhead >= frames.length) setPlayhead(Math.max(0, frames.length - 1));
  }, [frames.length, playhead]);

  useEffect(() => {
    if (!playing || !clip || frames.length === 0) return;
    const loops = clip.repeat < 0 ? Infinity : clip.repeat + 1;
    let index = playheadRef.current;
    let cycles = 0;
    const timer = window.setInterval(() => {
      index += 1;
      if (index >= frames.length) {
        cycles += 1;
        if (cycles >= loops) {
          setPlaying(false);
          setPlayhead(Math.max(0, frames.length - 1));
          return;
        }
        index = 0;
      }
      setPlayhead(index);
    }, 1000 / rate);
    return () => window.clearInterval(timer);
  }, [playing, clip, frames.length, rate]);

  useEffect(() => {
    let cancelled = false;
    const api = (window as any).editor as
      | import("../../../electron/preload").EditorApi
      | undefined;
    if (!api || !projectPath || !working) {
      setAtlasFrames(new Map());
      setSheetUrl(null);
      return;
    }
    const data = working.data;
    const atlasUrls = data.atlasUrl ? resolveProjectUrl(projectPath, data.atlasUrl) : [];
    const textureUrls = data.textureUrl
      ? resolveProjectUrl(projectPath, data.textureUrl)
      : [];

    (async () => {
      let framesMap = new Map<string, AtlasFrameRect>();
      for (const path of atlasUrls) {
        try {
          const raw = (await api.readFile(path)) as string;
          if (typeof raw !== "string") continue;
          framesMap = parseAtlasFrames(JSON.parse(raw));
          if (framesMap.size) break;
        } catch {
          /* sonraki aday */
        }
      }
      let image: string | null = null;
      for (const path of textureUrls) {
        try {
          const value = (await api.readAsset(path)) as string;
          if (typeof value === "string" && value.startsWith("data:")) {
            image = value;
            break;
          }
        } catch {
          /* sonraki aday */
        }
      }
      if (!cancelled) {
        setAtlasFrames(framesMap);
        setSheetUrl(image);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectPath, working?.path, working?.data.atlasUrl, working?.data.textureUrl]);

  useEffect(() => {
    if (!sheetUrl || !frameName) {
      setPreviewUrl(null);
      return;
    }
    const rect = atlasFrames.get(frameName);
    if (!rect) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      setPreviewUrl(cropFrame(image, rect));
    };
    image.onerror = () => {
      if (!cancelled) setPreviewUrl(null);
    };
    image.src = sheetUrl;
    return () => {
      cancelled = true;
    };
  }, [sheetUrl, atlasFrames, frameName]);

  const seek = (index: number) => {
    if (frames.length === 0) return;
    setPlayhead(Math.max(0, Math.min(frames.length - 1, index)));
  };

  const patch = (partial: Partial<SpriteAnimClip>) => {
    if (!clip) return;
    updateAnimClip(clips.indexOf(clip), partial);
  };

  if (!working || !clip) {
    return (
      <div className="panel anim-panel">
        <div className="panel-head">
          <span>Animation</span>
        </div>
        <div className="panel-body anim-empty">
          Bu prefab için `*-anims.json` yok
        </div>
      </div>
    );
  }

  return (
    <div className="panel anim-panel">
      <div className="panel-head">
        <span>Animation</span>
      </div>
      <div className="panel-body anim-body">
        <div className="anim-toolbar">
          <button
            type="button"
            className="anim-tool"
            title="Önceki kare"
            onClick={() => seek(playhead - 1)}
          >
            ◀
          </button>
          <button
            type="button"
            className="anim-tool"
            title={playing ? "Durdur" : "Oynat"}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <button
            type="button"
            className="anim-tool"
            title="Sonraki kare"
            onClick={() => seek(playhead + 1)}
          >
            ▶
          </button>
          <input
            className="anim-frame-num"
            type="number"
            value={playhead}
            min={0}
            max={Math.max(0, frames.length - 1)}
            onChange={(event) => seek(Number(event.target.value) || 0)}
          />
          <select
            className="anim-clip-select"
            value={String(clips.indexOf(clip))}
            onChange={(event) => setClipIndex(Number(event.target.value))}
          >
            {clips.map((item, index) => (
              <option key={`${item.key}-${index}`} value={index}>
                {item.key}
              </option>
            ))}
          </select>
          <label className="anim-samples">
            Samples
            <input
              type="number"
              min={1}
              value={clip.frameRate}
              onChange={(event) =>
                patch({ frameRate: Math.max(1, Number(event.target.value) || 1) })
              }
            />
          </label>
          <label className="anim-loop">
            <input
              type="checkbox"
              checked={clip.repeat < 0}
              onChange={(event) => patch({ repeat: event.target.checked ? -1 : 0 })}
            />
            Loop
          </label>
          <span className="anim-file">
            {working.fileName}
            {working.dirty ? " •" : ""}
          </span>
          <button
            type="button"
            className="btn small"
            disabled={!working.dirty}
            onClick={() => void saveSpriteAnims()}
          >
            Kaydet
          </button>
        </div>

        <div className="anim-main">
          <div className="anim-side">
            <div className="anim-preview">
              {previewUrl ? (
                <img src={previewUrl} alt={frameName} />
              ) : (
                <span className="hint">{frameName || "Kare yok"}</span>
              )}
            </div>
            <div className="anim-prop">
              <span>Sprite</span>
              <code>{working.data.atlasKey}</code>
            </div>
            <div className="anim-prop">
              <span>Frame</span>
              <code>{frameName}</code>
            </div>
            <div className="anim-clip-list">
              {clips.map((item, index) => (
                <button
                  key={`${item.key}-${index}`}
                  type="button"
                  className={`anim-clip-item${index === clips.indexOf(clip) ? " active" : ""}`}
                  onClick={() => setClipIndex(index)}
                >
                  {item.key}
                </button>
              ))}
            </div>
            <label className="anim-field">
              Key
              <input
                type="text"
                value={clip.key}
                onChange={(event) => patch({ key: event.target.value })}
              />
            </label>
            <label className="anim-field">
              Prefix
              <input
                type="text"
                value={clip.prefix}
                onChange={(event) => patch({ prefix: event.target.value })}
              />
            </label>
            <div className="anim-field-row">
              <label className="anim-field">
                Start
                <input
                  type="number"
                  value={clip.start}
                  onChange={(event) =>
                    patch({ start: Number(event.target.value) || 0 })
                  }
                />
              </label>
              <label className="anim-field">
                End
                <input
                  type="number"
                  value={clip.end}
                  onChange={(event) =>
                    patch({ end: Number(event.target.value) || 0 })
                  }
                />
              </label>
            </div>
            <div className="anim-field-row">
              <label className="anim-field">
                ZeroPad
                <input
                  type="number"
                  min={0}
                  value={clip.zeroPad}
                  onChange={(event) =>
                    patch({ zeroPad: Math.max(0, Number(event.target.value) || 0) })
                  }
                />
              </label>
              <label className="anim-field">
                Repeat
                <input
                  type="number"
                  value={clip.repeat}
                  onChange={(event) =>
                    patch({ repeat: Number(event.target.value) || 0 })
                  }
                />
              </label>
            </div>
          </div>
          <Dopesheet
            clip={clip}
            frames={frames}
            playhead={playhead}
            onSeek={seek}
            onRange={(handle, delta) => patch(shiftClipRange(clip, handle, delta))}
          />
        </div>

        <div className="anim-tabs">
          <span className="anim-tab active">Dopesheet</span>
        </div>
      </div>
    </div>
  );
}

function Dopesheet({
  clip,
  frames,
  playhead,
  onSeek,
  onRange,
}: {
  clip: SpriteAnimClip;
  frames: string[];
  playhead: number;
  onSeek: (index: number) => void;
  onRange: (handle: "start" | "end", cellDelta: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    handle: "start" | "end";
    origin: number;
    applied: number;
  } | null>(null);
  const duration = clipDurationSec(clip);
  const width = Math.max(frames.length, 1) * CELL;

  const indexFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const box = track.getBoundingClientRect();
    return Math.floor((clientX - box.left + track.scrollLeft) / CELL);
  };

  const onTrackClick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current) return;
    onSeek(indexFromClientX(event.clientX));
  };

  const startDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    handle: "start" | "end"
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      handle,
      origin: indexFromClientX(event.clientX),
      applied: 0,
    };
  };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state) return;
    const delta = indexFromClientX(event.clientX) - state.origin;
    const step = delta - state.applied;
    if (step === 0) return;
    state.applied = delta;
    onRange(state.handle, step);
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    drag.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* yok say */
    }
  };

  const tickEvery = frames.length > 40 ? 5 : frames.length > 20 ? 2 : 1;

  return (
    <div className="anim-sheet">
      <div className="anim-ruler" style={{ width }}>
        {frames.map((_, index) =>
          index % tickEvery === 0 ? (
            <span
              key={index}
              className="anim-tick"
              style={{ left: index * CELL }}
            >
              {(index / (clip.frameRate > 0 ? clip.frameRate : 1)).toFixed(2)}
            </span>
          ) : null
        )}
        <span className="anim-duration">{duration.toFixed(2)}s</span>
      </div>
      <div
        ref={trackRef}
        className="anim-track"
        style={{ width }}
        onPointerDown={onTrackClick}
      >
        {frames.map((name, index) => {
          const handle =
            index === 0 ? "start" : index === frames.length - 1 ? "end" : null;
          return (
            <button
              key={`${name}-${index}`}
              type="button"
              title={name}
              className={`anim-key${index === playhead ? " current" : ""}`}
              style={{ left: index * CELL + CELL / 2 }}
              onPointerDown={(event) => {
                if (handle) startDrag(event, handle);
                else event.stopPropagation();
                onSeek(index);
              }}
              onPointerMove={handle ? moveDrag : undefined}
              onPointerUp={handle ? endDrag : undefined}
              onPointerCancel={handle ? endDrag : undefined}
            />
          );
        })}
        <div
          className="anim-playhead"
          style={{ left: playhead * CELL + CELL / 2 }}
        />
      </div>
    </div>
  );
}

function cropFrame(image: HTMLImageElement, rect: AtlasFrameRect): string {
  const max = 112;
  const scale = Math.min(max / rect.w, max / rect.h, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.w * scale));
  canvas.height = Math.max(1, Math.round(rect.h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    image,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas.toDataURL("image/png");
}
