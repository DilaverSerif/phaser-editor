import Phaser from "phaser";
import Level from "./scenes/Level";

const editorPlay = new URLSearchParams(window.location.search).has("editorPlay");
if (editorPlay) document.documentElement.classList.add("editor-play");

// Boot sahnesi: editorun urettigi prefab'in kullandigi "dragon"
// texture'sini olusturur, ardindan Level sahnesini baslatir.
class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  create() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xff5577, 1);
    g.fillCircle(32, 32, 32);
    g.generateTexture("dragon", 64, 64);
    g.destroy();
    this.scene.start("Level");
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: "game",
  backgroundColor: "#202030",
  scene: [Boot, Level],
  ...(editorPlay
    ? {
        render: { powerPreference: "high-performance" as const },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      }
    : {}),
};

const game = new Phaser.Game(config);
(window as Window & { __PHASER_GAME__?: Phaser.Game }).__PHASER_GAME__ = game;
document.documentElement.setAttribute("data-phaser-editor-game", "1");
