function createExplosion(x, y, count, pColor, sizeMultiplier = 1) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, pColor, sizeMultiplier));
    }
}

function spawnEnemy() {
    if (enemies.length >= GAME_SETTINGS.MAX_ENEMIES + (bossSpawnedThisGame ? 1 : 0)) return;

    let edge = floor(random(4));
    let x, y;
    let padding = 50;

    switch (edge) {
        case 0: x = random(width); y = -padding; break;
        case 1: x = width + padding; y = random(height); break;
        case 2: x = random(width); y = height + padding; break;
        case 3: x = -padding; y = random(height); break;
    }

    let enemyTypeRoll = random();
    if (enemyTypeRoll < 0.55) {
        enemies.push(new ChaserEnemy(x, y));
    } else if (enemyTypeRoll < 0.85) {
        enemies.push(new DodgerEnemy(x, y));
    } else {
        enemies.push(new SplitterEnemy(x, y));
    }
}

function spawnAsteroid() {
    if (asteroids.length >= ASTEROID_SETTINGS.MAX_COUNT) return;

    let edge = floor(random(4));
    let x,y;
    let padding = ASTEROID_SETTINGS.MAX_RADIUS;

    switch(edge){
        case 0: x = random(width); y = -padding; break;
        case 1: x = width + padding; y = random(height); break;
        case 2: x = random(width); y = height + padding; break;
        case 3: x = -padding; y = random(height); break;
    }
    asteroids.push(new Asteroid(x,y));
    lastAsteroidSpawnTime = millis();
}

function spawnBoss() {
    if (bossSpawnedThisGame || enemies.find(e => e.isBoss)) return;
    enemies.push(new BossMegaChaser(width/2, -100));
    bossSpawnedThisGame = true;
    playMusic(bossMusic);
}

function spawnPickup(x, y, type) {
    pickups.push(new Pickup(x, y, type));
}

function handleEnemyMerging() {
    let newMergedEnemies = [];
    let indicesToRemove = new Set();

    for (let i = 0; i < enemies.length; i++) {
        if (indicesToRemove.has(i) || (enemies[i] && enemies[i].isBoss)) continue;

        for (let j = i + 1; j < enemies.length; j++) {
            if (indicesToRemove.has(j) || (enemies[j] && enemies[j].isBoss)) continue;

            let e1 = enemies[i];
            let e2 = enemies[j];

            if (!e1 || !e2) continue;

            if (e1.type === e2.type &&
                e1.constructor === e2.constructor &&
                e1.mergeLevel < ENEMY_MERGE_SETTINGS.MAX_MERGE_LEVEL &&
                e2.mergeLevel < ENEMY_MERGE_SETTINGS.MAX_MERGE_LEVEL) {

                let d = dist(e1.pos.x, e1.pos.y, e2.pos.x, e2.pos.y);
                if (d < e1.radius + e2.radius - 5) {
                    let merged = createMergedEnemy(e1, e2);
                    if (merged) {
                        newMergedEnemies.push(merged);
                        indicesToRemove.add(i);
                        indicesToRemove.add(j);
                        createExplosion(
                            (e1.pos.x + e2.pos.x) / 2, (e1.pos.y + e2.pos.y) / 2,
                            30 + (e1.mergeLevel + e2.mergeLevel) * 10,
                            ENEMY_MERGE_SETTINGS.MERGE_EFFECT_COLOR,
                            1.2 + (e1.mergeLevel + e2.mergeLevel) * 0.2
                        );
                        break;
                    }
                }
            }
        }
    }

    if (indicesToRemove.size > 0) {
        let sortedIndices = Array.from(indicesToRemove).sort((a, b) => b - a);
        for (let index of sortedIndices) {
            enemies.splice(index, 1);
        }
        enemies.push(...newMergedEnemies);
    }
}

