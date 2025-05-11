class ChaserEnemy extends Enemy {
    constructor(arg1, arg2) {
        if (typeof arg1 === 'object' && arg1 !== null && arg1.pos) {
            super(arg1); // The Enemy constructor (super) will handle setting creditsValue from arg1.creditsValue
            // this.creditsValue = arg1.creditsValue !== undefined ? arg1.creditsValue : (ENEMY_BASE_CREDITS[this.type] || 0); // This line is redundant
        } else {
            super(arg1, arg2, ENEMY_TYPE.CHASER);
            this.baseColor = color(255, 0, random(80, 180));
            this.scoreValue = floor(map(this.baseHealth, 1, 5, 15, 50) * (1 + this.mergeLevel * 0.2));
            // this.xpValue = floor(map(this.baseHealth, 1, 5, 5, 20) * (1 + this.mergeLevel * 0.2)); // Phased out
            this.creditsValue = ENEMY_BASE_CREDITS[this.type] || 0; // Set from constants
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
            // this.xpValue = floor(map(this.baseHealth, 1, 2, 15, 30) * (1 + this.mergeLevel * 0.2)); // Phased out
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
        let dodgeVector = createVector(0,0);
        let bulletsNearby = false;
        for(let bullet of bullets){
            if (!bullet) continue;
            let d = p5.Vector.dist(this.pos, bullet.pos);
            if(d < this.dodgeRadius + bullet.radius){
                bulletsNearby = true;
                let repel = p5.Vector.sub(this.pos, bullet.pos).normalize();
                repel.mult(map(d, 0, this.dodgeRadius, this.dodgeForce, 0));
                dodgeVector.add(repel);
            }
        }

        if(bulletsNearby){
            dodgeVector.limit(this.maxSpeed * (0.8 + this.mergeLevel * 0.05));
            this.vel.add(dodgeVector);
        } else {
            this.applySteering(player.pos);
        }
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
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
            // this.xpValue = floor(map(this.baseHealth, 4, 10, 10, 25) * (1 + currentMergeLevel * 0.1)); // Phased out
            this.creditsValue = ENEMY_BASE_CREDITS[this.type] || 0;
            this.numSplits = (radiusOverride === null) ? floor(random(2,4)) : 0;
            if (mergeLvl_val !== 0) this.mergeLevel = mergeLvl_val;
            this.baseColor = color(0, 200, 100);
            this.vertices = 5;
            this.pickupDropChance = 0.08;
        }
        this.currentColor = this.baseColor;
    }

    die() {
        createExplosion(this.pos.x, this.pos.y, floor(this.radius * 2), this.baseColor, map(this.radius, 10, 30, 0.7, 1.2));
        score += this.scoreValue * scoreMultiplier;
        playerCredits += floor((this.creditsValue + (this.mergeLevel * ENEMY_MERGE_SETTINGS.MERGE_CREDITS_BONUS_BASE)) * scoreMultiplier);

        updateMultiplier();
        screenShakeMagnitude = max(screenShakeMagnitude, map(this.radius, 10, 40, 4, 9));

        if (random() < this.pickupDropChance) {
            spawnPickup(this.pos.x, this.pos.y, random() < 0.5 ? PICKUP_TYPE.BOMB : PICKUP_TYPE.SHIELD);
        }

        if (this.numSplits > 0 && enemies.length < GAME_SETTINGS.MAX_ENEMIES - this.numSplits) {
            for (let i = 0; i < this.numSplits; i++) {
                let newRadius = this.radius * 0.6;
                let newHealth = floor(this.baseHealth * 0.4);
                if (newRadius < 10) continue;

                let offset = p5.Vector.random2D().mult(this.radius * 0.5);
                let childData = {
                    pos: createVector(this.pos.x + offset.x, this.pos.y + offset.y),
                    radius: newRadius,
                    health: newHealth,
                    baseHealth: newHealth,
                    maxSpeed: PLAYER_SETTINGS.BASE_SPEED * 1.2, // Children are Chasers
                    scoreValue: floor(map(newHealth, 1, 5, 15, 50) * 0.3),
                    // xpValue: floor(map(newHealth, 1, 5, 5, 20) * 0.3), // Phasing out
                    creditsValue: ENEMY_BASE_CREDITS[ENEMY_TYPE.CHASER] || 0, // Children inherit full base chaser credits
                    type: ENEMY_TYPE.CHASER
                };
                enemies.push(new ChaserEnemy(childData));
            }
        }

        let index = enemies.indexOf(this);
        if (index > -1) {
            enemies.splice(index, 1);
        }
        spawnInterval = max(GAME_SETTINGS.MIN_SPAWN_INTERVAL, spawnInterval - GAME_SETTINGS.DIFFICULTY_INCREASE_RATE);
    }
}

class BossMegaChaser extends ChaserEnemy {
    constructor(x,y){
        let bossData = {
            pos: createVector(x,y),
            vel: p5.Vector.random2D().mult(0.5),
            radius: 80,
            maxSpeed: 1.8,
            health: 350 + playerLevel * 50, // playerLevel will be phased out, might need alternative scaling
            baseHealth: 350 + playerLevel * 50,
            scoreValue: 1500 + playerLevel * 100,
            // xpValue: 500 + playerLevel * 50, // Phasing out
            creditsValue: ENEMY_BASE_CREDITS[ENEMY_TYPE.BOSS_MEGA_CHASER] || 100, // From constants
            type: ENEMY_TYPE.BOSS_MEGA_CHASER,
            baseColor: color(180,0,0),
            vertices: 10,
            pickupDropChance: 1.0,
            mergeLevel: ENEMY_MERGE_SETTINGS.MAX_MERGE_LEVEL + 1
        };
        super(bossData);
        this.isBoss = true;
        this.currentColor = this.baseColor;
    }
    // die() method inherited from Enemy, which now includes credit drops.
}