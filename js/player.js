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
        this.rapidFireUntil = 0;

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

    get rapidFireActive() {
        return millis() < this.rapidFireUntil;
    }

    get effectiveShootCooldown() {
        return this.rapidFireActive
            ? this.shootCooldown / PLAYER_SETTINGS.RAPID_FIRE_MULTIPLIER
            : this.shootCooldown;
    }

    handleInput() {
        let moveDir = createVector(0, 0);
        if (moveUp) moveDir.y -= 1;
        if (moveDown) moveDir.y += 1;
        if (moveLeft) moveDir.x -= 1;
        if (moveRight) moveDir.x += 1;

        // Virtual joystick (touch devices)
        if (isTouchMode && joystick.active) {
            let jx = joystick.x - joystick.originX;
            let jy = joystick.y - joystick.originY;
            let jDist = Math.hypot(jx, jy);
            if (jDist > JOYSTICK_DEADZONE) {
                let strength = min(1, (jDist - JOYSTICK_DEADZONE) / (JOYSTICK_RADIUS - JOYSTICK_DEADZONE));
                moveDir.x += (jx / jDist) * strength;
                moveDir.y += (jy / jDist) * strength;
            }
        }

        if (moveDir.magSq() > 0) {
            moveDir.limit(1).mult(this.speed * 0.8 * dtScale);
            this.vel.add(moveDir);
            this.vel.limit(this.speed); // Cap velocity at current max speed
        }
    }

    getAimAngle() {
        // Touch devices get auto-aim at the closest enemy (or the joystick
        // direction when there is nothing to shoot at).
        if (isTouchMode) {
            let target = getNearestEnemy(this.pos, 2000);
            if (target) {
                return atan2(target.pos.y - this.pos.y, target.pos.x - this.pos.x);
            }
            if (joystick.active) {
                let jx = joystick.x - joystick.originX;
                let jy = joystick.y - joystick.originY;
                if (Math.hypot(jx, jy) > JOYSTICK_DEADZONE) return Math.atan2(jy, jx);
            }
        }
        return atan2(mouseY - this.pos.y, mouseX - this.pos.x);
    }

    shoot() {
        if (millis() - this.lastShotTime >= this.effectiveShootCooldown) {
            let angle = this.getAimAngle();
            let bulletVel = p5.Vector.fromAngle(angle).mult(this.bulletSpeed);
            bullets.push(new Bullet(this.pos.x, this.pos.y, bulletVel, this.bulletDamage, this.bulletPierces));
            this.lastShotTime = millis();
            playSfx('shoot');
            // A little recoil makes shooting feel weighty.
            this.vel.add(p5.Vector.fromAngle(angle).mult(-0.12));
            return true;
        }
        return false;
    }

    useBomb() {
        if (this.bombs <= 0 || millis() - this.lastBombTime < this.bombCooldown) {
            return false;
        }
        this.bombs--;
        this.lastBombTime = millis();
        screenShakeMagnitude = max(screenShakeMagnitude, 25);
        createExplosion(this.pos.x, this.pos.y, PLAYER_SETTINGS.BOMB_PARTICLE_COUNT, color(255, 255, 255), 3);
        playSfx('bomb');

        // Snapshot the arrays: takeDamage() can splice entities out.
        for (let e of enemies.slice()) {
            if (!e || e.dead) continue;
            if (dist(this.pos.x, this.pos.y, e.pos.x, e.pos.y) < this.currentBombRadius + e.radius) {
                e.takeDamage(1000); // Insta-kill most enemies
            }
        }
        for (let a of asteroids.slice()) {
            if (!a || a.dead) continue;
            if (dist(this.pos.x, this.pos.y, a.pos.x, a.pos.y) < this.currentBombRadius + a.radius) {
                a.takeDamage(1000);
            }
        }
        // Clear enemy fire caught in the blast
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            let eb = enemyBullets[i];
            if (!eb) continue;
            if (dist(this.pos.x, this.pos.y, eb.pos.x, eb.pos.y) < this.currentBombRadius) {
                createExplosion(eb.pos.x, eb.pos.y, 3, eb.color, 0.5);
                enemyBullets.splice(i, 1);
            }
        }
        // The blast protects you for a moment so bombs double as panic buttons.
        this.startInvulnerability(PLAYER_SETTINGS.BOMB_INVULNERABLE_DURATION);
        return true;
    }

    addBomb(count = 1) {
        this.bombs = min(this.maxBombs, this.bombs + count);
    }

    activateShield() {
        this.hasShield = true;
        this.shieldStartTime = millis();
        this.shieldDuration = this.shieldMaxDuration;
    }

    activateRapidFire(duration = PLAYER_SETTINGS.RAPID_FIRE_DURATION) {
        // Refresh (rather than stack) so it can't run away.
        this.rapidFireUntil = max(this.rapidFireUntil, millis()) + duration;
    }

    update() {
        this.handleInput();
        this.pos.add(p5.Vector.mult(this.vel, dtScale));
        this.vel.mult(pow(this.friction, dtScale));

        // Trail update (roughly once per rendered frame)
        this.trail.push(this.pos.copy());
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }

        // Boundary constraints
        this.pos.x = constrain(this.pos.x, this.radius, max(this.radius, width - this.radius));
        this.pos.y = constrain(this.pos.y, this.radius, max(this.radius, height - this.radius));

        // Invulnerability timer
        if (this.invulnerable && millis() - this.invulnerableTime > this.invulnerableDuration) {
            this.invulnerable = false;
        }

        // Shield timer
        if (this.hasShield && millis() - this.shieldStartTime > this.shieldDuration) {
            this.hasShield = false;
            createExplosion(this.pos.x, this.pos.y, 20, color(180, 180, 255, 150), 1); // Shield break effect
            playSfx('shieldBreak');
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
                attractForce.mult(map(d, 0, this.pickupRadius, 5, 0.5) * dtScale);
                pickup.vel.add(attractForce);
            }
        }
    }

    startInvulnerability(duration = PLAYER_SETTINGS.INVULNERABLE_DURATION) {
        this.invulnerable = true;
        this.invulnerableTime = millis();
        this.invulnerableDuration = duration;
    }

    drawTrail() {
        if (this.trail.length < 2) return;
        const head = this.trail[0];
        const tail = this.trail[this.trail.length - 1];
        // Skip while hovering in place: identical vertices at a large stroke
        // weight would otherwise render as a solid blob.
        if (dist(head.x, head.y, tail.x, tail.y) <= 6) return;

        noFill();
        beginShape();
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = map(i, 0, this.trail.length, 0, 150);
            const weight = map(i, 0, this.trail.length, 1, this.radius * 0.9);
            const flicker = this.invulnerable && frameCount % 10 < 5;

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
    }

    draw() {
        this.drawTrail();

        // Draw player ship
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.getAimAngle() + HALF_PI); // Point towards aim target

        let flicker = this.invulnerable && frameCount % 10 < 5;
        let mainFill = flicker ? color(255, 255, 255, 200) : this.color;
        let glowFill = flicker ? color(255, 255, 255, 50) : color(red(this.color), green(this.color), blue(this.color), 60);

        // Glow effect
        scale(PLAYER_SETTINGS.DRAW_GLOW_SCALE);
        fill(glowFill);
        noStroke();
        triangle(-this.radius * 0.8, this.radius, this.radius * 0.8, this.radius, 0, -this.radius);
        scale(1 / PLAYER_SETTINGS.DRAW_GLOW_SCALE); // Reset scale

        // Main ship body
        fill(mainFill);
        stroke(255);
        strokeWeight(2);
        triangle(-this.radius * 0.8, this.radius, this.radius * 0.8, this.radius, 0, -this.radius);

        // Engine flame, brighter while the rapid-fire buff is active.
        let flame = 6 + (this.rapidFireActive ? 8 : 0) + sin(frameCount * 0.6) * 2;
        fill(this.rapidFireActive ? color(255, 190, 60) : color(120, 200, 255));
        noStroke();
        triangle(-this.radius * 0.35, this.radius, this.radius * 0.35, this.radius, 0, this.radius + flame);
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
            screenShakeMagnitude = max(screenShakeMagnitude, 10);
            createExplosion(this.pos.x, this.pos.y, 30, color(180, 180, 255, 200), 1.5); // Shield hit effect
            playSfx('shieldBreak');
            this.startInvulnerability(500);
            return false; // Shield absorbed the hit, game not over
        }

        if (this.invulnerable) return false;

        playerLives--;
        screenShakeMagnitude = max(screenShakeMagnitude, 18);
        createExplosion(this.pos.x, this.pos.y, 60, this.color, 2); // Player hit effect
        playSfx('playerHit');
        resetMultiplier();

        if (playerLives <= 0) {
            endGame();
            return true; // Game is over
        }

        // Respawn in the middle, clear hostiles nearby, grant invulnerability.
        this.pos.set(width / 2, height / 2);
        this.vel.set(0, 0);
        this.trail = [];
        this.hasShield = false;
        clearHostilesNearPlayer(PLAYER_SETTINGS.RESPAWN_CLEAR_RADIUS);
        this.startInvulnerability(PLAYER_SETTINGS.INVULNERABLE_DURATION);
        return false; // Game not over
    }
}
