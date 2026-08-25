export interface PlayStats {
  found: boolean;
  error: string;
  fps: number;
  fpsMin: number | null;
  fpsMax: number | null;
  delta: number;
  rawDelta: number;
  frame: number;
  paused: boolean;
  hasFocus: boolean;
  renderer: string;
  canvasW: number;
  canvasH: number;
  drawCount: number | null;
  drawCalls: number | null;
  triangles: number | null;
  textureBinds: number | null;
  programBinds: number | null;
  glTextures: number | null;
  glBuffers: number | null;
  glPrograms: number | null;
  glFramebuffers: number | null;
  maxTextures: number | null;
  heapUsed: number | null;
  heapLimit: number | null;
  gameW: number;
  gameH: number;
  zoom: number;
  scaleMode: string;
  scenes: string;
  objects: number;
  cameras: number;
  tweens: number;
  bodies: number;
  textures: number;
  animations: number;
  soundsPlaying: number;
  soundsTotal: number;
  volume: number;
  soundMute: boolean;
  audioLocked: boolean;
  soundType: string;
}

export const EMPTY_PLAY_STATS: PlayStats = {
  found: false,
  error: "",
  fps: 0,
  fpsMin: null,
  fpsMax: null,
  delta: 0,
  rawDelta: 0,
  frame: 0,
  paused: false,
  hasFocus: false,
  renderer: "—",
  canvasW: 0,
  canvasH: 0,
  drawCount: null,
  drawCalls: null,
  triangles: null,
  textureBinds: null,
  programBinds: null,
  glTextures: null,
  glBuffers: null,
  glPrograms: null,
  glFramebuffers: null,
  maxTextures: null,
  heapUsed: null,
  heapLimit: null,
  gameW: 0,
  gameH: 0,
  zoom: 0,
  scaleMode: "—",
  scenes: "—",
  objects: 0,
  cameras: 0,
  tweens: 0,
  bodies: 0,
  textures: 0,
  animations: 0,
  soundsPlaying: 0,
  soundsTotal: 0,
  volume: 0,
  soundMute: false,
  audioLocked: false,
  soundType: "—",
};

function num(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parsePlayStats(raw: unknown): PlayStats {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return { ...EMPTY_PLAY_STATS, error: "istatistik json okunamadı" };
    }
  }
  if (!value || typeof value !== "object") return { ...EMPTY_PLAY_STATS };
  const o = value as Record<string, unknown>;
  return {
    found: o.found === true,
    error: typeof o.error === "string" ? o.error : "",
    fps: num(o.fps),
    fpsMin: numOrNull(o.fpsMin),
    fpsMax: numOrNull(o.fpsMax),
    delta: num(o.delta),
    rawDelta: num(o.rawDelta),
    frame: num(o.frame),
    paused: o.paused === true,
    hasFocus: o.hasFocus === true,
    renderer: typeof o.renderer === "string" && o.renderer ? o.renderer : "—",
    canvasW: num(o.canvasW),
    canvasH: num(o.canvasH),
    drawCount: numOrNull(o.drawCount),
    drawCalls: numOrNull(o.drawCalls),
    triangles: numOrNull(o.triangles),
    textureBinds: numOrNull(o.textureBinds),
    programBinds: numOrNull(o.programBinds),
    glTextures: numOrNull(o.glTextures),
    glBuffers: numOrNull(o.glBuffers),
    glPrograms: numOrNull(o.glPrograms),
    glFramebuffers: numOrNull(o.glFramebuffers),
    maxTextures: numOrNull(o.maxTextures),
    heapUsed: numOrNull(o.heapUsed),
    heapLimit: numOrNull(o.heapLimit),
    gameW: num(o.gameW),
    gameH: num(o.gameH),
    zoom: num(o.zoom),
    scaleMode: typeof o.scaleMode === "string" && o.scaleMode ? o.scaleMode : "—",
    scenes: typeof o.scenes === "string" && o.scenes ? o.scenes : "—",
    objects: num(o.objects),
    cameras: num(o.cameras),
    tweens: num(o.tweens),
    bodies: num(o.bodies),
    textures: num(o.textures),
    animations: num(o.animations),
    soundsPlaying: num(o.soundsPlaying),
    soundsTotal: num(o.soundsTotal),
    volume: num(o.volume),
    soundMute: o.soundMute === true,
    audioLocked: o.audioLocked === true,
    soundType: typeof o.soundType === "string" && o.soundType ? o.soundType : "—",
  };
}

