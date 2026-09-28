/**
 * Gamepad & Xbox 360 Controller Manager with Haptic Rumble Feedback
 */

class ControllerManager {
    constructor() {
        this.gamepadIndex = null;
        this.gamepadName = 'No Controller';
        this.connected = false;

        // Input state flags
        this.state = {
            leftFlipper: false,
            rightFlipper: false,
            plunger: false,
            plungerPower: 0,
            nudgeLeft: false,
            nudgeRight: false,
            nudgeUp: false,
            start: false,
            moveX: 0 // -1 to 1 for Minigame / Pip movement
        };

        this.prevButtons = {};
        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('gamepadconnected', (e) => {
            this.gamepadIndex = e.gamepad.index;
            this.gamepadName = e.gamepad.id;
            this.connected = true;
            console.log('Gamepad connected:', e.gamepad.id);
            this.updateStatusUI();
            this.rumble(80, 0.4, 0.4);
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            if (this.gamepadIndex === e.gamepad.index) {
                this.gamepadIndex = null;
                this.connected = false;
                this.gamepadName = 'No Controller';
                console.log('Gamepad disconnected');
                this.updateStatusUI();
            }
        });
    }

    poll() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;

        if (this.gamepadIndex !== null && gamepads[this.gamepadIndex]) {
            gp = gamepads[this.gamepadIndex];
        } else {
            // Auto find first available
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]) {
                    gp = gamepads[i];
                    this.gamepadIndex = i;
                    this.connected = true;
                    this.gamepadName = gp.id;
                    break;
                }
            }
        }

        if (!gp) {
            this.connected = false;
            return this.state;
        }

        // Xbox 360 / Standard mapping
        // Buttons:
        // 0: A, 1: B, 2: X, 3: Y
        // 4: LB, 5: RB, 6: LT (trigger), 7: RT (trigger)
        // 8: Back, 9: Start
        // 12: D-Up, 13: D-Down, 14: D-Left, 15: D-Right

        const btn = (idx) => {
            if (!gp.buttons[idx]) return false;
            return typeof gp.buttons[idx] === 'object' ? gp.buttons[idx].pressed : gp.buttons[idx] > 0.5;
        };

        const btnVal = (idx) => {
            if (!gp.buttons[idx]) return 0;
            return typeof gp.buttons[idx] === 'object' ? gp.buttons[idx].value : (gp.buttons[idx] ? 1 : 0);
        };

        // Left flipper: LT (6) or LB (4) or X (2) or D-Left (14)
        const leftTrigger = btnVal(6) > 0.15 || btn(4) || btn(2) || btn(14);
        // Right flipper: RT (7) or RB (5) or B (1) or D-Right (15)
        const rightTrigger = btnVal(7) > 0.15 || btn(5) || btn(1) || btn(15);

        // Plunger: A button (0), D-Down (13), Right stick down (axis 3 > 0.3)
        const aButton = btn(0);
        const dDown = btn(13);
        const stickDown = (gp.axes && gp.axes[3] > 0.3) || (gp.axes && gp.axes[1] > 0.3);
        const plungerActive = aButton || dDown || stickDown;

        // Minigame movement: Left Stick X (axis 0) or D-Pad Left/Right
        let moveX = 0;
        if (gp.axes && Math.abs(gp.axes[0]) > 0.2) {
            moveX = gp.axes[0];
        } else if (btn(14)) {
            moveX = -1;
        } else if (btn(15)) {
            moveX = 1;
        }

        // Nudge
        const nudgeLeft = btn(2) && !leftTrigger;
        const nudgeRight = btn(1) && !rightTrigger;
        const nudgeUp = btn(3) || btn(12);

        // Start
        const start = btn(9) || btn(8);

        this.state.leftFlipper = leftTrigger;
        this.state.rightFlipper = rightTrigger;
        this.state.plunger = plungerActive;
        this.state.moveX = moveX;
        this.state.nudgeLeft = nudgeLeft;
        this.state.nudgeRight = nudgeRight;
        this.state.nudgeUp = nudgeUp;
        this.state.start = start;

        return this.state;
    }

    // Xbox 360 Vibration Actuator
    rumble(duration = 100, weak = 0.5, strong = 0.5) {
        if (!this.connected || this.gamepadIndex === null) return;
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[this.gamepadIndex];
        if (gp && gp.vibrationActuator && typeof gp.vibrationActuator.playEffect === 'function') {
            try {
                gp.vibrationActuator.playEffect('dual-rumble', {
                    startDelay: 0,
                    duration: duration,
                    weakMagnitude: Math.min(1, Math.max(0, weak)),
                    strongMagnitude: Math.min(1, Math.max(0, strong))
                }).catch(() => {});
            } catch (err) {
                // Ignore unsupported actuator error
            }
        }
    }

    updateStatusUI() {
        const el = document.getElementById('ctrl-status-text');
        const dot = document.getElementById('ctrl-indicator-dot');
        const nameEl = document.getElementById('ctrl-name-text');
        if (el && dot) {
            if (this.connected) {
                el.innerText = 'CONNECTED';
                el.className = 'ctrl-status';
                dot.className = 'indicator-dot';
                if (nameEl) {
                    nameEl.innerText = this.gamepadName.substring(0, 24);
                }
            } else {
                el.innerText = 'DISCONNECTED';
                el.className = 'ctrl-status disconnected';
                dot.className = 'indicator-dot off';
                if (nameEl) {
                    nameEl.innerText = 'Connect Xbox Controller or use Keyboard';
                }
            }
        }
    }
}

const gamepadManager = new ControllerManager();
