class Enemy {
    constructor(arg1, y_or_type, type_if_y) {
        let enemyData = null;
        let initialX, initialY, initialType;

        if (typeof arg1 === 'object' && arg1 !== null && arg1.pos) {
            enemyData = arg1;
            initialType = enemyData.type;
        } else {
            initialX = arg1;
            initialY = y_or_type;
            initialType = type_if_y;
        }

        if (enemyData) {
            this.type = enemyData.type;
            this.pos = enemyData.pos.copy();
            this.vel = enemyData.vel ? enemyData.vel.copy() : p5.Vector.random2D();
            this.radius = enemyData.radius;
            this.maxSpeed = enemyData.maxSpeed;
            this.health = enemyData.health;
            this.baseHealth = enemyData.baseHealth || this.health;
            this.scoreValue = enemyData.scoreValue || 0;
            this.creditsValue = (typeof enemyData.creditsValue === 'number')
                ? enemyData.creditsValue
                : (ENEMY_BASE_CREDITS[this.type] || 0);
            this.baseColor = enemyData.baseColor || color(255, 0, 100);
            this.vertices = enemyData.vertices || floor(random(4, 9));
            this.pickupDropChance = enemyData.pickupDropChance !== undefined ? enemyData.pickupDropChance : 0.05;
            this.mergeLevel = enemyData.mergeLevel || 0;
        } else {
            this.type = initialType;
            this.pos = createVector(initialX, initialY);
            this.vel = p5.Vector.random2D();
            this.radius = random(12, 28);
            this.maxSpeed = random(1.8, 3.8);
            this.health = floor(map(this.radius, 12, 28, 1, 5));
            this.baseHealth = this.health;
            this.scoreValue = 0;
            this.creditsValue = (ENEMY_BASE_CREDITS[this.type] || 0);
            this.baseColor = color(255, 0, 100);
            this.vertices = floor(random(4, 9));
            this.pickupDropChance = 0.05;
            this.mergeLevel = 0;
        }
        this.currentColor = this.baseColor;
        this.hitFlashTime = -Infinity;
        this.hitFlashDuration = ENEMY_HIT_FLASH_DURATION;
        this.isBoss = false;
        this.dead = false;
        this.bobPhase = random(TWO_PI);
    }

    update() {
        if (this.dead || !player) return;
        this.applySteering(player.pos);
        this.pos.add(p5.Vector.mult(this.vel, dtScale));
        this.updateColor();
    }

    applySteering(targetPos) {
        let desired = p5.Vector.sub(targetPos, this.pos);
        desired.setMag(this.maxSpeed);
        let steer = p5.Vector.sub(desired, this.vel);
        steer.limit(0.15 * dtScale);
        this.vel.add(steer);
        this.vel.limit(this.maxSpeed);
    }

    updateColor() {
        if (millis() < this.hitFlashTime + this.hitFlashDuration) {
            let flashAmount = map(millis(), this.hitFlashTime, this.hitFlashTime + this.hitFlashDuration, 1, 0);
            this.currentColor = lerpColor(this.baseColor, color(255), constrain(flashAmount, 0, 1) * 0.8);
        } else {
            let healthRatio = constrain(this.health / max(1, this.baseHealth), 0, 1);
            let darkerBase = color(red(this.baseColor) * 0.5, green(this.baseColor) * 0.5, blue(this.baseColor) * 0.5);
            this.currentColor = lerpColor(darkerBase, this.baseColor, healthRatio);
        }
    }

    takeDamage(amount) {
        if (this.dead) return false;
        this.health -= amount;
        this.hitFlashTime = millis();
        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    die() {
        if (this.dead) return; // Guard against double-kills in the same frame
        this.dead = true;

        createExplosion(this.pos.x, this.pos.y, floor(this.radius * 2.5), this.baseColor, map(this.radius, 10, 30, 0.8, 1.8));
        score += this.scoreValue * scoreMultiplier;
        let credits = floor((this.creditsValue + (this.mergeLevel * ENEMY_MERGE_SETTINGS.MERGE_CREDITS_BONUS_BASE)) * scoreMultiplier);
        playerCredits += credits;
        runCreditsEarned += max(0, credits);
        runKills++;

        updateMultiplier();
        screenShakeMagnitude = max(screenShakeMagnitude, map(this.radius, 10, ENEMY_MERGE_SETTINGS.MAX_MERGED_RADIUS, 3, 12));
        playSfx('explode');

        if (random() < this.pickupDropChance + (this.isBoss ? 0.5 : 0)) {
            let dropType = PICKUP_TYPE.BOMB;
            let roll = random();
            if (this.isBoss) {
                dropType = PICKUP_TYPE.SHIELD;
            } else if (roll < 0.2) {
                dropType = PICKUP_TYPE.SHIELD;
            } else if (roll < 0.34) {
                dropType = PICKUP_TYPE.RAPID;
            }
            spawnPickup(this.pos.x, this.pos.y, dropType);
        }

        this.onDeath();

        let index = enemies.indexOf(this);
        if (index > -1) {
            enemies.splice(index, 1);
        }

        spawnInterval = max(GAME_SETTINGS.MIN_SPAWN_INTERVAL, spawnInterval - GAME_SETTINGS.DIFFICULTY_INCREASE_RATE);
    }

    // Hook for subclasses (splitters spawn children, bosses update progression)
    onDeath() {}

    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading() + PI / 2 + this.mergeLevel * 0.1);

        let glowColor = color(red(this.currentColor), green(this.currentColor), blue(this.currentColor), 70 + this.mergeLevel * 10);
        let mainStroke = color(255, 255, 255, 200 - this.mergeLevel * 15);
        let strokeWeightMod = 1.5 + this.mergeLevel * 0.3;

        scale(1.25 + this.mergeLevel * 0.05);
        fill(glowColor);
        noStroke();
        this.drawShape();
        scale(1 / (1.25 + this.mergeLevel * 0.05));

        fill(this.currentColor);
        stroke(mainStroke);
        strokeWeight(strokeWeightMod);
        this.drawShape();
        pop();

        // Merged enemies get a visible level marker.
        if (this.mergeLevel > 0) {
            push();
            noStroke();
            fill(255, 255, 255, 170);
            for (let i = 0; i < this.mergeLevel; i++) {
                ellipse(this.pos.x - (this.mergeLevel - 1) * 4 + i * 8, this.pos.y - this.radius - 10, 4);
            }
            pop();
        }
    }

    drawShape() {
        beginShape();
        let angleStep = TWO_PI / this.vertices;
        for (let a = 0; a < TWO_PI; a += angleStep) {
            vertex(cos(a) * this.radius, sin(a) * this.radius);
        }
        endShape(CLOSE);
    }

    isOffscreen(marginFactor = 3) {
        if (this.isBoss) return false; // Bosses always come back
        let margin = this.radius * marginFactor;
        return (
            this.pos.x < -margin ||
            this.pos.x > width + margin ||
            this.pos.y < -margin ||
            this.pos.y > height + margin
        );
    }
}
