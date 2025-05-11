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
function isMobileDevice() {
    // Basic check using user agent. More robust checks can be added if needed.
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|rim)|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
}