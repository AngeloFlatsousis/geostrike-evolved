class ChaserEnemy extends Enemy {
    constructor(arg1, arg2) {
        if (typeof arg1 === 'object' && arg1 !== null && arg1.pos) {
            super(arg1); // Data objects carry their own stats
        } else {
            super(arg1, arg2, ENEMY_TYPE.CHASER);
            this.baseColor = color(255, 0, random(80, 180));
            this.scoreValue = floor(map(this.baseHealth, 1, 5, 15, 50) * (1 + this.mergeLevel * 0.2));
            this.creditsValue = ENEMY_BASE_CREDITS[this.type] || 0;
            this.vel.mult(random(1, 2.5));
        }
        this.currentColor = this.baseColor;
    }
}

class DodgerEnemy extends Enemy {
    constructor(arg1, arg2) {
        if (typeof arg1 === 'object' && arg1 !== null && arg1.pos) {
            super(arg1);
            this.vertices = 3;
            this.dodgeForce = arg1.dodgeForce || 5;
            this.dodgeRadius = arg1.dodgeRadius || 100;
            this.creditsValue = arg1.creditsValue !== undefined ? arg1.creditsValue : (ENEMY_BASE_CREDITS[this.type] || 0);
        } else {
            super(arg1, arg2, ENEMY_TYPE.DODGER);
            this.baseColor = color(150, 0, 255);
            this.radius = random(10, 20);
            this.health = floor(map(this.radius, 10, 20, 1, 2));
            this.baseHealth = this.health;
            this.scoreValue = floor(map(this.baseHealth, 1, 2, 40, 80) * (1 + this.mergeLevel * 0.2));
            this.creditsValue = ENEMY_BASE_CREDITS[this.type] || 0;
            this.maxSpeed = random(2.5, 4.5);
            this.dodgeForce = 5;
            this.dodgeRadius = 100;
            this.vertices = 3;
            this.vel.mult(random(1.5, 3));
        }
        this.currentColor = this.baseColor;
    }

    update() {
        if (this.dead || !player) return;
        let dodgeVector = createVector(0, 0);
        let bulletsNearby = false;
        for (let bullet of bullets) {
            if (!bullet) continue;
            let d = p5.Vector.dist(this.pos, bullet.pos);
            if (d < this.dodgeRadius + bullet.radius && d > 0.001) {
                bulletsNearby = true;
                let repel = p5.Vector.sub(this.pos, bullet.pos).normalize();
                repel.mult(map(d, 0, this.dodgeRadius, this.dodgeForce, 0));
                dodgeVector.add(repel);
            }
        }

        if (bulletsNearby) {
            dodgeVector.limit(this.maxSpeed * (0.8 + this.mergeLevel * 0.05));
            this.vel.add(p5.Vector.mult(dodgeVector, dtScale));
        } else {
            this.applySteering(player.pos);
        }
        this.vel.limit(this.maxSpeed);
        this.pos.add(p5.Vector.mult(this.vel, dtScale));
        this.updateColor();
    }

    drawShape() {
        triangle(-this.radius * 0.9, this.radius * 0.7,
                  this.radius * 0.9, this.radius * 0.7,
                  0, -this.radius);
    }
}

class SplitterEnemy extends Enemy {
    constructor(arg1, y_val, radiusOverride = null, healthOverride = null, mergeLvl_val = 0) {
        let isDataObject = typeof arg1 === 'object' && arg1 !== null && arg1.pos;
        if (isDataObject) {
            super(arg1);
            this.numSplits = arg1.numSplits !== undefined ? arg1.numSplits : 0;
            this.baseColor = arg1.baseColor || color(0, 200, 100);
            this.vertices = arg1.vertices || 5;
            this.pickupDropChance = arg1.pickupDropChance !== undefined ? arg1.pickupDropChance : 0.08;
            this.creditsValue = arg1.creditsValue !== undefined ? arg1.creditsValue : (ENEMY_BASE_CREDITS[this.type] || 0);
        } else {
            super(arg1, y_val, ENEMY_TYPE.SPLITTER);
            this.radius = radiusOverride !== null ? radiusOverride : random(25, 40);
            this.health = healthOverride !== null ? healthOverride : floor(map(this.radius, 25, 40, 4, 10));
            this.baseHealth = this.health;
            this.maxSpeed = random(1.2, 2.5);
            const currentMergeLevel = mergeLvl_val || this.mergeLevel;
            this.scoreValue = floor(map(this.baseHealth, 4, 10, 30, 70) * (1 + currentMergeLevel * 0.1));
            this.creditsValue = ENEMY_BASE_CREDITS[this.type] || 0;
            this.numSplits = (radiusOverride === null) ? floor(random(2, 4)) : 0;
            if (mergeLvl_val !== 0) this.mergeLevel = mergeLvl_val;
            this.baseColor = color(0, 200, 100);
            this.vertices = 5;
            this.pickupDropChance = 0.08;
        }
        this.currentColor = this.baseColor;
    }

    onDeath() {
        if (this.numSplits <= 0) return;
        if (enemies.length >= GAME_SETTINGS.MAX_ENEMIES - this.numSplits) return;

        for (let i = 0; i < this.numSplits; i++) {
            let newRadius = this.radius * 0.6;
            let newHealth = max(1, floor(this.baseHealth * 0.4));
            if (newRadius < 10) continue;

            let offset = p5.Vector.random2D().mult(this.radius * 0.5);
            let childData = {
                pos: createVector(this.pos.x + offset.x, this.pos.y + offset.y),
                radius: newRadius,
                health: newHealth,
                baseHealth: newHealth,
                maxSpeed: PLAYER_SETTINGS.BASE_SPEED * 1.2, // Children are Chasers
                scoreValue: floor(map(newHealth, 1, 5, 15, 50) * 0.3),
                creditsValue: ENEMY_BASE_CREDITS[ENEMY_TYPE.CHASER] || 0,
                type: ENEMY_TYPE.CHASER,
                vel: p5.Vector.random2D().mult(random(1, 2.5)),
            };
            enemies.push(new ChaserEnemy(childData));
        }
    }
}

