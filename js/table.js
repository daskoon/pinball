/**
 * Faithful 1984 NES Pinball Table Layout & Mechanics
 */

class TableManager {
    constructor() {
        this.playfield = null;
        this.bonusMinigame = null;
        this.initTables();
    }

    initTables() {
        this.initPlayfield();
        this.initBonusMinigame();
    }

    initPlayfield() {
        const walls = [];
        const bumpers = [];
        const slingshots = [];
        const flippers = [];
        const holes = [];
        const targets = [];
        const stoppers = [];

        // -------------------------------------------------------------
        // 1. OUTER WALLS & SMOOTH SHOOTER LANE TOP ARCH
        // -------------------------------------------------------------
        walls.push(new WallSegment(16, 180, 16, 1390, 0.75, '#00e8d8'));
        walls.push(new WallSegment(466, 180, 466, 1390, 0.75, '#f83800'));
        walls.push(new WallSegment(430, 1390, 466, 1390, 0.8, '#f83800'));
        walls.push(new WallSegment(430, 210, 430, 1390, 0.75, '#00e8d8'));

        // Smooth top arch
        const archPoints = [
            { x: 466, y: 180 },
            { x: 464, y: 130 },
            { x: 454, y: 85 },
            { x: 432, y: 50 },
            { x: 395, y: 26 },
            { x: 340, y: 14 },
            { x: 270, y: 10 },
            { x: 200, y: 10 },
            { x: 135, y: 18 },
            { x: 80, y: 36 },
            { x: 40, y: 75 },
            { x: 20, y: 125 },
            { x: 16, y: 180 }
        ];

        for (let i = 0; i < archPoints.length - 1; i++) {
            walls.push(new WallSegment(
                archPoints[i].x, archPoints[i].y,
                archPoints[i + 1].x, archPoints[i + 1].y,
                0.82, '#00e8d8'
            ));
        }

        // One-way shooter gate
        const shooterGate = new WallSegment(430, 195, 466, 165, 0.65, '#f8b800');
        shooterGate.oneWay = true;
        shooterGate.normal = new Vec2(-0.64, -0.76).normalize();
        walls.push(shooterGate);

        // -------------------------------------------------------------
        // 2. UPPER TABLE (SCENE A: Y ~ 0 to 720)
        // -------------------------------------------------------------
        // 5 Card Targets (Spade, Heart, Diamond, Club, Star)
        const cardWidth = 32;
        const cardHeight = 22;
        const cardLabels = ['♠', '♥', '♦', '♣', '★'];
        for (let i = 0; i < 5; i++) {
            targets.push(new TargetItem(
                145 + i * (cardWidth + 8), 55,
                cardWidth, cardHeight,
                cardLabels[i], 200, 'CARD', '#f8b800'
            ));
        }

        // Upper Left Guide Wall & Kicker Hole Chamber
        walls.push(new WallSegment(45, 190, 95, 190, 0.75, '#f83800'));
        walls.push(new WallSegment(95, 190, 95, 290, 0.75, '#f83800'));
        const upperHole = new HoleTrigger(65, 240, 16, 'UPPER_KICK', new Vec2(3.5, 4.5), 500);
        holes.push(upperHole);

        // Upper Left & Right Deflector Guides (Seals)
        walls.push(new WallSegment(35, 340, 85, 430, 0.75, '#f83800'));
        walls.push(new WallSegment(85, 430, 35, 520, 0.75, '#f83800'));

        walls.push(new WallSegment(410, 340, 360, 430, 0.75, '#f83800'));
        walls.push(new WallSegment(360, 430, 410, 520, 0.75, '#f83800'));

        // 3 Pop Bumpers
        bumpers.push(new CircleBumper(190, 240, 24, 100, '#f83800', '#f8b800'));
        bumpers.push(new CircleBumper(290, 240, 24, 100, '#f83800', '#f8b800'));
        bumpers.push(new CircleBumper(240, 330, 24, 100, '#00e8d8', '#fcfcfc'));

        // Upper Table Flipper guides
        walls.push(new WallSegment(35, 530, 120, 605, 0.75, '#fcfcfc'));
        walls.push(new WallSegment(410, 530, 325, 605, 0.75, '#fcfcfc'));

        // Upper Flippers
        const leftUpFlipper = new Flipper(120, 605, 60, 0.48, -0.46, true, '#fcfcfc');
        const rightUpFlipper = new Flipper(325, 605, 60, Math.PI - 0.48, Math.PI + 0.46, false, '#fcfcfc');
        flippers.push(leftUpFlipper, rightUpFlipper);

        // Chutes to Lower Table
        walls.push(new WallSegment(16, 620, 55, 730, 0.75, '#00e8d8'));
        walls.push(new WallSegment(430, 620, 385, 730, 0.75, '#00e8d8'));

        walls.push(new WallSegment(170, 650, 195, 740, 0.7, '#f83800'));
        walls.push(new WallSegment(275, 650, 250, 740, 0.7, '#f83800'));

        // -------------------------------------------------------------
        // 3. LOWER TABLE (SCENE B: Y ~ 720 to 1440)
        // -------------------------------------------------------------
        // 7 Numbered Targets (1, 2, 3, 4, 5, 6, 7) on left side
        for (let i = 0; i < 7; i++) {
            targets.push(new TargetItem(
                55, 840 + i * 32,
                24, 24,
                (i + 1).toString(), 150, 'NUMBER', '#f8b800'
            ));
        }
        walls.push(new WallSegment(45, 830, 45, 1070, 0.7, '#555'));

        // 3 Egg Targets (Hatching Chicks)
        for (let i = 0; i < 3; i++) {
            targets.push(new TargetItem(
                200 + i * 42, 1080,
                28, 22,
                'EGG', 300, 'EGG', '#fce4a0'
            ));
        }

        // Lower Round Bumper
        bumpers.push(new CircleBumper(240, 950, 24, 150, '#00e8d8', '#f83800'));

        // Right Side Bonus Stage Hole
        const bonusHole = new HoleTrigger(355, 920, 18, 'BONUS_STAGE', new Vec2(-4, -5), 1000);
        holes.push(bonusHole);
        walls.push(new WallSegment(395, 860, 395, 980, 0.7, '#f83800'));

        // Inlane / Outlane Guides
        walls.push(new WallSegment(55, 1080, 55, 1180, 0.75, '#f83800'));
        walls.push(new WallSegment(55, 1180, 120, 1260, 0.75, '#fcfcfc'));
        walls.push(new WallSegment(16, 1210, 55, 1280, 0.75, '#fcfcfc'));

        walls.push(new WallSegment(385, 1080, 385, 1180, 0.75, '#f83800'));
        walls.push(new WallSegment(385, 1180, 320, 1260, 0.75, '#fcfcfc'));
        walls.push(new WallSegment(430, 1210, 385, 1280, 0.75, '#fcfcfc'));

        // Lower Slingshots
        slingshots.push(new Slingshot(125, 1200, 125, 1275, 1, -0.35, 50, 12.0));
        slingshots.push(new Slingshot(315, 1200, 315, 1275, -1, -0.35, 50, 12.0));
        walls.push(new WallSegment(105, 1200, 125, 1200, 0.7, '#00e8d8'));
        walls.push(new WallSegment(105, 1200, 105, 1275, 0.7, '#00e8d8'));
        walls.push(new WallSegment(335, 1200, 315, 1200, 0.7, '#00e8d8'));
        walls.push(new WallSegment(335, 1200, 335, 1275, 0.7, '#00e8d8'));

        // Flipper Return Ramps
        walls.push(new WallSegment(50, 1280, 130, 1335, 0.75, '#fcfcfc'));
        walls.push(new WallSegment(390, 1280, 310, 1335, 0.75, '#fcfcfc'));

        // Main Lower Flippers
        const leftMainFlipper = new Flipper(130, 1335, 72, 0.48, -0.46, true, '#fcfcfc');
        const rightMainFlipper = new Flipper(310, 1335, 72, Math.PI - 0.48, Math.PI + 0.46, false, '#fcfcfc');
        flippers.push(leftMainFlipper, rightMainFlipper);

        // Center Block Post (Stopper) between main flippers
        const centerStopper = new RetractableStopper(220, 1350, 8, 15000, '#58f858');
        // Left & Right Side Outlane Stoppers
        const leftOutlaneStopper = new RetractableStopper(35, 1260, 7, 20000, '#f8b800');
        const rightOutlaneStopper = new RetractableStopper(405, 1260, 7, 20000, '#f8b800');
        stoppers.push(centerStopper, leftOutlaneStopper, rightOutlaneStopper);

        // Bottom Drain Funnel
        walls.push(new WallSegment(120, 1385, 180, 1435, 0.6, '#f83800'));
        walls.push(new WallSegment(320, 1385, 260, 1435, 0.6, '#f83800'));

        this.playfield = {
            walls,
            bumpers,
            slingshots,
            flippers,
            holes,
            targets,
            stoppers,
            centerStopper,
            leftOutlaneStopper,
            rightOutlaneStopper,
            bonusHole,
            drainY: 1425,
            seals: [
                { x: 60, y: 430, frame: 0, flipX: false },
                { x: 385, y: 430, frame: 0, flipX: true }
            ]
        };
    }

