/**
 * LIVE NES TILE & PIXEL STUDIO
 * Allows real-time interactive pixel editing of NES Pinball CHR-ROM graphics
 * Updates running JSNES emulator VRAM in real-time and exports patched .NES ROMs.
 */

class TileStudio {
    constructor() {
        this.selectedTile = 144; // Default to ball
        this.patternTable = 0;   // 0 = Sprites, 1 = Background
        this.currentColor = 3;   // 0..3 (NES 2-bit color index)
        this.paletteColors = ['#0f0f0f', '#ffffff', '#222222', '#f83800'];
        this.isPainting = false;
        this.currentTileData = new Uint8Array(16); // 16 bytes for 8x8 2bpp tile
        this.pixelBuffer = new Uint8Array(64);     // 8x8 pixels (0..3)

        this.initUI();
    }

    initUI() {
        // Modal overlay
        const modal = document.createElement('div');
        modal.id = 'tile-studio-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div id="tile-studio-backdrop" onclick="window.tileStudio.close()"></div>
            <div id="tile-studio-container">
                <div class="studio-header">
                    <span class="studio-title">👾 LIVE NES PIXEL & TILE STUDIO</span>
                    <button class="studio-close-btn" onclick="window.tileStudio.close()">✖ CLOSE</button>
                </div>

                <div class="studio-body">
                    <!-- Left: Pattern Table Tile Sheet -->
                    <div class="studio-col">
                        <div class="studio-subtitle">CHR PATTERN TABLE (${this.patternTable === 0 ? 'SPRITES' : 'BG'})</div>
                        <div style="margin-bottom: 6px; display: flex; gap: 6px;">
                            <button class="retro-btn" id="btn-pt-0" onclick="window.tileStudio.setPatternTable(0)" style="font-size:10px; padding:4px 8px; background:#f83800;">SPRITES (PT0)</button>
                            <button class="retro-btn" id="btn-pt-1" onclick="window.tileStudio.setPatternTable(1)" style="font-size:10px; padding:4px 8px; background:#333;">BACKGROUND (PT1)</button>
                        </div>
                        <div class="chr-sheet-wrap">
                            <canvas id="chr-sheet-canvas" width="128" height="128"></canvas>
                        </div>
                        <div style="font-size:10px; color:#aaa; margin-top:4px;">Click any tile on the sheet to edit.</div>

                        <!-- Quick Jump Presets -->
                        <div class="studio-presets">
                            <span style="font-size:10px; color:#f8b800; font-weight:bold;">QUICK SELECT:</span>
                            <button class="preset-btn" onclick="window.tileStudio.selectTile(144, 0)">🔴 Ball TL (144)</button>
                            <button class="preset-btn" onclick="window.tileStudio.selectTile(145, 0)">🔴 Ball TR (145)</button>
                            <button class="preset-btn" onclick="window.tileStudio.selectTile(146, 0)">🔴 Ball BL (146)</button>
                            <button class="preset-btn" onclick="window.tileStudio.selectTile(212, 0)">🍄 Goomba TL (212)</button>
                            <button class="preset-btn" onclick="window.tileStudio.selectTile(184, 0)">🪽 Wing (184)</button>
                            <button class="preset-btn" onclick="window.tileStudio.selectTile(187, 0)">🐢 Shell (187)</button>
                        </div>
                    </div>

                    <!-- Center: 8x8 Zoom Pixel Grid -->
                    <div class="studio-col center-col">
                        <div class="studio-subtitle">TILE #<span id="studio-tile-idx">144</span> (8x8 PIXEL GRID)</div>
                        <div class="pixel-canvas-wrap">
                            <canvas id="pixel-zoom-canvas" width="240" height="240"></canvas>
                        </div>

                        <!-- Color Palette Picker -->
                        <div class="palette-bar">
                            <span style="font-size:11px; margin-right:4px;">COLOR:</span>
                            <div class="pal-swatch selected" data-c="0" style="background:#0f0f0f; border-color:#fff;" onclick="window.tileStudio.setColor(0)">0 (Trans)</div>
                            <div class="pal-swatch" data-c="1" style="background:#ffffff; color:#000;" onclick="window.tileStudio.setColor(1)">1 (White)</div>
                            <div class="pal-swatch" data-c="2" style="background:#222222;" onclick="window.tileStudio.setColor(2)">2 (Black)</div>
                            <div class="pal-swatch" data-c="3" style="background:#f83800;" onclick="window.tileStudio.setColor(3)">3 (Red)</div>
                        </div>

                        <div class="studio-actions">
                            <button class="retro-btn" style="background:#00e800; color:#000; font-weight:bold;" onclick="window.tileStudio.applyLive()">
                                ⚡ INJECT INTO GAME LIVE
                            </button>
                            <button class="retro-btn" style="background:#0088f8; color:#fff;" onclick="window.tileStudio.exportRom()">
                                💾 SAVE & DOWNLOAD .NES
                            </button>
                            <button class="retro-btn" style="background:#444;" onclick="window.tileStudio.clearTile()">
                                🗑 CLEAR
                            </button>
                        </div>
                    </div>

                    <!-- Right: Tools, Help & Desktop YY-CHR Launcher -->
                    <div class="studio-col right-col">
                        <div class="studio-subtitle">ROM HACKING TOOLS</div>
                        <div class="tool-card">
                            <div style="color:#f8b800; font-weight:bold; font-size:12px; margin-bottom:4px;">💻 DESKTOP TILE EDITOR: YY-CHR</div>
                            <div style="font-size:11px; color:#ccc; line-height:1.4;">
                                We also installed <strong>YY-CHR</strong> locally into your project folder!
                                <br><br>
                                To launch the full Windows desktop graphics suite, run:
                                <div style="background:#000; color:#00e800; padding:6px; font-family:monospace; margin:6px 0; border:1px solid #333; font-size:11px;">
                                    .\launch_tile_editor.bat
                                </div>
                                Inside YY-CHR, you can copy/paste 16x16 sprites directly between ROMs and edit with complete palette control.
                            </div>
                        </div>

                        <div class="tool-card" style="margin-top:10px;">
                            <div style="color:#00e800; font-weight:bold; font-size:12px; margin-bottom:4px;">💡 LIVE EDITING GUIDE</div>
                            <div style="font-size:11px; color:#ccc; line-height:1.4;">
                                1. Pick a tile on the left sheet.<br>
                                2. Click and paint with mouse on the 8x8 grid.<br>
                                3. Click <strong>INJECT INTO GAME LIVE</strong>.<br>
                                The running pinball table updates immediately without restarting!
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        this.sheetCanvas = document.getElementById('chr-sheet-canvas');
        this.sheetCtx = this.sheetCanvas.getContext('2d');
        this.zoomCanvas = document.getElementById('pixel-zoom-canvas');
        this.zoomCtx = this.zoomCanvas.getContext('2d');

        this.bindEvents();
    }

