/* START OF COMPILED CODE */
import Phaser from "phaser";
import Dragon from "../prefabs/Dragon";

export default class Level extends Phaser.Scene {
    constructor() {
        super("Level");
    }

    create() {
        const background = this.add.rectangle(640, 360, 64, 64, 0x44aa88);
        const Dragon_1 = new Dragon(this, 300, 200);
        this.add.existing(Dragon_1);
        const Dragon_2 = new Dragon(this, 500, 300);
        this.add.existing(Dragon_2);
        const title = this.add.text(640, 80, "Merhaba Phaser", {"fontSize":"40px","color":"#ffffff"});
    }
}
/* END OF COMPILED CODE */
