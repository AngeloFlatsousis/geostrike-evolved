class Asteroid {
    constructor(x, y, r, generation = 0) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(random(0.1, ASTEROID_SETTINGS.MAX_SPEED));
        this.radius = r || random(ASTEROID_SETTINGS.MIN_RADIUS, ASTEROID_SETTINGS.MAX_RADIUS);
        this.generation = generation;
        this.health = max(1, floor(this.radius * ASTEROID_SETTINGS.MAX_HEALTH_FACTOR));
        this.baseHealth = this.health;
        this.baseColor = color(120, 100, 90);
        this.currentColor = this.baseColor;
        this.hitColor = color(200, 180, 170);
        this.hitTimer = 0;
        this.dead = false;

        this.vertices = [];
        let numVerts = floor(random(7, 12));
        for (let i = 0; i < numVerts; i++) {
            let angle = map(i, 0, numVerts, 0, TWO_PI);
            let rOffset = random(this.radius * 0.8, this.radius * 1.2); // Irregular shape
            this.vertices.push(createVector(cos(angle) * rOffset, sin(angle) * rOffset));
        }
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.01, 0.01);
    }

    update() {
        this.pos.add(p5.Vector.mult(this.vel, dtScale));
        this.rotation += this.rotationSpeed * dtScale;

        // Screen wrapping
        if (this.pos.x < -this.radius) this.pos.x = width + this.radius;
        if (this.pos.x > width + this.radius) this.pos.x = -this.radius;
        if (this.pos.y < -this.radius) this.pos.y = height + this.radius;
        if (this.pos.y > height + this.radius) this.pos.y = -this.radius;

        // Hit color timer
        if (this.hitTimer > 0) {
            this.hitTimer -= deltaTime;
            if (this.hitTimer <= 0) {
                this.currentColor = this.baseColor;
            }
        }
    }

    takeDamage(amount) {
        if (this.dead) return false;
        this.health -= amount;
        this.currentColor = this.hitColor;
        this.hitTimer = ASTEROID_SETTINGS.HIT_COLOR_DURATION;

        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    die() {
        if (this.dead) return;
        this.dead = true;

        createExplosion(this.pos.x, this.pos.y, floor(this.radius * 1.5), this.baseColor, this.radius / 20);
        let points = floor(this.baseHealth * ASTEROID_SETTINGS.POINTS_PER_HEALTH * scoreMultiplier);
        score += points;
        let credits = floor(this.baseHealth * ASTEROID_SETTINGS.CREDITS_PER_HEALTH * scoreMultiplier);
        playerCredits += credits;
        runCreditsEarned += max(0, credits);
        runKills++;
        playSfx('explode');

        // Big rocks break apart into smaller ones (classic asteroids rule).
        if (this.radius >= ASTEROID_SETTINGS.SPLIT_MIN_RADIUS && this.generation < ASTEROID_SETTINGS.MAX_GENERATION) {
            for (let i = 0; i < 2; i++) {
                let angle = random(TWO_PI);
                let offset = this.radius * 0.55;
                let child = new Asteroid(
                    this.pos.x + cos(angle) * offset,
                    this.pos.y + sin(angle) * offset,
                    this.radius * ASTEROID_SETTINGS.SPLIT_FACTOR,
                    this.generation + 1
                );
                child.vel = p5.Vector.add(this.vel, p5.Vector.fromAngle(angle).mult(random(0.4, 1.1)));
                asteroids.push(child);
            }
        }

        let index = asteroids.indexOf(this);
        if (index > -1) {
            asteroids.splice(index, 1);
        }
    }

    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.rotation);
        fill(this.currentColor);
        stroke(red(this.currentColor) * 0.7, green(this.currentColor) * 0.7, blue(this.currentColor) * 0.7);
        strokeWeight(2);
        beginShape();
        for (let v of this.vertices) {
            vertex(v.x, v.y);
        }
        endShape(CLOSE);
        pop();
    }
}
