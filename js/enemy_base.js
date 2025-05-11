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
            this.pos = enemyData.pos.copy();
            this.vel = enemyData.vel ? enemyData.vel.copy() : p5.Vector.random2D();
            this.radius = enemyData.radius;
            this.maxSpeed = enemyData.maxSpeed;
            this.health = enemyData.health;
            this.baseHealth = enemyData.baseHealth || this.health;
            this.scoreValue = enemyData.scoreValue || 0;
            // this.xpValue = enemyData.xpValue || 0; // Phased out
            this.creditsValue = (typeof enemyData.creditsValue === 'number') ? enemyData.creditsValue : (ENEMY_BASE_CREDITS[this.type] || 0); // Get base credits
            this.type = enemyData.type;
            this.baseColor = enemyData.baseColor || color(255, 0, 100);
            this.vertices = enemyData.vertices || floor(random(4, 9));
            this.pickupDropChance = enemyData.pickupDropChance !== undefined ? enemyData.pickupDropChance : 0.05;
            this.mergeLevel = enemyData.mergeLevel || 0;
        } else {
            this.pos = createVector(initialX, initialY);
            this.vel = p5.Vector.random2D();
            this.radius = random(12, 28);
            this.maxSpeed = random(1.8, 3.8);
            this.health = floor(map(this.radius, 12, 28, 1, 5));
            this.baseHealth = this.health;
            this.type = initialType;
            this.scoreValue = 0;
            // this.xpValue = 0; // Phased out
            this.creditsValue = (ENEMY_BASE_CREDITS[this.type] || 0); // Get base credits
            this.baseColor = color(255, 0, 100);
            this.vertices = floor(random(4, 9));
            this.pickupDropChance = 0.05;
            this.mergeLevel = 0;
        }
        this.currentColor = this.baseColor;
        this.hitFlashTime = 0;
        this.hitFlashDuration = 80;
        this.isBoss = false;
    }

    update() {
        this.applySteering(player.pos);
        this.pos.add(this.vel);
        this.updateColor();
    }

    applySteering(targetPos) {
        let desired = p5.Vector.sub(targetPos, this.pos);
        desired.setMag(this.maxSpeed);
        let steer = p5.Vector.sub(desired, this.vel);
        steer.limit(0.15);
        this.vel.add(steer);
        this.vel.limit(this.maxSpeed);
    }

    updateColor() {
        if (millis() < this.hitFlashTime + this.hitFlashDuration) {
            let flashAmount = map(millis(), this.hitFlashTime, this.hitFlashTime + this.hitFlashDuration, 1, 0);
            this.currentColor = lerpColor(this.baseColor, color(255), flashAmount * 0.8);
        } else {
            let healthRatio = constrain(this.health / this.baseHealth, 0, 1);
            let darkerBase = color(red(this.baseColor) * 0.5, green(this.baseColor) * 0.5, blue(this.baseColor) * 0.5);
            this.currentColor = lerpColor(darkerBase, this.baseColor, healthRatio);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.hitFlashTime = millis();
        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    die() {
        createExplosion(this.pos.x, this.pos.y, floor(this.radius * 2.5), this.baseColor, map(this.radius, 10, 30, 0.8, 1.8));
        score += this.scoreValue * scoreMultiplier;
        playerCredits += floor((this.creditsValue + (this.mergeLevel * ENEMY_MERGE_SETTINGS.MERGE_CREDITS_BONUS_BASE)) * scoreMultiplier); // Add credits, boosted by multiplier and merge level

        updateMultiplier();
        screenShakeMagnitude = max(screenShakeMagnitude, map(this.radius, 10, ENEMY_MERGE_SETTINGS.MAX_MERGED_RADIUS, 3, 12));

        if (random() < this.pickupDropChance + (this.isBoss ? 0.5 : 0) ) {
            let dropType = PICKUP_TYPE.BOMB;
            if(this.isBoss || random() < 0.2) {
                dropType = PICKUP_TYPE.SHIELD;
            }
            spawnPickup(this.pos.x, this.pos.y, dropType);
        }

        let index = enemies.indexOf(this);
        if (index > -1) {
            enemies.splice(index, 1);
        }

        spawnInterval = max(GAME_SETTINGS.MIN_SPAWN_INTERVAL, spawnInterval - GAME_SETTINGS.DIFFICULTY_INCREASE_RATE);
        if(this.isBoss) {
            bossSpawnedThisGame = false;
        }
    }

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
        let margin = this.radius * marginFactor;
        return (
            this.pos.x < -margin ||
            this.pos.x > width + margin ||
            this.pos.y < -margin ||
            this.pos.y > height + margin
        );
    }
}