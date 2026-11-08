function defineUpgrades() {
    // availableUpgrades is a global object, populated here
    availableUpgrades = {
        fireRate: {
            name: "Fire Rate", level: 0, maxLevel: 10, baseCost: 200, // Increased baseCost
            description: "Increases bullet firing speed.",
            effect: function() { return 1 + this.level * 0.12; },
            getCost: function() { return this.baseCost + this.level * 100; }, // Increased per-level cost
            getEffectChangeText: function() {
                let bsc = player ? player.baseShootCooldown : PLAYER_SETTINGS.BASE_SHOOT_COOLDOWN;
                return `Cooldown: ${(bsc / this.effect()).toFixed(0)}ms -> ${(bsc / (1 + (this.level + 1) * 0.12)).toFixed(0)}ms`;
            }
        },
        bulletDamage: {
            name: "Bullet Damage", level: 0, maxLevel: 8, baseCost: 300, // Increased baseCost
            description: "Increases damage per bullet.",
            effect: function() { return 1 + this.level * 0.25; },
            getCost: function() { return this.baseCost + this.level * 150; }, // Increased per-level cost
            getEffectChangeText: function() {
                let bbd = player ? player.baseBulletDamage : PLAYER_SETTINGS.BASE_BULLET_DAMAGE;
                return `Damage: ${(bbd * this.effect()).toFixed(1)} -> ${(bbd * (1 + (this.level + 1) * 0.25)).toFixed(1)}`;
            }
        },
        bulletSpeed:  {
            name: "Bullet Speed", level: 0, maxLevel: 6, baseCost: 150, // Increased baseCost
            description: "Increases bullet travel speed.",
            effect: function() { return 1 + this.level * 0.15; },
            getCost: function() { return this.baseCost + this.level * 75; }, // Increased per-level cost
            getEffectChangeText: function() {
                let bbs = player ? player.baseBulletSpeed : PLAYER_SETTINGS.BASE_BULLET_SPEED;
                return `Speed: ${(bbs * this.effect()).toFixed(1)} -> ${(bbs * (1 + (this.level + 1) * 0.15)).toFixed(1)}`;
            }
        },
        playerSpeed:  {
            name: "Player Speed", level: 0, maxLevel: 5, baseCost: 250, // Increased baseCost
            description: "Increases ship movement speed.",
            effect: function() { return 1 + this.level * 0.10; },
            getCost: function() { return this.baseCost + this.level * 120; }, // Increased per-level cost
            getEffectChangeText: function() {
                let ps = player ? player.baseSpeed : PLAYER_SETTINGS.BASE_SPEED;
                return `Speed: ${(ps * this.effect()).toFixed(1)} -> ${(ps * (1 + (this.level + 1) * 0.10)).toFixed(1)}`;
            }
        },
        pickupMagnet: {
            name: "Pickup Magnet", level: 0, maxLevel: 5, baseCost: 150, // Increased baseCost
            description: "Increases radius to attract pickups.",
            effect: function() { return 1 + this.level * 0.40; },
            getCost: function() { return this.baseCost + this.level * 70; }, // Increased per-level cost
            getEffectChangeText: function() {
                let bpr = player ? player.basePickupRadius : PLAYER_SETTINGS.BASE_PICKUP_RADIUS;
                return `Radius: ${(bpr * this.effect()).toFixed(0)} -> ${(bpr * (1 + (this.level + 1) * 0.40)).toFixed(0)}`;
            }
        },
        bombCapacity: {
            name: "Bomb Capacity", level: 0, maxLevel: 4, baseCost: 400, // Increased baseCost
            description: "Increases maximum bomb storage.",
            effect: function() { return PLAYER_SETTINGS.INITIAL_BOMBS + this.level; },
            getCost: function() { return this.baseCost + this.level * 200; }, // Increased per-level cost
            getEffectChangeText: function() {
                return `Max: ${floor(this.effect())} -> ${floor(PLAYER_SETTINGS.INITIAL_BOMBS + (this.level + 1))}`;
            }
        },
        bombRadius:   {
            name: "Bomb Radius", level: 0, maxLevel: 5, baseCost: 200, // Increased baseCost
            description: "Increases bomb explosion radius.",
            effect: function() { return 1 + this.level * 0.20; },
            getCost: function() { return this.baseCost + this.level * 100; }, // Increased per-level cost
            getEffectChangeText: function() {
                let bbr = player ? player.baseBombRadius : PLAYER_SETTINGS.BASE_BOMB_RADIUS;
                return `Radius: ${(bbr * this.effect()).toFixed(0)} -> ${(bbr * (1 + (this.level + 1) * 0.20)).toFixed(0)}`;
            }
        },
        shieldDuration: {
            name: "Shield Duration", level: 0, maxLevel: 5, baseCost: 250, // Increased baseCost
            description: "Increases active shield duration.",
            effect: function() { return 1 + this.level * 0.25; },
            getCost: function() { return this.baseCost + this.level * 120; }, // Increased per-level cost
            getEffectChangeText: function() {
                return `Duration: ${(PLAYER_SETTINGS.SHIELD_BASE_DURATION * this.effect() / 1000).toFixed(1)}s -> ${(PLAYER_SETTINGS.SHIELD_BASE_DURATION * (1 + (this.level+1)*0.25)/1000).toFixed(1)}s`;
            }
        },
        piercingShots:{
            name: "Piercing Shots", level: 0, maxLevel: 3, baseCost: 500, // Increased baseCost
            description: "Bullets pierce enemies.",
            effect: function() { return this.level; },
            getCost: function() { return this.baseCost + this.level * 250; }, // Increased per-level cost
            getEffectChangeText: function() {
                return `Pierces: ${this.level} -> ${this.level + 1}`;
            }
        },
    };
}

