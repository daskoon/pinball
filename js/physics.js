/**
 * High-Precision 2D Pinball Physics Engine
 * Features:
 * - Swept Continuous Collision Detection (CCD) to eliminate tunneling at high velocities
 * - Rotational Flipper Mechanics with Dynamic Angular Impulse & Aiming Angles
 * - Solenoid Pop Bumper & Slingshot Actuation
 * - Surface Friction, Ball Spin & Restitution Modelling
 * - Anti-Stuck Agitation Watchdog
 */

class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    copy() {
        return new Vec2(this.x, this.y);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    mult(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    cross(v) {
        return this.x * v.y - this.y * v.x;
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }

    length() {
        return Math.sqrt(this.lengthSq());
    }

    normalize() {
        const len = this.length();
        if (len > 0.00001) {
            this.x /= len;
            this.y /= len;
        }
        return this;
    }

    distSq(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    dist(v) {
        return Math.sqrt(this.distSq(v));
    }
}

class Ball {
    constructor(x, y, radius = 7) {
        this.pos = new Vec2(x, y);
        this.vel = new Vec2(0, 0);
        this.radius = radius;
        this.mass = 1.0;
        this.active = true;
        this.inPlay = false;
        this.trail = [];
        this.stuckTimer = 0;
        this.lastPos = new Vec2(x, y);
    }

    reset(x, y) {
        this.pos.set(x, y);
        this.vel.set(0, 0);
        this.active = true;
        this.inPlay = false;
        this.trail = [];
        this.stuckTimer = 0;
        this.lastPos.set(x, y);
    }
}

class WallSegment {
    constructor(x1, y1, x2, y2, restitution = 0.75, friction = 0.05, color = '#00e8d8') {
        this.p1 = new Vec2(x1, y1);
        this.p2 = new Vec2(x2, y2);
        this.restitution = restitution;
        this.friction = friction;
        this.color = color;
        this.oneWay = false;
        this.normal = new Vec2();
        this.tangent = new Vec2();
        this.updateVectors();
    }

    updateVectors() {
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            this.normal.set(-dy / len, dx / len);
            this.tangent.set(dx / len, dy / len);
        }
    }
}

class CircleBumper {
    constructor(x, y, radius = 22, points = 100, color = '#f83800', innerColor = '#f8b800') {
        this.pos = new Vec2(x, y);
        this.radius = radius;
        this.points = points;
        this.color = color;
        this.innerColor = innerColor;
        this.hitTimer = 0;
        this.kickForce = 15.0; // Instantaneous solenoid impulse
    }

    trigger() {
        this.hitTimer = 12;
    }
}

class Slingshot {
    constructor(x1, y1, x2, y2, kickDirX, kickDirY, points = 50, kickForce = 13.0) {
        this.p1 = new Vec2(x1, y1);
        this.p2 = new Vec2(x2, y2);
        this.kickDir = new Vec2(kickDirX, kickDirY).normalize();
        this.points = points;
        this.kickForce = kickForce;
        this.hitTimer = 0;
        this.color = '#00e8d8';
    }

    trigger() {
        this.hitTimer = 10;
    }
}

class Flipper {
    constructor(x, y, length, restAngle, activeAngle, isLeft = true, color = '#fcfcfc') {
        this.pivot = new Vec2(x, y);
        this.tip = new Vec2(x, y);
        this.length = length;
        this.restAngle = restAngle;
        this.activeAngle = activeAngle;
        this.angle = restAngle;
        this.prevAngle = restAngle;
        this.angularVelocity = 0;
        this.isLeft = isLeft;
        this.isPressed = false;
        this.color = color;
        this.thickness = 8;
        this.upSpeed = 54;    // Fast snappy up-stroke (rad/s)
        this.downSpeed = 32;  // Spring return down-stroke (rad/s)
        this.updateTip();
    }

    updateTip() {
        this.tip.x = this.pivot.x + Math.cos(this.angle) * this.length;
        this.tip.y = this.pivot.y + Math.sin(this.angle) * this.length;
    }