function createMergedEnemy(e1, e2) {
    let newMergeLevel = max(e1.mergeLevel, e2.mergeLevel) + 1;

    let mergedData = {
        pos: p5.Vector.lerp(e1.pos, e2.pos, 0.5),
        vel: p5.Vector.lerp(e1.vel, e2.vel, 0.5),
        radius: min(ENEMY_MERGE_SETTINGS.MAX_MERGED_RADIUS, sqrt(e1.radius * e1.radius + e2.radius * e2.radius) * 1.15),
        maxSpeed: max(1.0, ((e1.maxSpeed + e2.maxSpeed) / 2) * ENEMY_MERGE_SETTINGS.MERGE_SPEED_MULTIPLIER),
        health: floor((e1.health + e2.health) * ENEMY_MERGE_SETTINGS.MERGE_HEALTH_BONUS_FACTOR + newMergeLevel * 5),
        baseHealth: floor((e1.baseHealth + e2.baseHealth) * ENEMY_MERGE_SETTINGS.MERGE_BASE_HEALTH_BONUS_FACTOR + newMergeLevel * 5),
        scoreValue: e1.scoreValue + e2.scoreValue + ENEMY_MERGE_SETTINGS.MERGE_SCORE_BONUS_BASE * newMergeLevel,
        // xpValue: e1.xpValue + e2.xpValue + ENEMY_MERGE_SETTINGS.MERGE_XP_BONUS_BASE * newMergeLevel, // Phased out
        creditsValue: (e1.creditsValue || 0) + (e2.creditsValue || 0) + ENEMY_MERGE_SETTINGS.MERGE_CREDITS_BONUS_BASE * newMergeLevel,
        type: e1.type,
        mergeLevel: newMergeLevel,
        pickupDropChance: min(0.8, e1.pickupDropChance + e2.pickupDropChance + ENEMY_MERGE_SETTINGS.PICKUP_DROP_CHANCE_BONUS * newMergeLevel),
        baseColor: lerpColor(e1.baseColor, e2.baseColor, 0.5)
    };

    let darknessFactor = 1.0 - (mergedData.mergeLevel * 0.12);
    mergedData.baseColor = color(
        red(mergedData.baseColor) * darknessFactor,
        green(mergedData.baseColor) * darknessFactor,
        blue(mergedData.baseColor) * darknessFactor
    );
    mergedData.vel.limit(mergedData.maxSpeed);

    if (e1.type === ENEMY_TYPE.CHASER) {
        mergedData.vertices = min(ENEMY_MERGE_SETTINGS.MAX_CHASER_VERTICES, max(e1.vertices, e2.vertices) + ENEMY_MERGE_SETTINGS.CHASER_MERGE_VERTEX_INCREMENT);
        return new ChaserEnemy(mergedData);
    } else if (e1.type === ENEMY_TYPE.DODGER) {
        mergedData.vertices = 3;
        mergedData.dodgeForce = (e1.dodgeForce + e2.dodgeForce) / 2 + 0.5 * newMergeLevel;
        mergedData.dodgeRadius = (e1.dodgeRadius + e2.dodgeRadius) / 2 + 10 * newMergeLevel;
        return new DodgerEnemy(mergedData);
    } else if (e1.type === ENEMY_TYPE.SPLITTER) {
        mergedData.vertices = 5;
        mergedData.numSplits = 0;
        return new SplitterEnemy(mergedData);
    }
    return null;
}


function drawGrid() {
    stroke(255, 255, 255, 10 + backgroundPulseAlpha);
    strokeWeight(1);
    for (let x = 0; x < width; x += GAME_SETTINGS.GRID_SIZE) {
        line(x, 0, x, height);
    }
    for (let y = 0; y < height; y += GAME_SETTINGS.GRID_SIZE) {
        line(0, y, width, y);
    }
}

function applyScreenShake() {
    if (screenShakeEnabled && screenShakeMagnitude > 0) {
        let shakeX = random(-screenShakeMagnitude, screenShakeMagnitude);
        let shakeY = random(-screenShakeMagnitude, screenShakeMagnitude);
        translate(shakeX, shakeY);
        screenShakeMagnitude *= 0.9;
        if (screenShakeMagnitude < 0.5) screenShakeMagnitude = 0;
    }
}

function updateMultiplier() {
    killsSinceLastHit++;
    lastKillTime = millis();
    if (killsSinceLastHit > 25) scoreMultiplier = 6;
    else if (killsSinceLastHit > 15) scoreMultiplier = 5;
    else if (killsSinceLastHit > 8) scoreMultiplier = 4;
    else if (killsSinceLastHit > 4) scoreMultiplier = 3;
    else if (killsSinceLastHit > 1) scoreMultiplier = 2;
    else scoreMultiplier = 1;
}

function resetMultiplier() {
    killsSinceLastHit = 0;
    scoreMultiplier = 1;
}

function checkMultiplierReset() {
    if (scoreMultiplier > 1 && millis() - lastKillTime > GAME_SETTINGS.MULTIPLIER_RESET_TIME) {
        resetMultiplier();
    }
}