class BossMegaChaser extends ChaserEnemy {
    constructor(x, y) {
        const tier = bossTier;
        const health = BOSS_SETTINGS.BASE_HEALTH + tier * BOSS_SETTINGS.HEALTH_PER_TIER;
        let bossData = {
            pos: createVector(x, y),
            vel: p5.Vector.random2D().mult(0.5),
            radius: min(BOSS_SETTINGS.MAX_RADIUS, BOSS_SETTINGS.BASE_RADIUS + tier * BOSS_SETTINGS.RADIUS_PER_TIER),
            maxSpeed: min(BOSS_SETTINGS.MAX_SPEED, BOSS_SETTINGS.BASE_SPEED + tier * BOSS_SETTINGS.SPEED_PER_TIER),
            health: health,
            baseHealth: health,
            scoreValue: 1500 + tier * 750,
            creditsValue: (ENEMY_BASE_CREDITS[ENEMY_TYPE.BOSS_MEGA_CHASER] || 100) + tier * 50,
            type: ENEMY_TYPE.BOSS_MEGA_CHASER,
            baseColor: color(180, 0, 0),
            vertices: 10,
            pickupDropChance: 1.0,
            mergeLevel: 0,
        };
        super(bossData);
        this.isBoss = true;
        this.tier = tier;
        this.currentColor = this.baseColor;
        this.enraged = false;
        this.nextBurstTime = millis() + 2200;
        this.nextSummonTime = millis() + 5000;
        this.burstCount = BOSS_SETTINGS.BURST_COUNT;
    }

    update() {
        if (this.dead || !player) return;

        // Enrage below the health threshold: faster and more aggressive.
        if (!this.enraged && this.health / max(1, this.baseHealth) <= BOSS_SETTINGS.ENRAGE_THRESHOLD) {
            this.enraged = true;
            this.maxSpeed = min(BOSS_SETTINGS.MAX_SPEED + 0.6, this.maxSpeed * 1.35);
            this.baseColor = color(255, 40, 40);
            screenShakeMagnitude = max(screenShakeMagnitude, 12);
            playSfx('bossEnrage');
        }

        if (millis() >= this.nextBurstTime) {
            this.fireBurst();
            const cooldown = max(
                BOSS_SETTINGS.BURST_COOLDOWN_MIN,
                BOSS_SETTINGS.BURST_COOLDOWN - this.tier * 120 - (this.enraged ? 700 : 0)
            );
            this.nextBurstTime = millis() + cooldown;
        }

        if (millis() >= this.nextSummonTime) {
            this.summonMinions();
            this.nextSummonTime = millis() + max(
                BOSS_SETTINGS.SUMMON_COOLDOWN_MIN,
                BOSS_SETTINGS.SUMMON_COOLDOWN - this.tier * 300
            );
        }

        super.update();
    }

    fireBurst() {
        const count = this.burstCount + this.tier + (this.enraged ? 6 : 0);
        const speed = ENEMY_BULLET_SETTINGS.SPEED + this.tier * BOSS_SETTINGS.ENEMY_BULLET_SPEED_PER_TIER;
        const offset = random(TWO_PI);
        // Aim the cone roughly at the player so it must be dodged.
        const toPlayer = player ? atan2(player.pos.y - this.pos.y, player.pos.x - this.pos.x) : 0;
        for (let i = 0; i < count; i++) {
            const angle = offset + (TWO_PI / count) * i + toPlayer * 0.15;
            enemyBullets.push(new EnemyBullet(this.pos.x, this.pos.y, angle, speed, this.baseColor));
        }
        screenShakeMagnitude = max(screenShakeMagnitude, 5);
        playSfx('enemyShoot');
    }

    summonMinions() {
        if (enemies.length >= GAME_SETTINGS.MAX_ENEMIES - 3) return;
        const count = 2 + floor(random(0, 2)) + min(2, this.tier);
        for (let i = 0; i < count; i++) {
            const angle = random(TWO_PI);
            const spawnRadius = this.radius * 1.25;
            const x = constrain(this.pos.x + cos(angle) * spawnRadius, 20, width - 20);
            const y = constrain(this.pos.y + sin(angle) * spawnRadius, 20, height - 20);
            const type = random() < 0.65 ? ENEMY_TYPE.CHASER : ENEMY_TYPE.DODGER;
            spawnMinion(x, y, type);
        }
        createExplosion(this.pos.x, this.pos.y, 20, color(180, 0, 0), 1.4);
    }

    onDeath() {
        bossSpawnedThisGame = false;
        bossesKilled++;
        bossTier++;
        const gap = GAME_SETTINGS.BOSS_SCORE_REWARD_GAP * (1 + bossTier * GAME_SETTINGS.BOSS_TIER_SCORE_GROWTH);
        nextBossScore = max(nextBossScore + gap, score + gap);
        screenShakeMagnitude = 45;
        enemyBullets = [];
        createExplosion(this.pos.x, this.pos.y, 140, color(255, 90, 60), 2.6);
        createExplosion(this.pos.x, this.pos.y, 60, color(255, 220, 120), 1.8);
        playSfx('bossDown');
        // Generous rewards for the trouble.
        spawnPickup(this.pos.x - 40, this.pos.y, PICKUP_TYPE.BOMB);
        spawnPickup(this.pos.x + 40, this.pos.y, PICKUP_TYPE.RAPID);
    }
}