    initBonusMinigame() {
        const walls = [];
        walls.push(new WallSegment(20, 40, 460, 40, 0.85, '#f83800'));
        walls.push(new WallSegment(20, 40, 20, 680, 0.85, '#00e8d8'));
        walls.push(new WallSegment(460, 40, 460, 680, 0.85, '#00e8d8'));

        const tiles = [];
        const rows = 4;
        const cols = 7;
        const tileW = 46;
        const tileH = 14;
        const startX = 60;
        const startY = 170;
        const colors = ['#F83800', '#F8B800', '#00A800', '#0058F8'];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                tiles.push({
                    x: startX + c * (tileW + 10),
                    y: startY + r * (tileH + 12),
                    w: tileW,
                    h: tileH,
                    color: colors[r % colors.length],
                    points: (4 - r) * 100,
                    active: true,
                    hits: 0
                });
            }
        }

        this.bonusMinigame = {
            walls,
            tiles,
            lady: {
                x: 240,
                y: 105,
                vx: 40,
                walking: true,
                falling: false,
                rescued: false,
                walkFrame: 0,
                animTimer: 0
            },
            pip: {
                x: 240,
                y: 645,
                vx: 0,
                speed: 300,
                paddleWidth: 84,
                paddleHeight: 12,
                walkFrame: 0,
                animTimer: 0
            }
        };
    }
}