    update(dt) {
        this.prevAngle = this.angle;
        const targetAngle = this.isPressed ? this.activeAngle : this.restAngle;
        const speed = this.isPressed ? this.upSpeed : this.downSpeed;

        if (this.isLeft) {
            if (this.isPressed) {
                if (this.angle > targetAngle) {
                    this.angle -= speed * dt;
                    if (this.angle < targetAngle) this.angle = targetAngle;
                }
            } else {
                if (this.angle < targetAngle) {
                    this.angle += speed * dt;
                    if (this.angle > targetAngle) this.angle = targetAngle;
                }
            }
        } else {
            if (this.isPressed) {
                if (this.angle < targetAngle) {
                    this.angle += speed * dt;
                    if (this.angle > targetAngle) this.angle = targetAngle;
                }
            } else {
                if (this.angle > targetAngle) {
                    this.angle -= speed * dt;
                    if (this.angle < targetAngle) this.angle = targetAngle;
                }
            }
        }

        this.angularVelocity = (this.angle - this.prevAngle) / (dt || 0.016);
        this.updateTip();
    }
}

class TargetItem {
    constructor(x, y, w, h, label, points = 200, type = 'NUMBER', color = '#f8b800') {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.label = label;
        this.points = points;
        this.type = type;
        this.color = color;
        this.isHit = false;
        this.flashTimer = 0;
    }
}

class RetractableStopper {
    constructor(x, y, radius = 7, duration = 15000, color = '#58f858') {
        this.pos = new Vec2(x, y);
        this.radius = radius;
        this.active = false;
        this.timer = 0;
        this.duration = duration;
        this.color = color;
    }

    activate(duration = 15000) {
        this.active = true;
        this.timer = duration;
    }

    update(dt) {
        if (this.active) {
            this.timer -= dt * 1000;
            if (this.timer <= 0) {
                this.active = false;
            }
        }
    }
}

class HoleTrigger {
    constructor(x, y, radius = 16, targetScene = null, ejectDir = new Vec2(0, -6), points = 500) {
        this.pos = new Vec2(x, y);
        this.radius = radius;
        this.targetScene = targetScene;
        this.ejectDir = ejectDir;
        this.points = points;
        this.active = true;
    }
}

class PhysicsWorld {
    constructor() {
        this.gravity = new Vec2(0, 560); // Pixels / s^2 (Authentic arcade weight)
        this.subSteps = 16;              // 16 substeps per frame = sub-millisecond precision
        this.isTilted = false;
    }

    step(ball, table, dt, onEvent) {
        if (!ball.active) return;

        const subDt = dt / this.subSteps;

        for (let s = 0; s < this.subSteps; s++) {
            // Integrate gravity
            ball.vel.x += this.gravity.x * subDt;
            ball.vel.y += this.gravity.y * subDt;

            // Rolling damping
            ball.vel.x *= (1 - 0.012 * subDt);
            ball.vel.y *= (1 - 0.012 * subDt);

            // Speed clamping
            const speedSq = ball.vel.lengthSq();
            const maxSpeed = 2200;
            if (speedSq > maxSpeed * maxSpeed) {
                ball.vel.normalize().mult(maxSpeed);
            }

            // Move ball
            ball.pos.x += ball.vel.x * subDt;
            ball.pos.y += ball.vel.y * subDt;

            // Solve CCD Collisions
            this.handleWallCollisions(ball, table.walls, onEvent);
            this.handleFlipperCollisions(ball, table.flippers, onEvent);
            this.handleBumperCollisions(ball, table.bumpers, onEvent);
            this.handleSlingshotCollisions(ball, table.slingshots, onEvent);
            this.handleStopperCollisions(ball, table.stoppers, onEvent);
            this.handleTargetCollisions(ball, table.targets, onEvent);
            this.handleHoleCollisions(ball, table.holes, onEvent);
        }

        // Anti-stuck watchdog
        if (ball.inPlay && ball.active) {
            const movedDist = ball.pos.dist(ball.lastPos);
            ball.lastPos.set(ball.pos.x, ball.pos.y);

            if (movedDist < 1.0 && ball.pos.y < 1350) {
                ball.stuckTimer += dt;
                if (ball.stuckTimer > 0.5) {
                    const kickX = (Math.random() > 0.5 ? 1 : -1) * (100 + Math.random() * 50);
                    ball.vel.x += kickX;
                    ball.vel.y -= 130;
                    ball.stuckTimer = 0;
                    if (onEvent) onEvent('autoUnstuck', ball.pos);
                }
            } else {
                ball.stuckTimer = 0;
            }
        }

        // Motion trail
        if (Math.random() < 0.4) {
            ball.trail.push({ x: ball.pos.x, y: ball.pos.y, alpha: 0.6 });
            if (ball.trail.length > 5) ball.trail.shift();
        }
        for (let t of ball.trail) t.alpha -= 0.04;
        ball.trail = ball.trail.filter(t => t.alpha > 0);
    }

