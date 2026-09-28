/**
 * Procedural 8-Bit NES Sprite & Visual Effects Engine
 * Renders authentic retro sprites for Pip the Plumber, Lady Penny, seals, cards, chicks, eggs, and stoppers.
 */

class SpriteRenderer {
    constructor() {
        this.PALETTE = {
            BLACK: '#000000',
            WHITE: '#FCFCFC',
            LIGHT_GREY: '#BCBCBC',
            DARK_GREY: '#747474',
            RED: '#F83800',
            DARK_RED: '#881400',
            ORANGE: '#E45C10',
            GOLD: '#F8B800',
            YELLOW: '#FCE4A0',
            GREEN: '#00A800',
            LIGHT_GREEN: '#58F858',
            CYAN: '#00E8D8',
            BLUE: '#0058F8',
            NAVY: '#000088',
            PINK: '#F878F8',
            PURPLE: '#6844FC',
            SKIN: '#FCA044'
        };
    }

    drawPixelArt(ctx, map, colors, x, y, pixelSize = 2, flipX = false) {
        const height = map.length;
        const width = map[0].length;

        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                const char = map[r][c];
                if (char !== ' ' && colors[char]) {
                    ctx.fillStyle = colors[char];
                    const drawCol = flipX ? (width - 1 - c) : c;
                    ctx.fillRect(
                        Math.floor(x + drawCol * pixelSize),
                        Math.floor(y + r * pixelSize),
                        pixelSize,
                        pixelSize
                    );
                }
            }
        }
    }

    // Hero: Pip the Plumber (Scene C Mario homage)
    drawPip(ctx, x, y, walkFrame = 0, flipX = false, holdingPaddle = true) {
        const frame0 = [
            "  RRRRR       ",
            " RRRRRRRRR    ",
            " DDDSSSK      ",
            " DSDSSSKKK    ",
            " DSDSSSKKK    ",
            "  DSSSSSS     ",
            "   RRRR       ",
            "  BRRBBRB     ",
            " BBBBBBBBB    ",
            " BSBBSBBSB    ",
            " S SBBBS S    ",
            "   BBBBB      ",
            "  BBB BBB     ",
            "  DDD DDD     "
        ];

        const frame1 = [
            "  RRRRR       ",
            " RRRRRRRRR    ",
            " DDDSSSK      ",
            " DSDSSSKKK    ",
            " DSDSSSKKK    ",
            "  DSSSSSS     ",
            "   RRRR       ",
            "  BRRBBRB     ",
            " BBBBBBBBB    ",
            " BSBBSBBSB    ",
            " S SBBBS S    ",
            "   BBBBB      ",
            "   BB   BB    ",
            "  DDD   DDD   "
        ];

        const map = (walkFrame % 2 === 0) ? frame0 : frame1;
        const colors = {
            'R': this.PALETTE.RED,
            'D': this.PALETTE.DARK_RED,
            'S': this.PALETTE.SKIN,
            'K': this.PALETTE.BLACK,
            'B': this.PALETTE.BLUE
        };

        const pixelSize = 3;
        this.drawPixelArt(ctx, map, colors, x - 21, y - 42, pixelSize, flipX);

        if (holdingPaddle) {
            const paddleWidth = 84;
            const paddleHeight = 10;
            const paddleX = x - paddleWidth / 2;
            const paddleY = y - 56;

            ctx.fillStyle = this.PALETTE.GOLD;
            ctx.fillRect(paddleX, paddleY, paddleWidth, paddleHeight);

            ctx.fillStyle = this.PALETTE.WHITE;
            ctx.fillRect(paddleX + 2, paddleY + 2, paddleWidth - 4, 3);

            ctx.fillStyle = this.PALETTE.RED;
            ctx.fillRect(paddleX + 4, paddleY + 6, paddleWidth - 8, 3);

            ctx.fillStyle = this.PALETTE.CYAN;
            ctx.fillRect(paddleX - 4, paddleY - 2, 6, paddleHeight + 4);
            ctx.fillRect(paddleX + paddleWidth - 2, paddleY - 2, 6, paddleHeight + 4);
        }
    }

    // Lady Penny (Scene C Pauline homage)
    drawLadyPenny(ctx, x, y, walkFrame = 0, flipX = false) {
        const frame0 = [
            "   YYYYY      ",
            "  YYYYYYYY    ",
            "  YYSSSKYY    ",
            "  YYSSSSYY    ",
            "   SSRSS      ",
            "    PPP       ",
            "   PPPPP      ",
            "  PPPPPPP     ",
            " PPPPPPPPP    ",
            " PPP PPP PP   ",
            "  SS PPP SS   ",
            "    PPPP      ",
            "    S  S      ",
            "   DD  DD     "
        ];

        const frame1 = [
            "   YYYYY      ",
            "  YYYYYYYY    ",
            "  YYSSSKYY    ",
            "  YYSSSSYY    ",
            "   SSRSS      ",
            "    PPP       ",
            "   PPPPP      ",
            "  PPPPPPP     ",
            " PPPPPPPPP    ",
            " PPP PPP PP   ",
            "  SS PPP SS   ",
            "    PPPP      ",
            "   S    S     ",
            "  DD    DD    "
        ];

        const map = (walkFrame % 2 === 0) ? frame0 : frame1;
        const colors = {
            'Y': this.PALETTE.GOLD,
            'S': this.PALETTE.SKIN,
            'K': this.PALETTE.BLACK,
            'R': this.PALETTE.RED,
            'P': this.PALETTE.PINK,
            'D': this.PALETTE.WHITE
        };

        const pixelSize = 3;
        this.drawPixelArt(ctx, map, colors, x - 21, y - 42, pixelSize, flipX);
    }

    // Seal with spinning beach ball (Upper Scene A)
    drawSeal(ctx, x, y, frame = 0, flipX = false) {
        const sealMap = [
            "     WWWW     ",
            "    WWKKWW    ",
            "   WWWWKKWW   ",
            "  WWSSWWWWWW  ",
            "  WWWWWWWWWW  ",
            "   WWWWWWWW   ",
            "    WWWWWW    ",
            "   WWWWWWWW   ",
            "  WWWWWWWWWW  ",
            " WWWWWWWWWWWW "
        ];

        const colors = {
            'W': this.PALETTE.CYAN,
            'K': this.PALETTE.BLACK,
            'S': this.PALETTE.PINK
        };

        this.drawPixelArt(ctx, sealMap, colors, x - 15, y - 15, 3, flipX);

        // Bouncing beach ball on seal nose
        const ballY = (frame % 2 === 0) ? y - 24 : y - 28;
        const ballX = x + (flipX ? -6 : 6);
        ctx.fillStyle = this.PALETTE.RED;
        ctx.beginPath();
        ctx.arc(ballX, ballY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.PALETTE.WHITE;
        ctx.beginPath();
        ctx.arc(ballX, ballY, 5, 0, Math.PI);
        ctx.fill();

        ctx.fillStyle = this.PALETTE.BLUE;
        ctx.fillRect(ballX - 2, ballY - 2, 4, 4);
    }

    // SMB1 Blooper Squid (replaces upper seal)
    drawBlooper(ctx, x, y, frame = 0, flipX = false) {
        const blooperMap = [
            "    WWWW    ",
            "   WWWWWW   ",
            "  WWWWWWWW  ",
            " WWWWWWWWWW ",
            " WWWWWWWWWW ",
            "  WWWWWWWW  ",
            "  WKKWWKKW  ",
            "  WKKWWKKW  ",
            "  WWWWWWWW  ",
            "  WW WW WW  ",
            "  W   W  W  "
        ];
        const colors = {
            'W': this.PALETTE.WHITE,
            'K': this.PALETTE.BLACK
        };
        this.drawPixelArt(ctx, blooperMap, colors, x - 18, y - 18, 3, flipX);

        // Blooper spinning Fire Flower on head
        const starY = (frame % 2 === 0) ? y - 28 : y - 32;
        const starX = x + (flipX ? -6 : 6);
        ctx.fillStyle = this.PALETTE.RED;
        ctx.beginPath();
        ctx.arc(starX, starY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.PALETTE.GOLD;
        ctx.beginPath();
        ctx.arc(starX, starY, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Spiny Egg Pinball (Lakitu's Egg with 8 spikes)
    drawSpinyBall(ctx, x, y, radius = 7) {
        const pixelSize = 2;
        const spinyMap = [
            "  K  K  ",
            " KRRRRK ",
            "KRRWWRRK",
            " RWWWWWW",
            " RWWWWWW",
            "KRRWWRRK",
            " KRRRRK ",
            "  K  K  "
        ];
        const colors = {
            'K': this.PALETTE.DARK_RED,
            'R': this.PALETTE.RED,
            'W': this.PALETTE.WHITE
        };
        this.drawPixelArt(ctx, spinyMap, colors, x - 8, y - 8, pixelSize);
    }

    // Koopa Shell / Paratroopa Target (Lower Scene B)
    drawEggOrChick(ctx, target, animTimer = 0) {
        if (!target.isHit) {
            // Unhatched Target: SMB1 Koopa Shell!
            const shellMap = [
                "   GGGG   ",
                "  GGGGGG  ",
                " GGWGGWGG ",
                " GGWGGWGG ",
                "  GGGGGG  ",
                " WWWWWWWW "
            ];
            const colors = {
                'G': target.flashTimer > 0 ? this.PALETTE.WHITE : this.PALETTE.GREEN,
                'W': this.PALETTE.WHITE
            };
            this.drawPixelArt(ctx, shellMap, colors, target.x - 2, target.y - 2, 2, false);
        } else {
            // Hatched Target: SMB1 Koopa Paratroopa with flapping wings!
            const frame = Math.floor(Date.now() / 150) % 2;
            const wingUpMap = [
                "    WW    ",
                "   WGGW   ",
                "  WKGWWG  ",
                "  WGGGW   ",
                "  GGGGGG  ",
                "   G  G   "
            ];
            const wingDownMap = [
                "   WGGW   ",
                "  WKGWWG  ",
                "  WGGGW   ",
                "  GGGGGG  ",
                " WWWWWWWW ",
                "   G  G   "
            ];
            const colors = {
                'W': this.PALETTE.WHITE,
                'G': this.PALETTE.LIGHT_GREEN,
                'K': this.PALETTE.BLACK
            };
            this.drawPixelArt(ctx, frame === 0 ? wingUpMap : wingDownMap, colors, target.x - 2, target.y - 2, 2, false);
        }
    }

    // 5 Upper Card Targets (A, K, Q, J, 10 / Spade, Heart, Diamond, Club, Star)
    drawCardTarget(ctx, target) {
        const isHit = target.isHit;
        ctx.fillStyle = isHit ? this.PALETTE.GOLD : (target.flashTimer > 0 ? this.PALETTE.WHITE : '#222');
        ctx.fillRect(target.x, target.y, target.w, target.h);

        ctx.strokeStyle = isHit ? this.PALETTE.WHITE : this.PALETTE.CYAN;
        ctx.lineWidth = 2;
        ctx.strokeRect(target.x, target.y, target.w, target.h);

        ctx.fillStyle = isHit ? this.PALETTE.BLACK : this.PALETTE.WHITE;
        ctx.font = 'bold 11px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(target.label, target.x + target.w / 2, target.y + target.h / 2);
    }

    // 7 Numbered Targets (1, 2, 3, 4, 5, 6, 7)
    drawNumberTarget(ctx, target) {
        const isHit = target.isHit;
        ctx.fillStyle = isHit ? '#111' : (target.flashTimer > 0 ? this.PALETTE.WHITE : this.PALETTE.GOLD);
        ctx.fillRect(target.x, target.y, target.w, target.h);

        ctx.strokeStyle = this.PALETTE.WHITE;
        ctx.lineWidth = 2;
        ctx.strokeRect(target.x, target.y, target.w, target.h);

        ctx.fillStyle = isHit ? '#555' : this.PALETTE.BLACK;
        ctx.font = 'bold 12px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(target.label, target.x + target.w / 2, target.y + target.h / 2);
    }

    // Green Warp Pipe Stopper (replaces plain block post)
    drawStopper(ctx, stopper) {
        if (!stopper.active) return;
        const x = stopper.pos.x;
        const y = stopper.pos.y;
        const r = stopper.radius;

        // Warp Pipe Rim Top
        ctx.fillStyle = this.PALETTE.GREEN;
        ctx.fillRect(x - r, y - r, r * 2, r * 1.6);

        ctx.strokeStyle = this.PALETTE.BLACK;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - r, y - r, r * 2, r * 1.6);

        // Highlight line
        ctx.fillStyle = this.PALETTE.LIGHT_GREEN;
        ctx.fillRect(x - r + 2, y - r + 2, 4, r * 1.6 - 4);

        // Dark opening
        ctx.fillStyle = this.PALETTE.BLACK;
        ctx.fillRect(x - r + 2, y - r, r * 2 - 4, 3);
    }

    // Particle explosions
    createExplosion(particles, x, y, count = 12, color = '#f8b800') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 180;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.floor(Math.random() * 3),
                color: color,
                life: 1.0,
                decay: 0.04 + Math.random() * 0.03
            });
        }
    }

    updateAndDrawParticles(ctx, particles, dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.fillStyle = p.color;
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        }
    }
}

const sprites = new SpriteRenderer();