function loadGameData() { // Renamed from loadHighScore
    let storedScore = localStorage.getItem('geoShooterEvolvedHighScore');
    highScore = storedScore ? int(storedScore) : 0;

    let storedCredits = localStorage.getItem('geoShooterEvolvedCredits');
    playerCredits = storedCredits ? int(storedCredits) : GAME_SETTINGS.INITIAL_CREDITS;

    // Load upgrade levels from localStorage
    for (let key in availableUpgrades) {
        let storedLevel = localStorage.getItem('geoShooterUpgrade_' + key);
        if (storedLevel !== null) {
            availableUpgrades[key].level = int(storedLevel);
        } else {
            availableUpgrades[key].level = 0; // Default to 0 if not found
        }
    }
    let storedDebugMode = localStorage.getItem('geoShooterEvolvedDebugMode');
    // If it's stored as "true" (string), set to true (boolean), otherwise false.
    debugMode = storedDebugMode === 'true';

    let storedVolume = localStorage.getItem('geoShooterMasterVolume');
    masterVolume = storedVolume !== null ? parseFloat(storedVolume) : 0.5;

    let storedScreenShake = localStorage.getItem('geoShooterScreenShake');
    // If it's stored as "false" (string), set to false (boolean), otherwise true (default).
    screenShakeEnabled = storedScreenShake === 'false' ? false : true;
}

function saveGameData(isResetting = false) { // Added isResetting flag
    if (isResetting) {
        localStorage.setItem('geoShooterEvolvedHighScore', 0); // Directly save 0 for reset
    } else if (score > highScore) {
        highScore = score; // Update global highScore if current game score is higher
        localStorage.setItem('geoShooterEvolvedHighScore', highScore);
    }
    // Note: If not resetting and score is not > highScore, the existing highScore in localStorage remains.
    // This is usually fine, but ensure loadGameData always reflects the true highest.
    // The current loadGameData correctly loads what's in localStorage.

    localStorage.setItem('geoShooterEvolvedCredits', playerCredits);

    // Save upgrade levels to localStorage
    for (let key in availableUpgrades) {
        localStorage.setItem('geoShooterUpgrade_' + key, availableUpgrades[key].level);
    }
    localStorage.setItem('geoShooterEvolvedDebugMode', debugMode); // Save boolean as string
    localStorage.setItem('geoShooterMasterVolume', masterVolume);
    localStorage.setItem('geoShooterScreenShake', screenShakeEnabled); // Save boolean as string
}

function resetGameToDefaults() {
    console.log("Resetting game data to defaults...");
    highScore = 0;
    playerCredits = GAME_SETTINGS.INITIAL_CREDITS; // Use constant for initial credits

    // Reset upgrade levels
    if (availableUpgrades && Object.keys(availableUpgrades).length > 0) {
        for (let key in availableUpgrades) {
            availableUpgrades[key].level = 0;
        }
    } else {
        // If availableUpgrades isn't populated yet (e.g. called before defineUpgrades),
        // defineUpgrades() should set them to default levels anyway.
        // This path might occur if reset is somehow triggered very early.
        console.warn("availableUpgrades not populated during reset. defineUpgrades() should handle defaults.");
    }
    
    masterVolume = 0.5; // Default volume
    debugMode = false;  // Default debug mode
    screenShakeEnabled = true; // Default screen shake

    saveGameData(true); // Persist these new default values, indicating it's a reset
    console.log("Game data reset and saved.");

    // If player object exists, re-apply upgrades to reflect reset state
    if (player) {
        player.applyUpgrades();
        player.bombs = player.maxBombs; // Reset bombs based on new capacity
    }
}

// function addXP(amount) { // Phased out
//     if (currentGameState !== GAME_STATE.PLAYING) return;
//     playerXP += amount * scoreMultiplier;
//     if (playerXP >= xpToNextLevel) {
//         levelUp();
//     }
// }

// function levelUp() { // Phased out
//     playerLevel++;
//     playerXP -= xpToNextLevel;
//     xpToNextLevel = floor(GAME_SETTINGS.INITIAL_XP_TO_NEXT_LEVEL * pow(GAME_SETTINGS.LEVEL_COST_MULTIPLIER, playerLevel - 1));
//     presentUpgradeChoices();
// }

// function calculateXPPercentage() { // Phased out
//     if (xpToNextLevel <= 0) return 1;
//     return constrain(playerXP / xpToNextLevel, 0, 1);
// }