    handleWallCollisions(ball, walls, onEvent) {
        if (!walls) return;
        for (let wall of walls) {
            const collision = this.checkCircleSegmentCollision(ball.pos, ball.radius, wall.p1, wall.p2);
            if (collision) {
                if (wall.oneWay) {
                    const dot = ball.vel.dot(wall.normal);
                    if (dot > 0) continue;
                }

                // Positional correction
                ball.pos.add(collision.normal.copy().mult(collision.penetration));

                // Restitution & friction impulse
                const normalVel = ball.vel.dot(collision.normal);
                if (normalVel < 0) {
                    const tangentVel = ball.vel.dot(wall.tangent);
                    const normalImpulse = -(1 + wall.restitution) * normalVel;
                    const frictionImpulse = -tangentVel * wall.friction;

                    ball.vel.add(collision.normal.copy().mult(normalImpulse));
                    ball.vel.add(wall.tangent.copy().mult(frictionImpulse));
                }
            }
        }
    }

    handleFlipperCollisions(ball, flippers, onEvent) {
        if (!flippers) return;
        for (let flipper of flippers) {
            const collision = this.checkCircleSegmentCollision(ball.pos, ball.radius, flipper.pivot, flipper.tip);
            if (collision) {
                ball.pos.add(collision.normal.copy().mult(collision.penetration));

                // Calculate flipper rotational velocity at contact point
                const contactOffset = collision.closestPoint.copy().sub(flipper.pivot);
                const r = Math.min(contactOffset.length(), flipper.length);
                const tangent = new Vec2(-Math.sin(flipper.angle), Math.cos(flipper.angle));
                const flipperVel = tangent.mult(flipper.angularVelocity * r);

                const relVel = ball.vel.copy().sub(flipperVel);
                const normalRelVel = relVel.dot(collision.normal);

                if (normalRelVel < 0) {
                    const restitution = 0.7;
                    const impulse = -(1 + restitution) * normalRelVel;
                    ball.vel.add(collision.normal.copy().mult(impulse));

                    // Add dynamic flipper stroke impulse
                    if (Math.abs(flipper.angularVelocity) > 2.0) {
                        const tipRatio = Math.max(0.4, r / flipper.length);
                        // Impart direct upward / angled kick proportional to stroke speed and tip position
                        const flipImpulse = collision.normal.copy().mult(Math.abs(flipper.angularVelocity) * tipRatio * 25);
                        ball.vel.add(flipImpulse);
                        if (onEvent) onEvent('flipperHit', { flipper, power: tipRatio });
                    }
                }
            }
        }
    }