function purchaseUpgrade(upgradeKey) {
    if (!availableUpgrades[upgradeKey]) {
        console.error("Attempted to purchase unknown upgrade:", upgradeKey);
        return false;
    }

    let upgrade = availableUpgrades[upgradeKey];
    if (upgrade.level >= upgrade.maxLevel) {
        if (typeof showStoreToast === 'function') showStoreToast(upgrade.name + ' is already maxed out', color(255, 200, 120));
        playSfx('denied');
        return false;
    }

    let cost = upgrade.getCost();
    if (playerCredits >= cost) {
        playerCredits -= cost;
        upgrade.level++;
        saveGameData();
        playSfx('purchase');
        if (typeof showStoreToast === 'function') {
            showStoreToast(upgrade.name + ' upgraded to level ' + upgrade.level, color(140, 255, 160));
        }
        // Re-setup the store to refresh button states, keeping the scroll position.
        setupStoreScreen(true);
        if (player) player.applyUpgrades();
        return true;
    }

    playSfx('denied');
    if (typeof showStoreToast === 'function') {
        showStoreToast('Not enough credits (' + (cost - floor(playerCredits)) + ' short)', color(255, 120, 120));
    }
    return false;
}

function purchaseLife() {
    const maxBonusLives = PLAYER_SETTINGS.MAX_LIVES - PLAYER_SETTINGS.STARTING_LIVES;
    if (bonusLives >= maxBonusLives) {
        playSfx('denied');
        if (typeof showStoreToast === 'function') showStoreToast('Already at maximum lives', color(255, 200, 120));
        return false;
    }
    if (playerCredits < PLAYER_SETTINGS.LIFE_COST) {
        playSfx('denied');
        if (typeof showStoreToast === 'function') {
            showStoreToast('Not enough credits (' + (PLAYER_SETTINGS.LIFE_COST - floor(playerCredits)) + ' short)', color(255, 120, 120));
        }
        return false;
    }

    playerCredits -= PLAYER_SETTINGS.LIFE_COST;
    bonusLives++;
    saveGameData();
    playSfx('purchase');
    if (typeof showStoreToast === 'function') {
        showStoreToast('Extra life bought — you start runs with ' + (PLAYER_SETTINGS.STARTING_LIVES + bonusLives), color(140, 255, 160));
    }
    setupStoreScreen(true);
    return true;
}
