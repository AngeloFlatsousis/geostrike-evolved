class Pickup {
    constructor(x, y, type) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0); // Pickups are initially stationary unless attracted
        this.friction = PICKUP_SETTINGS.FRICTION;
        this.type = type;
        this.radius = PICKUP_SETTINGS.RADIUS;
        this.lifespan = PICKUP_SETTINGS.LIFESPAN; // Time before pickup disappears
        this.creationTime = millis();
        this.pulseSpeed = PICKUP_SETTINGS.PULSE_SPEED;

        switch(type) {
            case PICKUP_TYPE.BOMB:
                this.color = color(255, 255, 0); // Yellow for Bomb
                this.symbol = 'B';
                break;
            case PICKUP_TYPE.SHIELD:
                this.color = color(100, 100, 255); // Blue for Shield
                this.symbol = 'S';
                break;
            default: // Fallback for unknown types
                this.color = color(0, 255, 0); // Green
                this.symbol = '?';
                break;
        }
    }

    update() {
        this.lifespan -= deltaTime; // Use p5's deltaTime for frame-rate independent decay
        this.pos.add(this.vel);
        this.vel.mult(this.friction); // If attracted, it will slow down over time

        // Check for collection by player
        if (player && dist(this.pos.x, this.pos.y, player.pos.x, player.pos.y) < this.radius + player.radius) {
            this.collect();
        }
    }

    collect() {
        if (this.type === PICKUP_TYPE.BOMB) {
            player.addBomb();
        } else if (this.type === PICKUP_TYPE.SHIELD) {
            player.activateShield();
        }
        createExplosion(this.pos.x, this.pos.y, 15, this.color, 0.8); // Collection visual effect
        this.lifespan = 0; // Mark for removal
    }

    isDead() {
        return this.lifespan <= 0;
    }

    draw() {
        let timeElapsed = millis() - this.creationTime;
        let pulseAmount = sin(timeElapsed * this.pulseSpeed / 1000) * 2 + 2; // Gentle pulsing size effect

        // Fade out pickup as lifespan nears end (e.g., last 25% of lifespan)
        let alpha = map(this.lifespan, 0, PICKUP_SETTINGS.LIFESPAN * 0.25, 0, 255, true);
        if (alpha <= 0) return; // Don't draw if fully faded

        push();
        translate(this.pos.x, this.pos.y);

        // Glow effect
        let glowSize = this.radius * 1.8 + pulseAmount;
        fill(red(this.color), green(this.color), blue(this.color), alpha * 0.3);
        noStroke();
        ellipse(0, 0, glowSize * 2);

        // Main body
        fill(red(this.color), green(this.color), blue(this.color), alpha);
        stroke(255, alpha); // White border
        strokeWeight(1.5);
        // ellipse(0, 0, this.radius * 2 + pulseAmount / 2); // Simple ellipse shape

        // Symbol text
        textAlign(CENTER, CENTER);
        textSize(this.radius * 1.5);
        fill(0, alpha); // Black symbol text
        noStroke();
        text(this.symbol, 0, 1); // Slight offset for better centering in ellipse
        pop();
    }
}