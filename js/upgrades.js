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

// function getAvailableUpgradeOptions() { // Phased out
//     let options = [];
//     // Filter for upgrades that are not maxed out
//     let keys = Object.keys(availableUpgrades).filter(key => availableUpgrades[key].level < availableUpgrades[key].maxLevel);
//
//     if (keys.length === 0) return []; // No upgrades available
//
//     shuffle(keys, true); // p5.js shuffle function, shuffles in place
//
//     // Select up to 3 upgrades
//     for (let i = 0; i < min(3, keys.length); i++) {
//         options.push(availableUpgrades[keys[i]]);
//     }
//     return options;
// }

// function presentUpgradeChoices() { // Phased out
//     currentGameState = GAME_STATE.UPGRADE_SCREEN;
//     upgradeChoices = getAvailableUpgradeOptions(); // upgradeChoices is a global array
//     if (upgradeChoices.length === 0) { // If no upgrades left, go back to playing
//         currentGameState = GAME_STATE.PLAYING;
//     }
// }

// function selectUpgrade(index) { // Phased out
//     if (currentGameState !== GAME_STATE.UPGRADE_SCREEN || index < 0 || index >= upgradeChoices.length) return;
//
//     let chosenUpgradeName = upgradeChoices[index].name;
//     // Find the actual upgrade key in availableUpgrades (since upgradeChoices stores copies/references)
//     let actualUpgradeKey = Object.keys(availableUpgrades).find(k => availableUpgrades[k].name === chosenUpgradeName);
//
//     if (actualUpgradeKey && availableUpgrades[actualUpgradeKey].level < availableUpgrades[actualUpgradeKey].maxLevel) {
//         availableUpgrades[actualUpgradeKey].level++;
//         if (player) { // Ensure player exists
//             player.applyUpgrades();
//         }
//     }
//     currentGameState = GAME_STATE.PLAYING;
//     upgradeChoices = []; // Clear choices
// }

// function drawUpgradeScreen() { // Phased out
//     if (currentGameState !== GAME_STATE.UPGRADE_SCREEN || !upgradeChoices || upgradeChoices.length === 0) return;
//
//     push();
//     // Semi-transparent background overlay
//     fill(0, 0, 10, 200);
//     rect(0, 0, width, height);
//
//     fill(255);
//     textSize(48);
//     textAlign(CENTER, CENTER);
//     text("LEVEL UP!", width / 2, height * 0.15);
//
//     textSize(24);
//     text("Choose an Upgrade:", width / 2, height * 0.25);
//
//     let boxWidth = width * 0.25;
//     let boxHeight = height * 0.45;
//     let numChoices = upgradeChoices.length;
//     let totalChoicesWidth = numChoices * boxWidth + (numChoices - 1) * 40; // 40px spacing
//     let startX = width / 2 - totalChoicesWidth / 2;
//     let startY = height * 0.35;
//
//     for (let i = 0; i < upgradeChoices.length; i++) {
//         let upgrade = upgradeChoices[i];
//         let boxX = startX + i * (boxWidth + 40);
//         let hover = mouseX > boxX && mouseX < boxX + boxWidth && mouseY > startY && mouseY < startY + boxHeight;
//
//         strokeWeight(3);
//         stroke(hover ? color(255, 255, 0) : 200); // Yellow highlight on hover
//         fill(20, 30, 50, 230); // Dark blue box
//         rect(boxX, startY, boxWidth, boxHeight, 10); // Rounded corners
//
//         noStroke();
//         fill(255); // White text
//         textAlign(CENTER, TOP);
//         textSize(22);
//         text(upgrade.name, boxX + boxWidth / 2, startY + 20);
//
//         textSize(16);
//         fill(200); // Lighter text for level info
//         let nextLevelDisplay = upgrade.level + 1;
//         if (upgrade.level >= upgrade.maxLevel -1) { // Check if this is the last possible upgrade for this type
//              text(`Level ${upgrade.level} -> ${nextLevelDisplay} (MAX)`, boxX + boxWidth / 2, startY + 55);
//         } else {
//              text(`Level ${upgrade.level} -> ${nextLevelDisplay}`, boxX + boxWidth / 2, startY + 55);
//         }
//
//
//         textAlign(LEFT, TOP);
//         fill(220); // Text for description
//         textSize(14);
//         text(upgrade.description, boxX + 15, startY + 90, boxWidth - 30); // Constrain text width
//
//         fill(180, 255, 180); // Greenish for effect change text
//         textSize(13);
//         let effectText = upgrade.getEffectChangeText ? upgrade.getEffectChangeText() : "Effect N/A";
//         text(effectText, boxX + 15, startY + boxHeight - 60, boxWidth - 30);
//
//         if (upgrade.level >= upgrade.maxLevel -1 ) { // If it's the final upgrade
//             fill(255, 100, 100); // Reddish text for "FINAL UPGRADE"
//             textAlign(CENTER, TOP);
//             textSize(16);
//             text("FINAL UPGRADE!", boxX + boxWidth / 2, startY + boxHeight - 25);
//         }
//     }
//     pop();
// }

function purchaseUpgrade(upgradeKey) {
    if (!availableUpgrades[upgradeKey]) {
        console.error("Attempted to purchase unknown upgrade:", upgradeKey);
        return;
    }

    let upgrade = availableUpgrades[upgradeKey];
    if (upgrade.level >= upgrade.maxLevel) {
        console.log("Upgrade already maxed out:", upgrade.name);
        // Potentially provide UI feedback here
        return;
    }

    let cost = upgrade.getCost();
    if (playerCredits >= cost) {
        playerCredits -= cost;
        upgrade.level++;
        console.log("Purchased upgrade:", upgrade.name, "New level:", upgrade.level);
        // If a game is in progress, player.applyUpgrades() would be called.
        // For store purchases, this effect applies to the next game or is immediately persistent.
        // The current setup saves upgrade levels, so player.applyUpgrades() in initGame will handle it.
        saveGameData(); // Save credits and new upgrade level
        setupStoreScreen(); // Re-setup store to reflect new state (e.g., button might disappear or cost change)
    } else {
        console.log("Not enough credits to purchase:", upgrade.name);
        // Potentially provide UI feedback
    }
}

function purchaseLife() {
    // const lifeCost = 500; // Now using PLAYER_SETTINGS.LIFE_COST
    if (playerLives >= PLAYER_SETTINGS.MAX_LIVES) {
        console.log("Already at max lives.");
        // UI feedback
        return;
    }
    if (playerCredits >= PLAYER_SETTINGS.LIFE_COST) {
        playerCredits -= PLAYER_SETTINGS.LIFE_COST;
        playerLives++; // This affects the next game via initGame or if we make lives persistent across sessions
        console.log("Purchased life. Current lives for next game:", playerLives);
        saveGameData(); // Save credits and potentially new playerLives if it becomes persistent
        setupStoreScreen(); // Re-setup store to reflect new state
    } else {
        console.log("Not enough credits to purchase life.");
        // UI feedback
    }
}