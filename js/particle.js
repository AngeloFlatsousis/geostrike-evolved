class Particle {
    constructor(x, y, pColor, sizeMultiplier = 1) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(random(0.5, 6 * sizeMultiplier)); // Random initial velocity
        this.lifespan = 255; // Initial lifespan, fades over time
        this.radius = random(1.5, 4.5) * sizeMultiplier;
        this.baseRadius = this.radius; // Store initial radius for scaling
        this.color = pColor || color(255, random(100, 200), 0); // Default orange-ish if no color provided
        this.friction = random(PARTICLE_SETTINGS.FRICTION_MIN, PARTICLE_SETTINGS.FRICTION_MAX);
    }

    update() {
        this.pos.add(this.vel);
        this.vel.mult(this.friction); // Apply friction to slow down
        this.lifespan -= random(PARTICLE_SETTINGS.LIFESPAN_DECREMENT_MIN, PARTICLE_SETTINGS.LIFESPAN_DECREMENT_MAX);
        this.radius = this.baseRadius * (this.lifespan / 255); // Shrink as lifespan decreases
    }

    isDead() {
        return this.lifespan <= 0 || this.radius <= 0.1; // Particle is dead if faded or too small
    }

    draw() {
        let alpha = constrain(this.lifespan, 0, 255); // Ensure alpha is within valid range

        // Outer glow
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), alpha * 0.3);
        ellipse(this.pos.x, this.pos.y, this.radius * 3);

        // Inner core
        fill(red(this.color), green(this.color), blue(this.color), alpha);
        ellipse(this.pos.x, this.pos.y, this.radius * 2);
    }
}