    bindEvents() {
        // Pixel zoom canvas painting
        const getCoord = (e) => {
            const rect = this.zoomCanvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / (rect.width / 8));
            const y = Math.floor((e.clientY - rect.top) / (rect.height / 8));
            return { x: Math.max(0, Math.min(7, x)), y: Math.max(0, Math.min(7, y)) };
        };

        this.zoomCanvas.addEventListener('mousedown', (e) => {
            this.isPainting = true;
            const { x, y } = getCoord(e);
            this.setPixel(x, y, this.currentColor);
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPainting) {
                const { x, y } = getCoord(e);
                this.setPixel(x, y, this.currentColor);
            }
        });

        window.addEventListener('mouseup', () => {
            this.isPainting = false;
        });

        // Click on CHR sheet to pick tile
        this.sheetCanvas.addEventListener('click', (e) => {
            const rect = this.sheetCanvas.getBoundingClientRect();
            const tx = Math.floor((e.clientX - rect.left) / (rect.width / 16));
            const ty = Math.floor((e.clientY - rect.top) / (rect.height / 16));
            const tileIdx = ty * 16 + tx;
            this.selectTile(tileIdx, this.patternTable);
        });
    }

    open() {
        document.getElementById('tile-studio-modal').style.display = 'flex';
        this.refreshFromEmulator();
        this.selectTile(this.selectedTile, this.patternTable);
    }

    close() {
        document.getElementById('tile-studio-modal').style.display = 'none';
    }

    setPatternTable(pt) {
        this.patternTable = pt;
        document.getElementById('btn-pt-0').style.background = pt === 0 ? '#f83800' : '#333';
        document.getElementById('btn-pt-1').style.background = pt === 1 ? '#f83800' : '#333';
        this.drawSheet();
        this.loadTile(this.selectedTile);
    }

    selectTile(idx, pt) {
        if (pt !== undefined && pt !== this.patternTable) {
            this.setPatternTable(pt);
        }
        this.selectedTile = idx;
        document.getElementById('studio-tile-idx').textContent = idx + (this.patternTable === 1 ? ' (BG)' : ' (SPR)');
        this.loadTile(idx);
        this.drawSheet();
    }

    setColor(c) {
        this.currentColor = c;
        document.querySelectorAll('.pal-swatch').forEach(el => {
            el.classList.toggle('selected', parseInt(el.dataset.c) === c);
        });
    }

    refreshFromEmulator() {
        if (window.nesRunner && window.nesRunner.nes) {
            // Palette update
            const ppu = window.nesRunner.nes.ppu;
            // Let's grab sprite palette 0 colors
            const nesColors = [
                '#000000', '#001088', '#0020a8', '#440098', '#800068', '#a00000', '#a40000', '#7c1800',
                '#382c00', '#004400', '#004400', '#003c14', '#002c5c', '#000000', '#000000', '#000000',
                '#606060', '#0070ec', '#184cfc', '#682cfc', '#9800dc', '#d80060', '#e40010', '#ac3800',
                '#5c5c00', '#007800', '#006800', '#005834', '#004088', '#000000', '#000000', '#000000',
                '#bcbcbc', '#3cbcfc', '#6888fc', '#9878fc', '#f858f8', '#f85898', '#f87858', '#fca044',
                '#f8b800', '#b8f818', '#58d854', '#58f898', '#00e8d8', '#787878', '#000000', '#000000',
                '#fcfcfc', '#a4e8fc', '#bcb4fc', '#dcb4fc', '#fcb4fc', '#fca0e4', '#fcb4b4', '#fcd8a8',
                '#fce4a0', '#e4fc98', '#acfca4', '#a4f8d4', '#a4fcfc', '#f8f8f8', '#000000', '#000000'
            ];
            const p0 = ppu.vramMem[0x3F10 + 0] & 0x3F;
            const p1 = ppu.vramMem[0x3F10 + 1] & 0x3F;
            const p2 = ppu.vramMem[0x3F10 + 2] & 0x3F;
            const p3 = ppu.vramMem[0x3F10 + 3] & 0x3F;

            // If PPU palettes are uninitialized, use default Mario / Retro swatches
            if (p1 === 0 && p2 === 0 && p3 === 0) {
                this.paletteColors = ['#0f0f0f', '#ffffff', '#222222', '#f83800'];
            } else {
                this.paletteColors = [
                    '#0f0f0f',
                    nesColors[p1] || '#ffffff',
                    nesColors[p2] || '#222222',
                    nesColors[p3] || '#f83800'
                ];
            }

            // Update swatch visuals
            document.querySelectorAll('.pal-swatch').forEach(el => {
                const c = parseInt(el.dataset.c);
                el.style.backgroundColor = this.paletteColors[c];
            });
        } else {
            this.paletteColors = ['#0f0f0f', '#ffffff', '#222222', '#f83800'];
        }
        this.drawSheet();
        this.loadTile(this.selectedTile);
    }

    loadTile(tileIdx) {
        if (!window.nesRunner || !window.nesRunner.nes) return;
        const vram = window.nesRunner.nes.ppu.vramMem;
        const baseOffset = (this.patternTable * 256 + tileIdx) * 16;

        for (let y = 0; y < 8; y++) {
            const p0 = vram[baseOffset + y];
            const p1 = vram[baseOffset + 8 + y];
            for (let x = 0; x < 8; x++) {
                const b0 = (p0 >> (7 - x)) & 1;
                const b1 = (p1 >> (7 - x)) & 1;
                this.pixelBuffer[y * 8 + x] = (b1 << 1) | b0;
            }
        }
        this.renderZoom();
    }

    setPixel(x, y, color) {
        if (this.pixelBuffer[y * 8 + x] === color) return;
        this.pixelBuffer[y * 8 + x] = color;
        this.renderZoom();
        this.updateSheetTile(this.selectedTile);
    }

    clearTile() {
        this.pixelBuffer.fill(0);
        this.renderZoom();
        this.updateSheetTile(this.selectedTile);
    }

    renderZoom() {
        const ctx = this.zoomCtx;
        const scale = 30; // 240 / 8 = 30px per pixel
        ctx.clearRect(0, 0, 240, 240);

        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const c = this.pixelBuffer[y * 8 + x];
                ctx.fillStyle = this.paletteColors[c];
                ctx.fillRect(x * scale, y * scale, scale, scale);

                // Grid lines
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 1;
                ctx.strokeRect(x * scale, y * scale, scale, scale);
            }
        }
    }

    drawSheet() {
        if (!window.nesRunner || !window.nesRunner.nes) return;
        const vram = window.nesRunner.nes.ppu.vramMem;
        const ctx = this.sheetCtx;
        const imgData = ctx.createImageData(128, 128);
        const data = imgData.data;

        const tableBase = this.patternTable * 4096;

        for (let tile = 0; tile < 256; tile++) {
            const tx = (tile % 16) * 8;
            const ty = Math.floor(tile / 16) * 8;
            const tileOffset = tableBase + tile * 16;

            for (let y = 0; y < 8; y++) {
                const p0 = vram[tileOffset + y];
                const p1 = vram[tileOffset + 8 + y];

                for (let x = 0; x < 8; x++) {
                    const b0 = (p0 >> (7 - x)) & 1;
                    const b1 = (p1 >> (7 - x)) & 1;
                    const c = (b1 << 1) | b0;

                    const hex = this.paletteColors[c];
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);

                    const idx = ((ty + y) * 128 + (tx + x)) * 4;
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = 255;
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);

        // Highlight selected tile
        const stx = (this.selectedTile % 16) * 8;
        const sty = Math.floor(this.selectedTile / 16) * 8;
        ctx.strokeStyle = '#00e800';
        ctx.lineWidth = 1;
        ctx.strokeRect(stx + 0.5, sty + 0.5, 7, 7);
    }

    updateSheetTile(tileIdx) {
        const tx = (tileIdx % 16) * 8;
        const ty = Math.floor(tileIdx / 16) * 8;
        const ctx = this.sheetCtx;

        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const c = this.pixelBuffer[y * 8 + x];
                ctx.fillStyle = this.paletteColors[c];
                ctx.fillRect(tx + x, ty + y, 1, 1);
            }
        }

        // Retain selection box
        ctx.strokeStyle = '#00e800';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 0.5, ty + 0.5, 7, 7);
    }

    encodeBuffer() {
        const p0 = new Uint8Array(8);
        const p1 = new Uint8Array(8);

        for (let y = 0; y < 8; y++) {
            let b0 = 0;
            let b1 = 0;
            for (let x = 0; x < 8; x++) {
                const val = this.pixelBuffer[y * 8 + x];
                b0 = (b0 << 1) | (val & 1);
                b1 = (b1 << 1) | ((val >> 1) & 1);
            }
            p0[y] = b0;
            p1[y] = b1;
        }

        const out = new Uint8Array(16);
        out.set(p0, 0);
        out.set(p1, 8);
        return out;
    }

    applyLive() {
        if (!window.nesRunner || !window.nesRunner.nes) return;
        const encoded = this.encodeBuffer();
        const vram = window.nesRunner.nes.ppu.vramMem;
        const baseOffset = (this.patternTable * 256 + this.selectedTile) * 16;

        vram.set(encoded, baseOffset);

        // Flash notification
        const btn = event ? event.target : null;
        if (btn) {
            const origText = btn.textContent;
            btn.textContent = '✔ INJECTED!';
            btn.style.background = '#ffffff';
            setTimeout(() => {
                btn.textContent = origText;
                btn.style.background = '#00e800';
            }, 600);
        }
    }

    async exportRom() {
        if (!window.nesRunner) return;
        // Fetch current base ROM
        const resp = await fetch('Pinball_Mario_Hack.nes');
        const buf = await resp.arrayBuffer();
        const romData = new Uint8Array(buf);

        // Sync currently running VRAM CHR data (8KB at offset 16 + 16384)
        if (window.nesRunner.nes) {
            const vram = window.nesRunner.nes.ppu.vramMem;
            romData.set(vram.subarray(0, 8192), 16 + 16384);
        }

        // Trigger download
        const blob = new Blob([romData], { type: 'application/octet-stream' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'Pinball_Custom_Hack.nes';
        a.click();
    }
}

// Auto-initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.tileStudio = new TileStudio();
});
