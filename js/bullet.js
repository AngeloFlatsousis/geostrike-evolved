class Bullet {
    constructor(x, y, vel, dmg, pierces = 0) {
        this.pos = createVector(x, y);
        this.vel = vel;
        this.radius = BULLET_SETTINGS.RADIUS;
        this.color = color(255, 220, 50); // Standard bullet color
        this.lifespan = 255; // Initial lifespan, decreases over time
        this.trail = [];
        this.trailLength = BULLET_SETTINGS.TRAIL_LENGTH;
        this.damage = dmg;
        this.piercesLeft = pierces;
        this.hitEnemies = new Set(); // Enemies already hit (piercing logic)
        this.dead = false;
    }

    update() {
        this.pos.add(p5.Vector.mult(this.vel, dtScale));
        this.lifespan -= BULLET_SETTINGS.LIFESPAN_DECREMENT * dtScale;

        // Update trail
        this.trail.push(this.pos.copy());
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }
        this.hitEnemies.clear();
    }

    isOffscreen() {
        return (
            this.pos.x < -this.radius * 2 ||
            this.pos.x > width + this.radius * 2 ||
            this.pos.y < -this.radius * 2 ||
            this.pos.y > height + this.radius * 2 ||
            this.lifespan <= 0
        );
    }

    onHitEnemy(enemy) {
        if (this.hitEnemies.has(enemy)) { // Already hit this enemy
            return false;
        }
        this.hitEnemies.add(enemy);
        if (this.piercesLeft > 0) {
            this.piercesLeft--;
            return false; // Bullet survives to pierce another enemy
        }
        return true; // Bullet should be destroyed
    }

    draw() {
        // Draw trail
        noFill();
        beginShape();
        for (let i = 0; i < this.trail.length; i++) {
            let alpha = map(i, 0, this.trail.length, 0, 200);
            let weight = map(i, 0, this.trail.length, 1, this.radius * 1.6);

            strokeWeight(weight * 2); // Outer glow for trail
            stroke(red(this.color), green(this.color), blue(this.color), alpha * 0.2);
            vertex(this.trail[i].x, this.trail[i].y);

            strokeWeight(weight); // Inner core for trail
            stroke(red(this.color), green(this.color), blue(this.color), alpha);
            vertex(this.trail[i].x, this.trail[i].y);
        }
        endShape();

        // Draw bullet core
        let coreAlpha = map(this.lifespan, 0, 255, 50, 255); // Fade out as lifespan decreases
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), coreAlpha * 0.3); // Glow
        ellipse(this.pos.x, this.pos.y, this.radius * 4);

        fill(red(this.color), green(this.color), blue(this.color), coreAlpha); // Core
        ellipse(this.pos.x, this.pos.y, this.radius * 2);
    }
}

// Hostile projectile fired by bosses.
class EnemyBullet {
    constructor(x, y, angle, speed, sourceColor = null) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.fromAngle(angle).mult(speed);
        this.radius = ENEMY_BULLET_SETTINGS.RADIUS;
        const base = sourceColor || color(255, 120, 60);
        this.color = color(
            constrain(red(base) + 70, 60, 255),
            constrain(green(base) * 0.5 + 70, 40, 220),
            90
        );
        this.lifespan = ENEMY_BULLET_SETTINGS.LIFESPAN;
        this.trail = [];
        this.trailLength = ENEMY_BULLET_SETTINGS.TRAIL_LENGTH;
        this.phase = random(TWO_PI);
    }

    update() {
        this.pos.add(p5.Vector.mult(this.vel, dtScale));
        this.lifespan -= deltaTime;
        this.trail.push(this.pos.copy());
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }
    }

    isOffscreen() {
        const margin = this.radius * 3;
        return (
            this.pos.x < -margin || this.pos.x > width + margin ||
            this.pos.y < -margin || this.pos.y > height + margin ||
            this.lifespan <= 0
        );
    }

    draw() {
        let pulse = 0.8 + 0.2 * sin(frameCount * 0.25 + this.phase);
        let alpha = constrain(map(this.lifespan, 0, 1000, 40, 255, true), 40, 255);

        // Trail
        noFill();
        beginShape();
        for (let i = 0; i < this.trail.length; i++) {
            let a = map(i, 0, this.trail.length, 0, alpha * 0.5);
            strokeWeight(map(i, 0, this.trail.length, 1, this.radius * 1.2));
            stroke(red(this.color), green(this.color), blue(this.color), a);
            vertex(this.trail[i].x, this.trail[i].y);
        }
        endShape();

        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), alpha * 0.28);
        ellipse(this.pos.x, this.pos.y, this.radius * 4.4 * pulse);
        fill(red(this.color), green(this.color), blue(this.color), alpha);
        ellipse(this.pos.x, this.pos.y, this.radius * 2.6);
        fill(255, 240, 220, alpha);
        ellipse(this.pos.x, this.pos.y, this.radius * 1.5);
    }
}
