import {
  formatCount,
  formatFlag,
  formatMb,
  formatSize,
  type PlayStats,
} from "../play/playStats";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="play-stats-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Group({ label }: { label: string }) {
  return <div className="play-stats-group">{label}</div>;
}

function fpsRange(stats: PlayStats) {
  if (stats.fpsMin === null || stats.fpsMax === null) return "—";
  return `${stats.fpsMin.toFixed(0)} / ${stats.fpsMax.toFixed(0)}`;
}

export function PlayStatsWindow({ stats }: { stats: PlayStats }) {
  if (!stats.found) {
    return (
      <aside className="play-stats" aria-label="Phaser istatistikleri">
        <div className="play-stats-head">Phaser</div>
        <div className="play-stats-empty">
          {stats.error || "Oyun bağlanamadı"}
        </div>
      </aside>
    );
  }
  return (
    <aside className="play-stats" aria-label="Phaser istatistikleri">
      <div className="play-stats-head">Phaser</div>
      <div className="play-stats-body">
        <Group label="Kare" />
        <Row label="FPS" value={stats.fps > 0 ? stats.fps.toFixed(1) : "—"} />
        <Row label="FPS min / max" value={fpsRange(stats)} />
        <Row label="Delta" value={`${stats.delta.toFixed(1)} ms`} />
        <Row
          label="Raw delta"
          value={stats.rawDelta > 0 ? `${stats.rawDelta.toFixed(1)} ms` : "—"}
        />
        <Row label="Frame" value={String(Math.round(stats.frame))} />
        <Row label="Duraklatıldı" value={formatFlag(stats.paused)} />
        <Row label="Odak" value={formatFlag(stats.hasFocus)} />

        <Group label="Çizim" />
        <Row label="Renderer" value={stats.renderer} />
        <Row label="Draw call / kare" value={formatCount(stats.drawCalls, 1)} />
        <Row label="Üçgen / kare" value={formatCount(stats.triangles, 0)} />
        <Row label="Texture bind / kare" value={formatCount(stats.textureBinds, 1)} />
        <Row label="Shader bind / kare" value={formatCount(stats.programBinds, 1)} />
        {stats.drawCount !== null && (
          <Row label="Çizilen nesne" value={String(stats.drawCount)} />
        )}
        <Row label="Canvas" value={formatSize(stats.canvasW, stats.canvasH)} />
        <Row label="Game size" value={formatSize(stats.gameW, stats.gameH)} />
        <Row label="Scale" value={stats.scaleMode} />
        <Row label="Zoom" value={stats.zoom > 0 ? stats.zoom.toFixed(2) : "—"} />

        <Group label="GPU kaynakları" />
        <Row label="GL texture" value={formatCount(stats.glTextures)} />
        <Row label="GL buffer" value={formatCount(stats.glBuffers)} />
        <Row label="GL shader" value={formatCount(stats.glPrograms)} />
        <Row label="GL framebuffer" value={formatCount(stats.glFramebuffers)} />
        <Row label="Texture unit" value={formatCount(stats.maxTextures)} />

        <Group label="Bellek" />
        <Row label="JS heap" value={formatMb(stats.heapUsed)} />
        <Row label="Heap limit" value={formatMb(stats.heapLimit)} />
        <Row label="Texture" value={String(stats.textures)} />
        <Row label="Animasyon" value={String(stats.animations)} />

        <Group label="Sahne" />
        <Row label="Sahneler" value={stats.scenes} />
        <Row label="Display list" value={String(stats.objects)} />
        <Row label="Kameralar" value={String(stats.cameras)} />
        <Row label="Tween" value={String(stats.tweens)} />
        <Row label="Arcade body" value={String(stats.bodies)} />

        <Group label="Ses" />
        <Row label="Tür" value={stats.soundType} />
        <Row label="Çalan / toplam" value={`${stats.soundsPlaying} / ${stats.soundsTotal}`} />
        <Row label="Volume" value={`${Math.round(stats.volume * 100)}%`} />
        <Row label="Sound mute" value={formatFlag(stats.soundMute)} />
        <Row label="Audio locked" value={formatFlag(stats.audioLocked)} />
      </div>
    </aside>
  );
}
