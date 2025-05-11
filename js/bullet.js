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
        this.hitEnemies = new Set(); // Keep track of enemies hit in a single update (for piercing)
    }

    update() {
        this.pos.add(this.vel);
        this.lifespan -= BULLET_SETTINGS.LIFESPAN_DECREMENT;

        // Update trail
        this.trail.push(this.pos.copy());
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }
        this.hitEnemies.clear(); // Clear at the start of each update cycle
    }

    isOffscreen() {
        return (
            this.pos.x < -this.radius ||
            this.pos.x > width + this.radius ||
            this.pos.y < -this.radius ||
            this.pos.y > height + this.radius ||
            this.lifespan <= 0
        );
    }

    onHitEnemy(enemy) {
        if (this.hitEnemies.has(enemy)) { // Already hit this enemy in the current update cycle
            return false; // Don't count as a new hit for piercing logic / destruction
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
        fill(red(this.color), green(this.color), blue(this.color), coreAlpha * 0.3); // Glow
        noStroke();
        ellipse(this.pos.x, this.pos.y, this.radius * 4);

        fill(red(this.color), green(this.color), blue(this.color), coreAlpha); // Core
        ellipse(this.pos.x, this.pos.y, this.radius * 2);
    }
}