export function formatSize(width: number, height: number) {
  if (width < 1 || height < 1) return "—";
  return `${Math.round(width)}×${Math.round(height)}`;
}

export function formatFlag(on: boolean) {
  return on ? "evet" : "hayır";
}

/** Olcum daha toplanmadiysa (WebGL yok, kare ilerlemedi) tire gosterir. */
export function formatCount(value: number | null, digits = 0) {
  if (value === null) return "—";
  return value.toFixed(digits);
}

export function formatMb(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(1)} MB`;
}

/** Oyunun sayfada durdugu yerler: once editor kancasi, sonra bilinen global adlar. */
export const PLAY_GAME_GLOBALS = [
  "__PHASER_EDITOR_GAME__",
  "__PHASER_GAME__",
  "game",
  "PHASER_GAME",
] as const;

/** FPS min/max icin sayfada tutulan ornek sayisi (250ms'lik anketle ~10 saniye). */
export const PLAY_FPS_SAMPLES = 40;

/** Runs in the Play guest page world via main-process executeJavaScript. */
export const COLLECT_PLAY_STATS = `(function () {
  function isGame(value) {
    return !!value && typeof value === "object" && !!value.loop && !!value.scene && !!value.scale && !!value.renderer;
  }
  function findGame() {
    var names = ${JSON.stringify(PLAY_GAME_GLOBALS)};
    for (var i = 0; i < names.length; i++) {
      try {
        if (isGame(window[names[i]])) return window[names[i]];
      } catch (err) {}
    }
    var own = Object.getOwnPropertyNames(window);
    for (var j = 0; j < own.length; j++) {
      var key = own[j];
      if (key === "window" || key === "self" || key === "top" || key === "parent" || key === "frames") continue;
      try {
        if (isGame(window[key])) return window[key];
      } catch (err) {}
    }
    return null;
  }
  function viteOverlayText() {
    var overlay = document.querySelector("vite-error-overlay");
    if (!overlay) return "";
    try {
      var body = overlay.shadowRoot && overlay.shadowRoot.querySelector(".message-body");
      var text = body ? body.textContent : overlay.textContent;
      return String(text || "").trim().slice(0, 240);
    } catch (err) {
      return "derleme hatası";
    }
  }
  function notFound() {
    var overlay = viteOverlayText();
    if (overlay) return { found: false, error: "Vite hatası: " + overlay };
    if (document.readyState === "loading") return { found: false, error: "Sayfa yükleniyor…" };
    if (!document.querySelector("canvas")) {
      return { found: false, error: "Sayfada canvas yok — oyun başlamamış olabilir (konsolu kontrol edin)" };
    }
    return {
      found: false,
      error: "Phaser oyunu bulunamadı. Oyunu paylaşmak için main dosyanıza window.__PHASER_GAME__ = game; ekleyin.",
    };
  }
  function perfSlot() {
    var slot = window.__PHASER_EDITOR_PERF__;
    if (!slot) {
      slot = {
        calls: 0, tris: 0, binds: 0, progs: 0, rafFrames: 0,
        lastFrame: 0, lastRaf: 0, lastCalls: 0, lastTris: 0, lastBinds: 0, lastProgs: 0,
        perFrame: null, fps: []
      };
      window.__PHASER_EDITOR_PERF__ = slot;
    }
    return slot;
  }
  /** Phaser'in kare sayaci ilerlemezse kare basina degerleri rAF ile bolebilmek icin. */
  function countFrames(slot) {
    if (window.__phaserEditorRafPatched) return;
    try {
      var orig = window.requestAnimationFrame;
      if (typeof orig !== "function") return;
      window.requestAnimationFrame = function (callback) {
        return orig.call(window, function (time) {
          slot.rafFrames++;
          return callback(time);
        });
      };
      window.__phaserEditorRafPatched = true;
    } catch (err) {}
  }
  /**
   * Phaser 4 draw cagrilarini gl nesnesi uzerinden yapar (instanced surumler gl
   * ornegine ait own property'dir), o yuzden prototip degil ornek sariliyor.
   */
  function instrument(gl, slot) {
    if (!gl || gl.__phaserEditorPatched) return;
    try {
      var trianglesFor = function (mode, count, instances) {
        var tris = 0;
        if (mode === 4) tris = count / 3;
        else if (mode === 5 || mode === 6) tris = Math.max(0, count - 2);
        return tris * (instances > 0 ? instances : 1);
      };
      var wrapDraw = function (name, countIndex, instanceIndex) {
        var orig = gl[name];
        if (typeof orig !== "function") return;
        gl[name] = function () {
          slot.calls++;
          slot.tris += trianglesFor(
            arguments[0],
            arguments[countIndex] || 0,
            instanceIndex >= 0 ? arguments[instanceIndex] || 0 : 0
          );
          return orig.apply(this, arguments);
        };
      };
      wrapDraw("drawElements", 1, -1);
      wrapDraw("drawArrays", 2, -1);
      wrapDraw("drawElementsInstanced", 1, 4);
      wrapDraw("drawArraysInstanced", 2, 3);
      var wrapCount = function (name, key) {
        var orig = gl[name];
        if (typeof orig !== "function") return;
        gl[name] = function () {
          slot[key]++;
          return orig.apply(this, arguments);
        };
      };
      wrapCount("bindTexture", "binds");
      wrapCount("useProgram", "progs");
      gl.__phaserEditorPatched = true;
    } catch (err) {}
  }
  function listLength(value) {
    return value && typeof value.length === "number" ? value.length : null;
  }
  try {
    var game = findGame();
    if (!game) return notFound();
    var SCALE_MODE = { 0: "NONE", 1: "WIDTH_CONTROLS_HEIGHT", 2: "HEIGHT_CONTROLS_WIDTH", 3: "FIT", 4: "ENVELOP", 5: "RESIZE", 6: "EXPAND" };
    var loop = game.loop || {};
    var renderer = game.renderer;
    var scale = game.scale;
    var sound = game.sound;
    var slot = perfSlot();
    var gl = renderer && renderer.gl;
    instrument(gl, slot);
    countFrames(slot);
    var frame = loop.frame || 0;
    var phaserFrames = frame - slot.lastFrame;
    var frames = phaserFrames > 0 ? phaserFrames : slot.rafFrames - slot.lastRaf;
    if (frames > 0) {
      slot.perFrame = {
        calls: (slot.calls - slot.lastCalls) / frames,
        tris: (slot.tris - slot.lastTris) / frames,
        binds: (slot.binds - slot.lastBinds) / frames,
        progs: (slot.progs - slot.lastProgs) / frames
      };
      slot.lastFrame = frame;
      slot.lastRaf = slot.rafFrames;
      slot.lastCalls = slot.calls;
      slot.lastTris = slot.tris;
      slot.lastBinds = slot.binds;
      slot.lastProgs = slot.progs;
      slot.fps.push(loop.actualFps || 0);
      if (slot.fps.length > ${PLAY_FPS_SAMPLES}) slot.fps.shift();
    }
    var fpsMin = null;
    var fpsMax = null;
    for (var f = 0; f < slot.fps.length; f++) {
      var sample = slot.fps[f];
      if (fpsMin === null || sample < fpsMin) fpsMin = sample;
      if (fpsMax === null || sample > fpsMax) fpsMax = sample;
    }
    var perFrame = slot.perFrame;
    var memory = window.performance && window.performance.memory;
    var sceneNames = [];
    var objects = 0;
    var cameras = 0;
    var tweens = 0;
    var bodies = 0;
    var scenes = game.scene && game.scene.getScenes ? game.scene.getScenes(true) : [];
    for (var i = 0; i < scenes.length; i++) {
      var scene = scenes[i];
      if (scene.sys && scene.sys.settings) sceneNames.push(scene.sys.settings.key);
      var list = scene.children && scene.children.list;
      if (list) objects += list.length;
      if (scene.cameras && scene.cameras.cameras) cameras += scene.cameras.cameras.length;
      if (scene.tweens) {
        if (typeof scene.tweens.getTweens === "function") tweens += scene.tweens.getTweens().length;
        else if (scene.tweens.tweens) tweens += scene.tweens.tweens.length;
      }
      var world = scene.physics && scene.physics.world;
      if (world && world.bodies && typeof world.bodies.size === "number") bodies += world.bodies.size;
    }
    var textures = 0;
    if (game.textures) {
      if (typeof game.textures.getTextureKeys === "function") textures = game.textures.getTextureKeys().length;
      else if (game.textures.list) textures = Object.keys(game.textures.list).length;
    }
    var animations = game.anims && game.anims.anims && typeof game.anims.anims.size === "number" ? game.anims.anims.size : 0;
    var soundsPlaying = 0;
    var soundsTotal = 0;
    if (sound) {
      if (typeof sound.getAllPlaying === "function") soundsPlaying = sound.getAllPlaying().length;
      if (sound.sounds && typeof sound.sounds.length === "number") soundsTotal = sound.sounds.length;
    }
    var mode = scale && (scale.scaleMode != null ? scale.scaleMode : scale.mode);
    var soundType = "—";
    if (sound && sound.context) soundType = "Web Audio";
    else if (sound && sound.sounds) soundType = "HTML5";
    else if (sound) soundType = "No Audio";
    return {
      found: true,
      fps: loop.actualFps || 0,
      fpsMin: fpsMin,
      fpsMax: fpsMax,
      delta: loop.delta || 0,
      rawDelta: loop.rawDelta || 0,
      frame: frame,
      paused: !!game.isPaused,
      hasFocus: !!game.hasFocus,
      renderer: renderer && renderer.gl ? "WebGL" : "Canvas",
      canvasW: (renderer && renderer.width) || (game.canvas && game.canvas.width) || 0,
      canvasH: (renderer && renderer.height) || (game.canvas && game.canvas.height) || 0,
      drawCount: renderer && typeof renderer.drawCount === "number" ? renderer.drawCount : null,
      drawCalls: perFrame ? perFrame.calls : null,
      triangles: perFrame ? perFrame.tris : null,
      textureBinds: perFrame ? perFrame.binds : null,
      programBinds: perFrame ? perFrame.progs : null,
      glTextures: listLength(renderer && renderer.glTextureWrappers),
      glBuffers: listLength(renderer && renderer.glBufferWrappers),
      glPrograms: listLength(renderer && renderer.glProgramWrappers),
      glFramebuffers: listLength(renderer && renderer.glFramebufferWrappers),
      maxTextures: renderer && typeof renderer.maxTextures === "number" ? renderer.maxTextures : null,
      heapUsed: memory ? memory.usedJSHeapSize / 1048576 : null,
      heapLimit: memory ? memory.jsHeapSizeLimit / 1048576 : null,
      gameW: (scale && scale.gameSize && scale.gameSize.width) || (scale && scale.width) || 0,
      gameH: (scale && scale.gameSize && scale.gameSize.height) || (scale && scale.height) || 0,
      zoom: scale && typeof scale.zoom === "number" ? scale.zoom : 0,
      scaleMode: SCALE_MODE[mode] || String(mode != null ? mode : "—"),
      scenes: sceneNames.length ? sceneNames.join(", ") : "—",
      objects: objects,
      cameras: cameras,
      tweens: tweens,
      bodies: bodies,
      textures: textures,
      animations: animations,
      soundsPlaying: soundsPlaying,
      soundsTotal: soundsTotal,
      volume: sound && typeof sound.volume === "number" ? sound.volume : 0,
      soundMute: !!(sound && sound.mute),
      audioLocked: !!(sound && sound.locked),
      soundType: soundType
    };
  } catch (err) {
    return { found: false, error: String(err && err.message ? err.message : err) };
  }
})()`;
