/**
 * Main NES Pinball Game Controller & State Machine
 */

const STATE = {
    TITLE: 'TITLE',
    PLAYING: 'PLAYING',
    BONUS_STAGE: 'BONUS_STAGE',
    GAME_OVER: 'GAME_OVER'
};

class PinballGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.width = 480;
        this.height = 720;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.physics = new PhysicsWorld();
        this.tableManager = new TableManager();
        this.ball = new Ball(448, 1370, 7);

        this.state = STATE.TITLE;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('nes_pinball_highscore') || '25000', 10);
        this.ballsLeft = 3;
        this.multiplier = 1;
        this.bonusOpen = false;

        // Camera scroll
        this.cameraY = 720; // 0 = upper (Scene A), 720 = lower (Scene B)
        this.targetCameraY = 720;

        // Plunger
        this.plungerPower = 0;
        this.plungerCharging = false;

        // Visual effects & particles
        this.particles = [];
        this.floatingTexts = [];
        this.titleBlinkTimer = 0;
        this.tiltWarnings = 0;
        this.tiltTimer = 0;
        this.screenShake = 0;

        // Game Mode A (Normal) vs Game Mode B (Heavy Ball / Expert)
        this.gameMode = 'A';

        // Keyboard tracking
        this.keys = {};
        this.isRunning = false;
        this.animationFrameId = null;
        this.setupKeyboard();

        this.lastTime = performance.now();
        this.init();
    }

    init() {
        this.updateScoreUI();
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;
            audio.ensureContext();
            this.keys[e.code] = true;

            if (e.code === 'KeyN' || e.code === 'KeyX') {
                this.triggerNudge();
            }

            if ((e.code === 'Enter' || e.code === 'Space') && (this.state === STATE.TITLE || this.state === STATE.GAME_OVER)) {
                this.startNewGame();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (!this.isRunning) return;
            this.keys[e.code] = false;
        });
    }

    setGameMode(mode) {
        this.gameMode = mode;
        if (mode === 'B') {
            this.physics.gravity.set(0, 640); // Faster, heavier ball
        } else {
            this.physics.gravity.set(0, 520); // Classic balance
        }
    }

    startNewGame() {
        audio.ensureContext();
        audio.playGameStart();
        this.score = 0;
        this.ballsLeft = 3;
        this.multiplier = 1;
        this.bonusOpen = false;
        this.tiltWarnings = 0;
        this.physics.isTilted = false;

        this.tableManager.initTables();
        this.resetBallToShooter();
        this.state = STATE.PLAYING;
        this.updateScoreUI();
    }

    resetBallToShooter() {
        this.ball.reset(448, 1370);
        this.ball.inPlay = false;
        this.targetCameraY = 720;
        this.cameraY = 720;
        this.plungerPower = 0;
        this.plungerCharging = false;
    }

    triggerNudge() {
        if (this.state !== STATE.PLAYING || !this.ball.inPlay) return;

        this.tiltTimer = 30;
        this.tiltWarnings++;
        this.screenShake = 7;

        if (this.tiltWarnings >= 3) {
            this.physics.isTilted = true;
            audio.playTilt();
            this.addFloatingText('TILT!', 240, this.cameraY + 300, '#f83800');
        } else {
            audio.playSlingshot();
            this.ball.vel.x += (Math.random() - 0.5) * 160;
            this.ball.vel.y -= 70;
            this.addFloatingText('NUDGE', 240, this.cameraY + 350, '#f8b800');
        }
    }

    forceRecoverBall() {
        if (this.state === STATE.PLAYING && this.ball.inPlay) {
            this.ball.vel.x = (Math.random() - 0.5) * 200;
            this.ball.vel.y = -350;
            this.addFloatingText('RECOVERED!', 240, this.cameraY + 300, '#00e8d8');
        }
    }

    addFloatingText(text, x, y, color = '#fcfcfc') {
        this.floatingTexts.push({
            text, x, y, color, life: 1.0, vy: -30
        });
    }

    updateScoreUI() {
        const scoreEl = document.getElementById('score-text');
        const highEl = document.getElementById('high-score-text');
        const ballEl = document.getElementById('balls-text');

        if (scoreEl) scoreEl.innerText = this.score.toString().padStart(6, '0');
        if (highEl) highEl.innerText = this.highScore.toString().padStart(6, '0');
        if (ballEl) ballEl.innerText = 'BALL: ' + Math.max(1, this.ballsLeft);

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('nes_pinball_highscore', this.highScore.toString());
            if (highEl) highEl.innerText = this.highScore.toString().padStart(6, '0');
        }
    }

    addScore(pts) {
        const added = pts * this.multiplier;
        this.score += added;
        this.updateScoreUI();
    }

    // ==========================================
    // MAIN GAME LOOP
    // ==========================================
    loop(timestamp) {
        if (!this.isRunning) return;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        this.handleInput(dt);
        this.update(dt);
        this.render();

        if (this.isRunning) {
            this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
        }
    }

    handleInput(dt) {
        const gp = gamepadManager.poll();

        const leftDown = !this.physics.isTilted && (
            this.keys['KeyZ'] || this.keys['ShiftLeft'] || this.keys['KeyA'] || this.keys['ArrowLeft'] || gp.leftFlipper
        );
        const rightDown = !this.physics.isTilted && (
            this.keys['Slash'] || this.keys['ShiftRight'] || this.keys['KeyD'] || this.keys['ArrowRight'] || gp.rightFlipper
        );
        const plungerKey = this.keys['Space'] || this.keys['ArrowDown'] || this.keys['KeyS'] || gp.plunger;

        if (gp.start && (this.state === STATE.TITLE || this.state === STATE.GAME_OVER)) {
            this.startNewGame();
        }

        if (this.state === STATE.PLAYING) {
            const flippers = this.tableManager.playfield.flippers;
            if (flippers && flippers.length >= 4) {
                if (leftDown && (!flippers[0].isPressed || !flippers[2].isPressed)) audio.playFlipper();
                if (rightDown && (!flippers[1].isPressed || !flippers[3].isPressed)) audio.playFlipper();

                flippers[0].isPressed = leftDown;
                flippers[2].isPressed = leftDown;
                flippers[1].isPressed = rightDown;
                flippers[3].isPressed = rightDown;
            }

            if (!this.ball.inPlay) {
                if (plungerKey) {
                    this.plungerCharging = true;
                    this.plungerPower = Math.min(1.0, this.plungerPower + dt * 2.2);
                    audio.playPlungerRatchet(this.plungerPower);
                    gamepadManager.rumble(40, 0.15 * this.plungerPower, 0.25 * this.plungerPower);
                } else if (this.plungerCharging) {
                    this.plungerCharging = false;
                    const launchSpeed = 1400 + this.plungerPower * 450;
                    this.ball.vel.set(0, -launchSpeed);
                    this.ball.inPlay = true;
                    audio.playPlungerRelease();
                    gamepadManager.rumble(160, 0.7, 0.9);
                    this.plungerPower = 0;
                }
            }
        } else if (this.state === STATE.BONUS_STAGE) {
            const minigame = this.tableManager.bonusMinigame;
            let moveDir = 0;
            if (this.keys['ArrowLeft'] || this.keys['KeyA'] || gp.moveX < -0.2) moveDir -= 1;
            if (this.keys['ArrowRight'] || this.keys['KeyD'] || gp.moveX > 0.2) moveDir += 1;

            minigame.pip.x += moveDir * minigame.pip.speed * dt;
            minigame.pip.x = Math.max(70, Math.min(410, minigame.pip.x));

            if (moveDir !== 0) {
                minigame.pip.animTimer += dt * 8;
                minigame.pip.walkFrame = Math.floor(minigame.pip.animTimer);
            }
        }
    }

    update(dt) {
        sprites.updateAndDrawParticles(this.ctx, this.particles, dt);
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.life -= dt * 1.2;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        if (this.screenShake > 0) this.screenShake -= dt * 15;

        if (this.state === STATE.PLAYING) {
            this.updatePlaying(dt);
        } else if (this.state === STATE.BONUS_STAGE) {
            this.updateBonusStage(dt);
        }
    }

    updatePlaying(dt) {
        const playfield = this.tableManager.playfield;

        // Update flippers
        for (let f of playfield.flippers) f.update(dt);

        // Update retractable stoppers
        for (let st of playfield.stoppers) st.update(dt);

        // Physics step
        this.physics.step(this.ball, playfield, dt, (event, data) => this.handlePhysicsEvent(event, data));

        // Smooth camera follow
        if (this.ball.pos.y < 680) {
            this.targetCameraY = 0;
        } else if (this.ball.pos.y > 760) {
            this.targetCameraY = 720;
        }
        this.cameraY += (this.targetCameraY - this.cameraY) * 0.15;

        // Ball Drain
        if (this.ball.pos.y > playfield.drainY && this.ball.active) {
            this.handleBallDrain();
        }

        // Animated timers
        for (let b of playfield.bumpers) if (b.hitTimer > 0) b.hitTimer--;
        for (let t of playfield.targets) if (t.flashTimer > 0) t.flashTimer--;
    }

    handlePhysicsEvent(event, data) {
        if (event === 'bumperHit') {
            this.addScore(data.points);
            audio.playBumper();
            gamepadManager.rumble(70, 0.4, 0.6);
            sprites.createExplosion(this.particles, data.pos.x, data.pos.y - this.cameraY, 10, '#f8b800');
            this.addFloatingText('+' + (data.points * this.multiplier), data.pos.x, data.pos.y - this.cameraY - 10, '#f8b800');
        } else if (event === 'slingshotHit') {
            this.addScore(data.points);
            audio.playSlingshot();
            gamepadManager.rumble(60, 0.3, 0.5);
            this.addFloatingText('+' + (data.points * this.multiplier), data.p1.x, data.p1.y - this.cameraY, '#00e8d8');
        } else if (event === 'stopperHit') {
            audio.playSealBounce();
            gamepadManager.rumble(60, 0.4, 0.5);
            this.addFloatingText('STOPPER!', data.pos.x, data.pos.y - this.cameraY, '#58f858');
        } else if (event === 'targetHit') {
            const t = data;
            t.isHit = true;
            this.addScore(t.points);
            audio.playDropTarget();
            gamepadManager.rumble(50, 0.3, 0.4);
            sprites.createExplosion(this.particles, t.x + t.w / 2, t.y + t.h / 2 - this.cameraY, 8, t.color);
            this.addFloatingText('+' + (t.points * this.multiplier), t.x + 10, t.y - this.cameraY, '#f8b800');

            // 1. Check 5 Card Targets on Upper Table
            if (t.type === 'CARD') {
                const cardTargets = this.tableManager.playfield.targets.filter(item => item.type === 'CARD');
                const allCardsHit = cardTargets.every(c => c.isHit);
                if (allCardsHit) {
                    this.addScore(1000);
                    audio.playCardMatch();
                    // Activate Center Block Post (Stopper) between lower flippers!
                    this.tableManager.playfield.centerStopper.activate(18000);
                    this.addFloatingText('CENTER STOPPER UP!', 240, 300, '#58f858');
                    setTimeout(() => {
                        for (let c of cardTargets) c.isHit = false;
                    }, 4000);
                }
            }

            // 2. Check 7 Number Targets on Lower Table
            if (t.type === 'NUMBER') {
                const numTargets = this.tableManager.playfield.targets.filter(item => item.type === 'NUMBER');
                const allNumHit = numTargets.every(n => n.isHit);
                if (allNumHit) {
                    this.addScore(1000);
                    this.bonusOpen = true;
                    audio.playCardMatch();
                    this.addFloatingText('BONUS HOLE OPEN!', 240, 920 - this.cameraY, '#f83800');
                    setTimeout(() => {
                        for (let n of numTargets) n.isHit = false;
                    }, 5000);
                }
            }

            // 3. Check 3 Egg Targets (Hatching Chicks)
            if (t.type === 'EGG') {
                const eggTargets = this.tableManager.playfield.targets.filter(item => item.type === 'EGG');
                const allEggsHatched = eggTargets.every(e => e.isHit);
                if (allEggsHatched) {
                    this.addScore(1500);
                    audio.playSealBounce();
                    // Activate Side Outlane Stoppers!
                    this.tableManager.playfield.leftOutlaneStopper.activate(22000);
                    this.tableManager.playfield.rightOutlaneStopper.activate(22000);
                    this.addFloatingText('CHICKS HATCHED! SIDE STOPPERS ON!', 240, 1100 - this.cameraY, '#f8b800');
                    setTimeout(() => {
                        for (let e of eggTargets) e.isHit = false;
                    }, 8000);
                }
            }
        } else if (event === 'holeEnter') {
            audio.playHoleEnter();
            if (data.targetScene === 'BONUS_STAGE') {
                this.enterBonusStage();
            } else {
                setTimeout(() => {
                    audio.playHoleShoot();
                    this.ball.active = true;
                    this.ball.pos.set(data.pos.x + 15, data.pos.y + 15);
                    this.ball.vel.set(data.ejectDir.x * 60, data.ejectDir.y * 60);
                    sprites.createExplosion(this.particles, data.pos.x, data.pos.y - this.cameraY, 12, '#00e8d8');
                    this.addScore(data.points);
                }, 800);
            }
        } else if (event === 'autoUnstuck') {
            audio.playSlingshot();
            this.addFloatingText('NUDGE', data.x, data.y - this.cameraY, '#f8b800');
        }
    }

    enterBonusStage() {
        this.state = STATE.BONUS_STAGE;
        audio.startMinigameMusic();
        this.tableManager.initBonusMinigame();

        this.ball.reset(240, 260);
        this.ball.vel.set((Math.random() > 0.5 ? 1 : -1) * 160, -220);
        this.ball.active = true;
        this.ball.inPlay = true;
    }

    updateBonusStage(dt) {
        const minigame = this.tableManager.bonusMinigame;

        // Lady Penny Walk & Fall
        if (minigame.lady.walking) {
            minigame.lady.x += minigame.lady.vx * dt;
            if (minigame.lady.x < 100 || minigame.lady.x > 380) {
                minigame.lady.vx = -minigame.lady.vx;
            }
            minigame.lady.animTimer += dt * 4;
            minigame.lady.walkFrame = Math.floor(minigame.lady.animTimer);

            const activeTilesCount = minigame.tiles.filter(t => t.active).length;
            if (activeTilesCount <= 8 && !minigame.lady.falling && !minigame.lady.rescued) {
                minigame.lady.walking = false;
                minigame.lady.falling = true;
                this.addFloatingText('HELP!', minigame.lady.x, minigame.lady.y, '#f878f8');
            }
        } else if (minigame.lady.falling) {
            minigame.lady.y += 120 * dt;

            const pipX = minigame.pip.x;
            const pipY = minigame.pip.y - 56;
            if (Math.abs(minigame.lady.x - pipX) < 48 && Math.abs(minigame.lady.y - pipY) < 25) {
                minigame.lady.falling = false;
                minigame.lady.rescued = true;
                this.addScore(10000);
                audio.playRescueFanfare();
                gamepadManager.rumble(300, 0.8, 1.0);
                this.addFloatingText('10000 RESCUED!', pipX, pipY - 30, '#f8b800');
                sprites.createExplosion(this.particles, pipX, pipY, 24, '#f878f8');

                setTimeout(() => this.exitBonusStage(), 2200);
            } else if (minigame.lady.y > 700) {
                minigame.lady.falling = false;
                this.addFloatingText('MISSED!', pipX, 600, '#f83800');
            }
        }

        // Minigame Ball Physics
        const b = this.ball;
        b.vel.y += 280 * dt;
        b.pos.x += b.vel.x * dt;
        b.pos.y += b.vel.y * dt;

        if (b.pos.x - b.radius < 24) {
            b.pos.x = 24 + b.radius;
            b.vel.x = -b.vel.x * 0.95;
            audio.playSlingshot();
        } else if (b.pos.x + b.radius > 456) {
            b.pos.x = 456 - b.radius;
            b.vel.x = -b.vel.x * 0.95;
            audio.playSlingshot();
        }

        if (b.pos.y - b.radius < 44) {
            b.pos.y = 44 + b.radius;
            b.vel.y = -b.vel.y * 0.95;
            audio.playSlingshot();
        }

        // Paddle Collision
        const paddleY = minigame.pip.y - 56;
        const paddleW = minigame.pip.paddleWidth;
        const paddleLeft = minigame.pip.x - paddleW / 2;
        const paddleRight = minigame.pip.x + paddleW / 2;

        if (b.pos.y + b.radius >= paddleY && b.pos.y - b.radius <= paddleY + 12 &&
            b.pos.x >= paddleLeft && b.pos.x <= paddleRight && b.vel.y > 0) {
            
            const hitOffset = (b.pos.x - minigame.pip.x) / (paddleW / 2);
            b.pos.y = paddleY - b.radius;
            b.vel.y = -Math.abs(b.vel.y) * 1.05;
            b.vel.x = hitOffset * 280;

            audio.playPaddleHit(1 + Math.abs(hitOffset));
            gamepadManager.rumble(80, 0.5, 0.6);
            sprites.createExplosion(this.particles, b.pos.x, paddleY, 8, '#f8b800');
            this.addScore(50);
        }

        // Tile Breakout Collisions
        for (let tile of minigame.tiles) {
            if (!tile.active) continue;

            if (b.pos.x + b.radius > tile.x && b.pos.x - b.radius < tile.x + tile.w &&
                b.pos.y + b.radius > tile.y && b.pos.y - b.radius < tile.y + tile.h) {

                tile.hits++;
                if (tile.hits >= 2) {
                    tile.active = false;
                    audio.playTileBreak();
                    sprites.createExplosion(this.particles, tile.x + tile.w / 2, tile.y + tile.h / 2, 10, tile.color);
                } else {
                    audio.playTileHit(tile.hits);
                }

                this.addScore(tile.points);
                this.addFloatingText('+' + tile.points, tile.x + 10, tile.y, tile.color);
                gamepadManager.rumble(60, 0.3, 0.4);

                b.vel.y = -b.vel.y;
                break;
            }
        }

        if (b.pos.y > 700) {
            audio.stopMusic();
            this.exitBonusStage();
        }
    }

    exitBonusStage() {
        audio.stopMusic();
        this.state = STATE.PLAYING;
        this.targetCameraY = 720;
        this.cameraY = 720;

        const bonusHole = this.tableManager.playfield.bonusHole;
        this.ball.reset(bonusHole.pos.x - 20, bonusHole.pos.y - 20);
        this.ball.vel.set(-200, -320);
        this.ball.active = true;
        this.ball.inPlay = true;
        audio.playHoleShoot();
        sprites.createExplosion(this.particles, bonusHole.pos.x, bonusHole.pos.y - this.cameraY, 16, '#f8b800');
    }

    handleBallDrain() {
        this.ball.active = false;
        audio.playDrain();
        gamepadManager.rumble(250, 0.8, 0.9);
        this.ballsLeft--;
        this.updateScoreUI();

        if (this.ballsLeft <= 0) {
            this.state = STATE.GAME_OVER;
            this.addFloatingText('GAME OVER', 240, 360, '#f83800');
        } else {
            setTimeout(() => {
                this.resetBallToShooter();
                this.physics.isTilted = false;
                this.tiltWarnings = 0;
            }, 1500);
        }
    }

    // ==========================================
    // RENDER ENGINE
    // ==========================================
    render() {
        this.ctx.save();
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.screenShake > 0) {
            const sx = (Math.random() - 0.5) * this.screenShake;
            const sy = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(sx, sy);
        }

        if (this.state === STATE.TITLE) {
            this.renderTitleScreen();
        } else if (this.state === STATE.PLAYING) {
            this.renderTableScreen();
        } else if (this.state === STATE.BONUS_STAGE) {
            this.renderBonusStageScreen();
        } else if (this.state === STATE.GAME_OVER) {
            this.renderTableScreen();
            this.renderGameOverOverlay();
        }

        for (let ft of this.floatingTexts) {
            this.ctx.fillStyle = ft.color;
            this.ctx.font = 'bold 14px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(ft.text, ft.x, ft.y);
        }

        this.ctx.restore();
    }

    renderTitleScreen() {
        const c = this.ctx;
        this.titleBlinkTimer += 0.04;

        c.fillStyle = '#f83800';
        c.font = 'bold 36px "Courier New", monospace';
        c.textAlign = 'center';
        c.fillText('PINBALL', 240, 160);

        c.fillStyle = '#00e8d8';
        c.font = 'bold 16px "Courier New", monospace';
        c.fillText('1984 RETRO HOMAGE', 240, 200);

        const frame = Math.floor(this.titleBlinkTimer * 3) % 2;
        sprites.drawPip(c, 240, 340, frame, false, true);
        sprites.drawLadyPenny(c, 240, 440, frame, false);
        sprites.drawSeal(c, 120, 330, frame, false);
        sprites.drawSeal(c, 360, 330, frame, true);

        if (Math.sin(this.titleBlinkTimer * 6) > 0) {
            c.fillStyle = '#f8b800';
            c.font = 'bold 16px "Courier New", monospace';
            c.fillText('PRESS START OR SPACE TO PLAY', 240, 560);
        }

        c.fillStyle = '#bcbcbc';
        c.font = '12px "Courier New", monospace';
        c.fillText('XBOX 360 CONTROLLER & KEYBOARD SUPPORTED', 240, 620);
        c.fillText('LT/LB: LEFT FLIPPER | RT/RB: RIGHT FLIPPER', 240, 645);
        c.fillText('SPACE / A BUTTON: PLUNGER & LAUNCH', 240, 670);
    }

    renderTableScreen() {
        const c = this.ctx;
        const playfield = this.tableManager.playfield;

        c.save();
        c.translate(0, -this.cameraY);

        // Walls
        c.lineWidth = 4;
        c.lineCap = 'round';
        for (let w of playfield.walls) {
            c.strokeStyle = w.color;
            c.beginPath();
            c.moveTo(w.p1.x, w.p1.y);
            c.lineTo(w.p2.x, w.p2.y);
            c.stroke();
        }

        // Bumpers
        for (let b of playfield.bumpers) {
            const flash = b.hitTimer > 0;
            c.fillStyle = flash ? '#fcfcfc' : b.color;
            c.beginPath();
            c.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = flash ? '#f83800' : b.innerColor;
            c.beginPath();
            c.arc(b.pos.x, b.pos.y, b.radius * 0.6, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = '#000';
            c.font = 'bold 11px "Courier New"';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(b.points.toString(), b.pos.x, b.pos.y);
        }

        // Slingshots
        for (let s of playfield.slingshots) {
            c.strokeStyle = s.hitTimer > 0 ? '#fcfcfc' : s.color;
            c.lineWidth = 5;
            c.beginPath();
            c.moveTo(s.p1.x, s.p1.y);
            c.lineTo(s.p2.x, s.p2.y);
            c.stroke();
        }

        // Targets (Cards, Numbers, Eggs)
        for (let t of playfield.targets) {
            if (t.type === 'CARD') {
                sprites.drawCardTarget(c, t);
            } else if (t.type === 'NUMBER') {
                sprites.drawNumberTarget(c, t);
            } else if (t.type === 'EGG') {
                sprites.drawEggOrChick(c, t);
            }
        }

        // Retractable Stoppers
        for (let st of playfield.stoppers) {
            sprites.drawStopper(c, st);
        }

        // Holes
        for (let h of playfield.holes) {
            c.fillStyle = '#000';
            c.beginPath();
            c.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2);
            c.fill();
            c.strokeStyle = (h.targetScene === 'BONUS_STAGE' && this.bonusOpen) ? '#f83800' : '#555';
            c.lineWidth = 3;
            c.stroke();

            if (h.targetScene === 'BONUS_STAGE' && this.bonusOpen) {
                c.fillStyle = '#f83800';
                c.font = 'bold 10px "Courier New"';
                c.textAlign = 'center';
                c.fillText('BONUS', h.pos.x, h.pos.y - 22);
            }
        }

        // Blooper Squids (replaces seals)
        const blooperFrame = Math.floor(Date.now() / 200) % 2;
        sprites.drawBlooper(c, 60, 430, blooperFrame, false);
        sprites.drawBlooper(c, 385, 430, blooperFrame, true);

        // Flippers
        for (let f of playfield.flippers) {
            c.strokeStyle = f.color;
            c.lineWidth = f.thickness;
            c.lineCap = 'round';
            c.beginPath();
            c.moveTo(f.pivot.x, f.pivot.y);
            c.lineTo(f.tip.x, f.tip.y);
            c.stroke();

            c.fillStyle = '#f83800';
            c.beginPath();
            c.arc(f.pivot.x, f.pivot.y, 5, 0, Math.PI * 2);
            c.fill();
        }

        // Plunger Spring
        const plungerX = 448;
        const plungerY = 1390;
        const compression = this.plungerPower * 45;
        c.strokeStyle = '#f8b800';
        c.lineWidth = 4;
        c.beginPath();
        for (let i = 0; i < 6; i++) {
            const y1 = plungerY + i * (8 - compression / 6);
            const y2 = y1 + (4 - compression / 12);
            c.moveTo(plungerX - 10, y1);
            c.lineTo(plungerX + 10, y2);
        }
        c.stroke();

        // Ball Trail & Spiny Egg Ball
        for (let tr of this.ball.trail) {
            c.fillStyle = `rgba(248, 56, 0, ${tr.alpha * 0.6})`;
            c.beginPath();
            c.arc(tr.x, tr.y, this.ball.radius * 0.7, 0, Math.PI * 2);
            c.fill();
        }

        if (this.ball.active) {
            sprites.drawSpinyBall(c, this.ball.pos.x, this.ball.pos.y, this.ball.radius);
        }

        c.restore();

        this.renderTableHUD();
    }

    renderTableHUD() {
        const c = this.ctx;
        c.fillStyle = 'rgba(0, 0, 0, 0.7)';
        c.fillRect(0, 0, this.width, 32);

        c.fillStyle = '#f8b800';
        c.font = 'bold 12px "Courier New"';
        c.textAlign = 'left';
        c.fillText('SCORE: ' + this.score.toString().padStart(6, '0'), 15, 20);

        c.textAlign = 'center';
        c.fillStyle = '#00e8d8';
        c.fillText(this.cameraY < 360 ? 'SCENE A: UPPER' : 'SCENE B: LOWER', 240, 20);

        c.textAlign = 'right';
        c.fillStyle = '#f83800';
        c.fillText('GAME ' + this.gameMode, 465, 20);
    }

    renderBonusStageScreen() {
        const c = this.ctx;
        const minigame = this.tableManager.bonusMinigame;

        c.fillStyle = '#f8b800';
        c.font = 'bold 16px "Courier New"';
        c.textAlign = 'center';
        c.fillText('BONUS STAGE: RESCUE PENNY!', 240, 28);

        c.strokeStyle = '#00e8d8';
        c.lineWidth = 4;
        c.strokeRect(20, 40, 440, 660);

        c.fillStyle = '#f83800';
        c.fillRect(80, 105, 320, 8);

        if (!minigame.lady.rescued) {
            sprites.drawLadyPenny(c, minigame.lady.x, minigame.lady.y, minigame.lady.walkFrame, minigame.lady.vx < 0);
        }

        for (let tile of minigame.tiles) {
            if (!tile.active) continue;
            c.fillStyle = tile.color;
            c.fillRect(tile.x, tile.y, tile.w, tile.h);
            c.fillStyle = '#fff';
            c.fillRect(tile.x + 2, tile.y + 2, tile.w - 4, 2);
        }

        sprites.drawPip(c, minigame.pip.x, minigame.pip.y, minigame.pip.walkFrame, false, true);

        if (this.ball.active) {
            c.fillStyle = '#fcfcfc';
            c.beginPath();
            c.arc(this.ball.pos.x, this.ball.pos.y, this.ball.radius, 0, Math.PI * 2);
            c.fill();
        }
    }

    renderGameOverOverlay() {
        const c = this.ctx;
        c.fillStyle = 'rgba(0, 0, 0, 0.75)';
        c.fillRect(60, 260, 360, 200);

        c.strokeStyle = '#f83800';
        c.lineWidth = 3;
        c.strokeRect(60, 260, 360, 200);

        c.fillStyle = '#f83800';
        c.font = 'bold 28px "Courier New"';
        c.textAlign = 'center';
        c.fillText('GAME OVER', 240, 320);

        c.fillStyle = '#f8b800';
        c.font = 'bold 16px "Courier New"';
        c.fillText('FINAL SCORE: ' + this.score, 240, 365);

        c.fillStyle = '#fcfcfc';
        c.font = '12px "Courier New"';
        c.fillText('PRESS START OR SPACE TO RETRY', 240, 420);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new PinballGame();
});
