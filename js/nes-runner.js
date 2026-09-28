/**
 * JSNES Hardware Emulator Runner for Pinball (Japan, USA).nes
 * Provides 100% authentic 1984 Nintendo NES hardware execution, sound synthesis, and Xbox 360 controller mapping.
 */

class NESRunner {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nes = null;
        this.audioCtx = null;
        this.audioScriptNode = null;
        this.audioBuffer = [];
        this.sampleRate = 44100;
        this.bufferSize = 2048;

        this.frameBuffer = null;
        this.imageData = null;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = 256;
        this.offscreenCanvas.height = 240;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');

        this.isRunning = false;
        this.animationFrameId = null;
        this.romLoaded = false;
        this.lastTime = 0;

        // Controller state tracking
        this.keyState = {};
        this.virtualState = {
            leftFlipper: false,
            rightFlipper: false,
            plunger: false,
            start: false,
            select: false
        };
        this.setupKeyboard();
    }

    init(romPath = 'Pinball_Mario_Hack.nes') {
        if (this.nes) return;

        // Initialize JSNES instance
        this.nes = new jsnes.NES({
            onFrame: (frameBuffer) => {
                this.handleFrame(frameBuffer);
            },
            onAudioSample: (left, right) => {
                if (this.audioBuffer.length < 8192) {
                    this.audioBuffer.push((left + right) * 0.5);
                }
            }
        });

        this.initAudio();
        this.loadROMFile(romPath);
    }

    initAudio() {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        this.audioCtx = new AudioCtx({ sampleRate: this.sampleRate });
        this.audioScriptNode = this.audioCtx.createScriptProcessor(this.bufferSize, 0, 1);

        this.audioScriptNode.onaudioprocess = (e) => {
            const output = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < this.bufferSize; i++) {
                if (this.audioBuffer.length > 0) {
                    output[i] = this.audioBuffer.shift();
                } else {
                    output[i] = 0;
                }
            }
        };

        this.audioScriptNode.connect(this.audioCtx.destination);
    }

    ensureAudio() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    loadROMFile(romPath = 'Pinball_Mario_Hack.nes') {
        this.currentRomPath = romPath;
        const cacheBuster = romPath + '?v=' + Date.now();
        fetch(cacheBuster)
            .then(res => {
                if (!res.ok) throw new Error('Failed to load ROM: ' + res.status);
                return res.arrayBuffer();
            })
            .then(buffer => {
                const bytes = new Uint8Array(buffer);
                let binaryStr = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binaryStr += String.fromCharCode(bytes[i]);
                }
                this.nes.loadROM(binaryStr);
                this.romLoaded = true;
                console.log(romPath + ' loaded into JSNES successfully!');
                const sysStatus = document.getElementById('system-status-text');
                if (sysStatus) {
                    sysStatus.innerText = romPath.includes('Mario') ? 'MARIO ROM HACK' : '1984 NROM-128';
                    sysStatus.style.color = romPath.includes('Mario') ? '#f83800' : '#f8b800';
                }
                this.start();
            })
            .catch(err => {
                if (romPath !== 'Pinball (Japan, USA).nes') {
                    console.log('Pinball_Mario_Hack.nes not found via fetch, attempting fallback to original ROM...');
                    this.loadROMFile('Pinball (Japan, USA).nes');
                } else {
                    console.warn('Could not auto-fetch ROM via HTTP (CORS or file protocol), falling back:', err);
                    this.showManualRomPrompt();
                }
            });
    }

    switchRom(romPath) {
        this.stop();
        this.romLoaded = false;
        this.audioBuffer = [];
        this.nes = new jsnes.NES({
            onFrame: (frameBuffer) => this.handleFrame(frameBuffer),
            onAudioSample: (left, right) => {
                if (this.audioBuffer.length < 8192) {
                    this.audioBuffer.push((left + right) * 0.5);
                }
            }
        });
        this.loadROMFile(romPath);
    }

    showManualRomPrompt() {
        const sidePanel = document.getElementById('side-panel');
        if (sidePanel) {
            const box = document.createElement('div');
            box.className = 'panel-box';
            box.style.borderColor = '#f83800';
            box.innerHTML = `
                <div class="panel-title" style="color:#f83800;">LOAD NES ROM</div>
                <div style="font-size:11px; margin-bottom:8px; color:#ccc;">Select <b>Pinball_Mario_Hack.nes</b> or <b>Pinball.nes</b>:</div>
                <input type="file" id="rom-file-input" accept=".nes" class="retro-btn" style="width:100%; font-size:10px;" />
            `;
            sidePanel.prepend(box);

            document.getElementById('rom-file-input').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const bytes = new Uint8Array(event.target.result);
                        let binaryStr = '';
                        for (let i = 0; i < bytes.byteLength; i++) {
                            binaryStr += String.fromCharCode(bytes[i]);
                        }
                        this.nes.loadROM(binaryStr);
                        this.romLoaded = true;
                        box.remove();
                        this.start();
                    };
                    reader.readAsArrayBuffer(file);
                }
            });
        }
    }

    setupKeyboard() {
        const gameKeys = new Set([
            'Enter', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'KeyZ', 'KeyA', 'KeyD', 'KeyS', 'Slash', 'ShiftLeft', 'ShiftRight', 'Tab'
        ]);

        window.addEventListener('keydown', (e) => {
            if (gameKeys.has(e.code)) {
                e.preventDefault();
                // Clear any focused HTML button so Space/Enter never re-clicks it!
                if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
                    document.activeElement.blur();
                }
            }
            this.ensureAudio();
            this.keyState[e.code] = true;
            this.updateControllers();
        });

        window.addEventListener('keyup', (e) => {
            if (gameKeys.has(e.code)) {
                e.preventDefault();
            }
            this.keyState[e.code] = false;
            this.updateControllers();
        });
    }

    setVirtualButton(btnName, isPressed) {
        this.ensureAudio();
        if (this.virtualState.hasOwnProperty(btnName)) {
            this.virtualState[btnName] = isPressed;
            this.updateControllers();
        }
    }

    pulseVirtualButton(btnName, durationMs = 200) {
        this.setVirtualButton(btnName, true);
        setTimeout(() => {
            this.setVirtualButton(btnName, false);
        }, durationMs);
    }

    updateControllers() {
        if (!this.nes || !this.romLoaded) return;

        const gp = gamepadManager.poll();

        // Left Flipper: D-Pad Left / D-Pad Up (or LT/LB/Z/A/ArrowLeft/virtual)
        const leftFlipper = this.keyState['KeyZ'] || this.keyState['ShiftLeft'] || this.keyState['KeyA'] || this.keyState['ArrowLeft'] || gp.leftFlipper || gp.moveX < -0.3 || this.virtualState.leftFlipper;

        // Right Flipper: Button A / Button B (or RT/RB///D/ArrowRight/virtual)
        const rightFlipper = this.keyState['Slash'] || this.keyState['ShiftRight'] || this.keyState['KeyD'] || this.keyState['ArrowRight'] || gp.rightFlipper || gp.moveX > 0.3 || this.virtualState.rightFlipper;

        // Plunger: Button A / Button B (Space / Down Arrow / S / Gamepad Stick / virtual)
        const plunger = this.keyState['Space'] || this.keyState['ArrowDown'] || this.keyState['KeyS'] || gp.plunger || this.virtualState.plunger;

        // Start: Enter / Gamepad Start / virtual
        const start = this.keyState['Enter'] || gp.start || this.virtualState.start;

        // Select (Switch Game A / Game B): Tab / Gamepad Back / virtual
        const select = this.keyState['Tab'] || gp.nudgeUp || this.virtualState.select;

        // Apply to JSNES Controller 1
        if (leftFlipper) {
            this.nes.buttonDown(1, jsnes.Controller.BUTTON_LEFT);
        } else {
            this.nes.buttonUp(1, jsnes.Controller.BUTTON_LEFT);
        }

        if (rightFlipper || plunger) {
            this.nes.buttonDown(1, jsnes.Controller.BUTTON_A);
        } else {
            this.nes.buttonUp(1, jsnes.Controller.BUTTON_A);
        }

        if (start) {
            this.nes.buttonDown(1, jsnes.Controller.BUTTON_START);
        } else {
            this.nes.buttonUp(1, jsnes.Controller.BUTTON_START);
        }

        if (select) {
            this.nes.buttonDown(1, jsnes.Controller.BUTTON_SELECT);
        } else {
            this.nes.buttonUp(1, jsnes.Controller.BUTTON_SELECT);
        }
    }

    handleFrame(frameBuffer) {
        if (!this.imageData) {
            this.imageData = this.offscreenCtx.createImageData(256, 240);
        }

        const data = this.imageData.data;
        const buf = frameBuffer;

        for (let i = 0; i < 256 * 240; i++) {
            const pixel = buf[i];
            const idx = i * 4;
            // JSNES 32-bit pixel: 0x00BBGGRR or 0xFFRRGGBB
            data[idx] = pixel & 0xFF;         // Red
            data[idx + 1] = (pixel >> 8) & 0xFF;  // Green
            data[idx + 2] = (pixel >> 16) & 0xFF; // Blue
            data[idx + 3] = 0xFF;             // Alpha
        }

        this.offscreenCtx.putImageData(this.imageData, 0, 0);

        // Scale 256x240 up to 480x720 canvas with crisp pixel scaling
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(this.offscreenCanvas, 0, 0, 256, 240, 0, 0, this.canvas.width, this.canvas.height);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop();
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    loop() {
        if (!this.isRunning) return;

        this.updateControllers();
        if (this.nes && this.romLoaded) {
            this.nes.frame();
        }

        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }

    reset() {
        if (this.nes && this.romLoaded) {
            this.nes.reloadROM();
        }
    }
}

const nesRunner = new NESRunner();
window.nesRunner = nesRunner;
