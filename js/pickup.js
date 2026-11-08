class Pickup {
    constructor(x, y, type) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0); // Pickups are stationary until attracted
        this.friction = PICKUP_SETTINGS.FRICTION;
        this.type = type;
        this.radius = PICKUP_SETTINGS.RADIUS;
        this.lifespan = PICKUP_SETTINGS.LIFESPAN;
        this.maxLifespan = PICKUP_SETTINGS.LIFESPAN;
        this.creationTime = millis();
        this.pulseSpeed = PICKUP_SETTINGS.PULSE_SPEED;
        this.dead = false;

        switch (type) {
            case PICKUP_TYPE.BOMB:
                this.color = color(255, 225, 60); // Yellow for Bomb
                this.symbol = 'B';
                break;
            case PICKUP_TYPE.SHIELD:
                this.color = color(120, 140, 255); // Blue for Shield
                this.symbol = 'S';
                break;
            case PICKUP_TYPE.RAPID:
                this.color = color(255, 130, 50); // Orange for Rapid Fire
                this.symbol = 'R';
                break;
            default: // Fallback for unknown types
                this.color = color(0, 255, 0); // Green
                this.symbol = '?';
                break;
        }
    }

    update() {
        this.lifespan -= deltaTime; // Frame-rate independent decay
        this.pos.add(p5.Vector.mult(this.vel, dtScale));
        this.vel.mult(pow(this.friction, dtScale)); // Slows down after being attracted

        // Check for collection by player
        if (player && dist(this.pos.x, this.pos.y, player.pos.x, player.pos.y) < this.radius + player.radius) {
            this.collect();
        }
    }

    collect() {
        if (this.dead || !player) return;
        this.dead = true;

        if (this.type === PICKUP_TYPE.BOMB) {
            player.addBomb();
            if (typeof showFloatingLabel === 'function') showFloatingLabel(this.pos.x, this.pos.y, '+1 BOMB', this.color);
        } else if (this.type === PICKUP_TYPE.SHIELD) {
            player.activateShield();
            if (typeof showFloatingLabel === 'function') showFloatingLabel(this.pos.x, this.pos.y, 'SHIELD', this.color);
        } else if (this.type === PICKUP_TYPE.RAPID) {
            player.activateRapidFire();
            if (typeof showFloatingLabel === 'function') showFloatingLabel(this.pos.x, this.pos.y, 'RAPID FIRE', this.color);
        }
        createExplosion(this.pos.x, this.pos.y, 15, this.color, 0.8); // Collection visual effect
        playSfx('pickup');
        this.lifespan = 0; // Mark for removal
    }

    isDead() {
        return this.lifespan <= 0;
    }

    draw() {
        let timeElapsed = millis() - this.creationTime;
        let pulseAmount = sin(timeElapsed * this.pulseSpeed / 1000) * 2 + 2; // Gentle pulsing size effect

        // Fade out pickup as lifespan nears end (e.g., last 25% of lifespan)
        let alpha = map(this.lifespan, 0, this.maxLifespan * 0.25, 0, 255, true);
        if (alpha <= 0) return; // Don't draw if fully faded

        push();
        translate(this.pos.x, this.pos.y);

        // Glow effect
        let glowSize = this.radius * 1.8 + pulseAmount;
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), alpha * 0.3);
        ellipse(0, 0, glowSize * 2);

        // Main body (this used to be commented out, leaving only the letter)
        fill(red(this.color), green(this.color), blue(this.color), alpha);
        stroke(255, alpha); // White border
        strokeWeight(1.5);
        ellipse(0, 0, this.radius * 2 + pulseAmount / 2);

        // Symbol text
        textAlign(CENTER, CENTER);
        textSize(this.radius * 1.5);
        noStroke();
        fill(10, 20, 30, alpha); // Dark symbol for contrast
        text(this.symbol, 0, 1); // Slight offset for better centering
        pop();
    }
}
