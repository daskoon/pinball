
const fs = require('fs');
const jsnes = require('./js/jsnes.min.js');

const rom = fs.readFileSync('Pinball (Japan, USA).nes', 'binary');
const nes = new jsnes.NES({
    onFrame: () => {},
    onAudioSample: () => {}
});

nes.loadROM(rom);
for (let i = 0; i < 30; i++) nes.frame();
nes.buttonDown(1, jsnes.Controller.BUTTON_START);
for (let i = 0; i < 10; i++) nes.frame();
nes.buttonUp(1, jsnes.Controller.BUTTON_START);

// Run 200 frames to enter Scene A/B
for (let f = 0; f < 300; f++) {
    nes.frame();
    // Scan sprites
    for (let s = 0; s < 64; s++) {
        const y = nes.ppu.spriteMem[s * 4];
        const tile = nes.ppu.spriteMem[s * 4 + 1];
        const attr = nes.ppu.spriteMem[s * 4 + 2];
        const x = nes.ppu.spriteMem[s * 4 + 3];
        if (y < 240 && tile > 0) {
            // Check if eggs (around 84, 85 or others)
            // or flippers (192..)
        }
    }
}

// Dump all active sprites at frame 300
console.log('Active sprites at frame 300:');
for (let s = 0; s < 64; s++) {
    const y = nes.ppu.spriteMem[s * 4];
    const tile = nes.ppu.spriteMem[s * 4 + 1];
    const attr = nes.ppu.spriteMem[s * 4 + 2];
    const x = nes.ppu.spriteMem[s * 4 + 3];
    if (y < 240 && (x > 0 || y > 0)) {
        console.log(Sprite : tile= (0x), attr=0x, pos=(,));
    }
}
