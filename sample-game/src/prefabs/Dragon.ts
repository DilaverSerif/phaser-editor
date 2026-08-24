/* START OF COMPILED CODE */
import Phaser from "phaser";

export default class Dragon extends Phaser.GameObjects.Image {
    constructor(scene: Phaser.Scene, x?: number, y?: number, texture?: string, frame?: string) {
        super(scene, x ?? 0, y ?? 0, texture || "dragon", frame || undefined);
        this.setOrigin(0.5, 0.5);
    }
}
/* END OF COMPILED CODE */
