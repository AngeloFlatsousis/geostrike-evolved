class Asteroid {
    constructor(x, y, r) {
        this.pos = createVector(x,y);
        this.vel = p5.Vector.random2D().mult(random(0.1, ASTEROID_SETTINGS.MAX_SPEED));
        this.radius = r || random(ASTEROID_SETTINGS.MIN_RADIUS, ASTEROID_SETTINGS.MAX_RADIUS);
        this.health = floor(this.radius * ASTEROID_SETTINGS.MAX_HEALTH_FACTOR);
        this.baseHealth = this.health;
        this.baseColor = color(120,100,90); // Original asteroid color
        this.currentColor = this.baseColor;
        this.hitColor = color(200,180,170); // Color when hit
        this.hitTimer = 0; // Timer for hit color effect

        this.vertices = [];
        let numVerts = floor(random(7,12));
        for(let i=0; i<numVerts; i++){
            let angle = map(i, 0, numVerts, 0, TWO_PI);
            let rOffset = random(this.radius * 0.8, this.radius * 1.2); // Irregular shape
            this.vertices.push(createVector(cos(angle) * rOffset, sin(angle) * rOffset));
        }
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.01, 0.01);
    }

    update() {
        this.pos.add(this.vel);
        this.rotation += this.rotationSpeed;

        // Screen wrapping
        if (this.pos.x < -this.radius) this.pos.x = width + this.radius;
        if (this.pos.x > width + this.radius) this.pos.x = -this.radius;
        if (this.pos.y < -this.radius) this.pos.y = height + this.radius;
        if (this.pos.y > height + this.radius) this.pos.y = -this.radius;

        // Hit color timer
        if (this.hitTimer > 0) {
            this.hitTimer -= deltaTime; // p5's deltaTime for frame-rate independence
            if (this.hitTimer <= 0) {
                this.currentColor = this.baseColor; // Revert to base color
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.currentColor = this.hitColor; // Change to hit color
        this.hitTimer = ASTEROID_SETTINGS.HIT_COLOR_DURATION; // Reset hit timer

        if (this.health <= 0) {
            this.die();
            return true; // Asteroid destroyed
        }
        return false; // Asteroid survived
    }

    die() {
        createExplosion(this.pos.x, this.pos.y, floor(this.radius * 1.5), this.baseColor, this.radius / 20);
        score += floor(this.baseHealth * ASTEROID_SETTINGS.POINTS_PER_HEALTH * scoreMultiplier);
        playerCredits += floor(this.baseHealth * ASTEROID_SETTINGS.CREDITS_PER_HEALTH * scoreMultiplier); // Add credits

        let index = asteroids.indexOf(this);
        if (index > -1) {
            asteroids.splice(index,1);
        }
    }

    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.rotation);
        fill(this.currentColor);
        stroke(red(this.currentColor)*0.7, green(this.currentColor)*0.7, blue(this.currentColor)*0.7); // Darker border
        strokeWeight(2);
        beginShape();
        for(let v of this.vertices) {
            vertex(v.x, v.y);
        }
        endShape(CLOSE);
        pop();
    }
}