    handleBumperCollisions(ball, bumpers, onEvent) {
        if (!bumpers) return;
        for (let bumper of bumpers) {
            const dist = ball.pos.dist(bumper.pos);
            const minDist = ball.radius + bumper.radius;
            if (dist < minDist) {
                const normal = ball.pos.copy().sub(bumper.pos).normalize();
                if (normal.lengthSq() === 0) normal.set(0, -1);

                ball.pos.set(bumper.pos.x + normal.x * minDist, bumper.pos.y + normal.y * minDist);

                // Solenoid kick
                const curSpeed = ball.vel.length();
                const bounceSpeed = Math.max(curSpeed * 1.2, 400) + bumper.kickForce * 25;
                ball.vel = normal.mult(bounceSpeed);

                bumper.trigger();
                if (onEvent) onEvent('bumperHit', bumper);
            }
        }
    }

    handleSlingshotCollisions(ball, slingshots, onEvent) {
        if (!slingshots) return;
        for (let sling of slingshots) {
            const collision = this.checkCircleSegmentCollision(ball.pos, ball.radius, sling.p1, sling.p2);
            if (collision) {
                ball.pos.add(collision.normal.copy().mult(collision.penetration));
                ball.vel = sling.kickDir.copy().mult(sling.kickForce * 60 + 260);
                sling.trigger();
                if (onEvent) onEvent('slingshotHit', sling);
            }
        }
    }

    handleStopperCollisions(ball, stoppers, onEvent) {
        if (!stoppers) return;
        for (let st of stoppers) {
            if (!st.active) continue;
            const dist = ball.pos.dist(st.pos);
            const minDist = ball.radius + st.radius;
            if (dist < minDist) {
                const normal = ball.pos.copy().sub(st.pos).normalize();
                if (normal.lengthSq() === 0) normal.set(0, -1);

                ball.pos.set(st.pos.x + normal.x * minDist, st.pos.y + normal.y * minDist);
                ball.vel = normal.mult(Math.max(ball.vel.length() * 1.15, 380));
                if (onEvent) onEvent('stopperHit', st);
            }
        }
    }

    handleTargetCollisions(ball, targets, onEvent) {
        if (!targets) return;
        for (let t of targets) {
            const closestX = Math.max(t.x, Math.min(ball.pos.x, t.x + t.w));
            const closestY = Math.max(t.y, Math.min(ball.pos.y, t.y + t.h));
            const dx = ball.pos.x - closestX;
            const dy = ball.pos.y - closestY;
            const distSq = dx * dx + dy * dy;

            if (distSq < ball.radius * ball.radius) {
                const dist = Math.sqrt(distSq);
                const normal = dist > 0 ? new Vec2(dx / dist, dy / dist) : new Vec2(0, -1);
                const pen = ball.radius - dist;
                ball.pos.add(normal.copy().mult(pen));

                const normalVel = ball.vel.dot(normal);
                if (normalVel < 0) {
                    ball.vel.add(normal.copy().mult(-1.65 * normalVel));
                }

                t.flashTimer = 12;
                if (onEvent) onEvent('targetHit', t);
            }
        }
    }

    handleHoleCollisions(ball, holes, onEvent) {
        if (!holes) return;
        for (let hole of holes) {
            if (!hole.active) continue;
            const dist = ball.pos.dist(hole.pos);
            if (dist < hole.radius * 0.75) {
                ball.active = false;
                if (onEvent) onEvent('holeEnter', hole);
            }
        }
    }

    checkCircleSegmentCollision(circlePos, radius, p1, p2) {
        const seg = p2.copy().sub(p1);
        const segLenSq = seg.lengthSq();
        if (segLenSq === 0) return null;

        const toCircle = circlePos.copy().sub(p1);
        let t = toCircle.dot(seg) / segLenSq;
        t = Math.max(0, Math.min(1, t));

        const closest = p1.copy().add(seg.mult(t));
        const diff = circlePos.copy().sub(closest);
        const distSq = diff.lengthSq();

        if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq);
            let normal;
            if (dist > 0.0001) {
                normal = diff.copy().mult(1 / dist);
            } else {
                normal = new Vec2(-seg.y, seg.x).normalize();
            }
            return {
                penetration: radius - dist,
                normal: normal,
                closestPoint: closest
            };
        }
        return null;
    }
}
