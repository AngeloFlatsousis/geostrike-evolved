class Player {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.radius = PLAYER_SETTINGS.RADIUS;
        this.friction = PLAYER_SETTINGS.FRICTION;
        this.color = color(0, 180, 255);
        this.trail = [];
        this.trailLength = PLAYER_SETTINGS.TRAIL_LENGTH;
        this.invulnerable = false;
        this.invulnerableTime = 0;
        this.invulnerableDuration = PLAYER_SETTINGS.INVULNERABLE_DURATION;
        this.hasShield = false;
        this.shieldStartTime = 0;
        this.shieldDuration = PLAYER_SETTINGS.SHIELD_BASE_DURATION;
        this.shieldMaxDuration = PLAYER_SETTINGS.SHIELD_BASE_DURATION;

        this.baseSpeed = PLAYER_SETTINGS.BASE_SPEED;
        this.baseShootCooldown = PLAYER_SETTINGS.BASE_SHOOT_COOLDOWN;
        this.baseBulletDamage = PLAYER_SETTINGS.BASE_BULLET_DAMAGE;
        this.baseBulletSpeed = PLAYER_SETTINGS.BASE_BULLET_SPEED;
        this.basePickupRadius = PLAYER_SETTINGS.BASE_PICKUP_RADIUS;
        this.baseBombRadius = PLAYER_SETTINGS.BASE_BOMB_RADIUS;

        this.speed = this.baseSpeed;
        this.shootCooldown = this.baseShootCooldown;
        this.bulletDamage = this.baseBulletDamage;
        this.bulletSpeed = this.baseBulletSpeed;
        this.pickupRadius = this.basePickupRadius;
        this.currentBombRadius = this.baseBombRadius;
        this.maxBombs = PLAYER_SETTINGS.INITIAL_BOMBS;
        this.bulletPierces = 0;

        this.bombs = PLAYER_SETTINGS.INITIAL_BOMBS;
        this.lastBombTime = -Infinity; // Allow bombing immediately
        this.bombCooldown = PLAYER_SETTINGS.BOMB_COOLDOWN;
        this.lastShotTime = 0;
    }

    applyUpgrades() {
        // Assumes availableUpgrades is globally defined and populated
        this.speed = this.baseSpeed * (availableUpgrades.playerSpeed.effect());
        this.shootCooldown = this.baseShootCooldown / (availableUpgrades.fireRate.effect());
        this.bulletDamage = this.baseBulletDamage * (availableUpgrades.bulletDamage.effect());
        this.bulletSpeed = this.baseBulletSpeed * (availableUpgrades.bulletSpeed.effect());
        this.pickupRadius = this.basePickupRadius * (availableUpgrades.pickupMagnet.effect());
        this.maxBombs = floor(availableUpgrades.bombCapacity.effect());
        this.currentBombRadius = this.baseBombRadius * (availableUpgrades.bombRadius.effect());
        this.shieldMaxDuration = PLAYER_SETTINGS.SHIELD_BASE_DURATION * (availableUpgrades.shieldDuration.effect());
        this.bulletPierces = floor(availableUpgrades.piercingShots.effect());
        this.bombs = min(this.bombs, this.maxBombs); // Ensure current bombs don't exceed new max
    }

    handleInput() {
        let moveDir = createVector(0, 0);
        if (moveUp) moveDir.y -= 1;
        if (moveDown) moveDir.y += 1;
        if (moveLeft) moveDir.x -= 1;
        if (moveRight) moveDir.x += 1;

        if (moveDir.magSq() > 0) { // Check if there's any movement input
            moveDir.normalize().mult(this.speed * 0.8); // Apply 80% of speed for finer control or diagonal consistency
            this.vel.add(moveDir);
            this.vel.limit(this.speed); // Cap velocity at current max speed
        }
    }

    shoot() {
        if (millis() - this.lastShotTime > this.shootCooldown) {
            let angle = atan2(mouseY - this.pos.y, mouseX - this.pos.x);
            let bulletVel = p5.Vector.fromAngle(angle).mult(this.bulletSpeed);
            bullets.push(new Bullet(this.pos.x, this.pos.y, bulletVel, this.bulletDamage, this.bulletPierces));
            this.lastShotTime = millis();
        }
    }

    useBomb() {
        if (this.bombs > 0 && millis() - this.lastBombTime > this.bombCooldown) {
            this.bombs--;
            this.lastBombTime = millis();
            screenShakeMagnitude = 25; // Consider making this a constant
            createExplosion(this.pos.x, this.pos.y, PLAYER_SETTINGS.BOMB_PARTICLE_COUNT, color(255, 255, 255), 3);

            for (let i = enemies.length - 1; i >= 0; i--) {
                if (enemies[i] && dist(this.pos.x, this.pos.y, enemies[i].pos.x, enemies[i].pos.y) < this.currentBombRadius + enemies[i].radius) {
                    enemies[i].takeDamage(1000); // Insta-kill most enemies
                }
            }
            // Clear bullets caught in bomb blast
            for (let i = bullets.length - 1; i >= 0; i--) {
                 if (bullets[i] && dist(this.pos.x, this.pos.y, bullets[i].pos.x, bullets[i].pos.y) < this.currentBombRadius) {
                    createExplosion(bullets[i].pos.x, bullets[i].pos.y, 3, bullets[i].color, 0.5); // Small effect for bullet
                    bullets.splice(i, 1);
                }
            }
        }
    }

    addBomb(count = 1) {
        this.bombs = min(this.maxBombs, this.bombs + count);
    }

    activateShield() {
        this.hasShield = true;
        this.shieldStartTime = millis();
        this.shieldDuration = this.shieldMaxDuration; // Use potentially upgraded duration
    }

    update() {
        this.handleInput();
        this.pos.add(this.vel);
        this.vel.mult(this.friction); // Apply friction to slow down

        // Trail update
        this.trail.push(this.pos.copy());
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }

        // Boundary constraints
        this.pos.x = constrain(this.pos.x, this.radius, width - this.radius);
        this.pos.y = constrain(this.pos.y, this.radius, height - this.radius);

        // Invulnerability timer
        if (this.invulnerable && millis() - this.invulnerableTime > this.invulnerableDuration) {
            this.invulnerable = false;
        }

        // Shield timer
        if (this.hasShield && millis() - this.shieldStartTime > this.shieldDuration) {
            this.hasShield = false;
            createExplosion(this.pos.x, this.pos.y, 20, color(180, 180, 255, 150), 1); // Shield break effect
        }
        this.attractPickups();
    }

    attractPickups() {
        for (let pickup of pickups) {
            let d = dist(this.pos.x, this.pos.y, pickup.pos.x, pickup.pos.y);
            // Attract if within pickupRadius but not already collected (d > sum of radii)
            if (d < this.pickupRadius && d > (this.radius + pickup.radius)) {
                let attractForce = p5.Vector.sub(this.pos, pickup.pos).normalize();
                // Force stronger when closer
                attractForce.mult(map(d, 0, this.pickupRadius, 5, 0.5));
                pickup.vel.add(attractForce);
            }
        }
    }

    startInvulnerability() {
        this.invulnerable = true;
        this.invulnerableTime = millis();
    }

    draw() {
        // Draw trail
        noFill();
        beginShape();
        for (let i = 0; i < this.trail.length; i++) {
            let alpha = map(i, 0, this.trail.length, 0, 150);
            let weight = map(i, 0, this.trail.length, 1, this.radius * 0.9);
            let flicker = this.invulnerable && frameCount % 10 < 5;

            strokeWeight(weight * 2.5); // Outer glow
            if (flicker) stroke(255, 255, 255, alpha * 0.2);
            else stroke(red(this.color), green(this.color), blue(this.color), alpha * 0.2);
            vertex(this.trail[i].x, this.trail[i].y);

            strokeWeight(weight); // Inner core
            if (flicker) stroke(255, 255, 255, alpha * 0.7);
            else stroke(red(this.color), green(this.color), blue(this.color), alpha);
            vertex(this.trail[i].x, this.trail[i].y);
        }
        endShape();

        // Draw player ship
        push();
        translate(this.pos.x, this.pos.y);
        let angle = atan2(mouseY - this.pos.y, mouseX - this.pos.x);
        rotate(angle + HALF_PI); // Point towards mouse

        let flicker = this.invulnerable && frameCount % 10 < 5;
        let mainFill = flicker ? color(255, 255, 255, 200) : this.color;
        let glowFill = flicker ? color(255, 255, 255, 50) : color(red(this.color), green(this.color), blue(this.color), 60);
        let mainStroke = flicker ? color(255) : color(255);

        // Glow effect
        scale(PLAYER_SETTINGS.DRAW_GLOW_SCALE);
        fill(glowFill);
        noStroke();
        triangle(-this.radius * 0.8, this.radius, this.radius * 0.8, this.radius, 0, -this.radius);
        scale(1 / PLAYER_SETTINGS.DRAW_GLOW_SCALE); // Reset scale

        // Main ship body
        fill(mainFill);
        stroke(mainStroke);
        strokeWeight(2);
        triangle(-this.radius * 0.8, this.radius, this.radius * 0.8, this.radius, 0, -this.radius);
        pop();

        // Draw shield
        if (this.hasShield) {
            push();
            translate(this.pos.x, this.pos.y);
            // Fade in/out alpha for shield
            let shieldAlpha = map(millis() - this.shieldStartTime, 0, this.shieldDuration, 150, 50, true);
            shieldAlpha = min(shieldAlpha, map(this.shieldDuration - (millis() - this.shieldStartTime), 0, 1000, 50, 150, true)); // Fade out quickly at end

            fill(150, 150, 255, shieldAlpha * 0.6);
            stroke(200, 200, 255, shieldAlpha);
            strokeWeight(2);
            let shieldSize = this.radius * 3.5 + sin(frameCount * 0.2) * 3; // Pulsating effect
            ellipse(0, 0, shieldSize, shieldSize);
            pop();
        }
    }

    hit() {
        if (this.hasShield) {
            this.hasShield = false;
            screenShakeMagnitude = 10; // Consider constant
            createExplosion(this.pos.x, this.pos.y, 30, color(180, 180, 255, 200), 1.5); // Shield hit effect
            return false; // Shield absorbed the hit, game not over
        }

        if (!this.invulnerable) {
            playerLives--;
            screenShakeMagnitude = 18; // Consider constant
            createExplosion(this.pos.x, this.pos.y, 60, this.color, 2); // Player hit effect
            resetMultiplier();

            if (playerLives <= 0) {
                currentGameState = GAME_STATE.GAME_OVER;
                saveGameData(); // Updated function name
                playMusic(menuMusic); // Play menu music on game over
                return true; // Game is over
            } else {
                // Reset player position and grant temporary invulnerability
                this.pos.set(width / 2, height / 2);
                this.vel.set(0, 0);
                this.trail = [];
                this.startInvulnerability();
                return false; // Game not over
            }
        }
        return false; // Player was invulnerable, game not over
    }
}