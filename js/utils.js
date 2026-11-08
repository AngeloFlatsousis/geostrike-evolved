// --- Storage helpers (private mode / blocked storage safe) -----------------
function storageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (err) {
        return null;
    }
}

function storageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (err) {
        // Storage can be unavailable (private mode, quota). Never break the game.
    }
}

// --- Floating score / pickup labels ---------------------------------------
function showFloatingLabel(x, y, text, labelColor) {
    if (floatingLabels.length > 40) floatingLabels.shift();
    floatingLabels.push({
        x, y, text,
        color: labelColor || color(255),
        life: 900,
        maxLife: 900,
    });
}

function updateFloatingLabels() {
    for (let i = floatingLabels.length - 1; i >= 0; i--) {
        const l = floatingLabels[i];
        l.life -= deltaTime;
        l.y -= 0.6 * dtScale;
        if (l.life <= 0) floatingLabels.splice(i, 1);
    }
}

function drawFloatingLabels() {
    if (floatingLabels.length === 0) return;
    push();
    textAlign(CENTER, CENTER);
    textSize(14);
    noStroke();
    for (const l of floatingLabels) {
        const a = map(l.life, 0, l.maxLife, 0, 255, true);
        fill(red(l.color), green(l.color), blue(l.color), a);
        text(l.text, l.x, l.y);
    }
    pop();
}

// --- Effects ---------------------------------------------------------------
function createExplosion(x, y, count, pColor, sizeMultiplier = 1) {
    // Hard cap: a chain reaction of bombs should never tank the frame rate.
    const room = GAME_SETTINGS.MAX_PARTICLES - particles.length;
    const toCreate = min(count, max(0, room));
    for (let i = 0; i < toCreate; i++) {
        particles.push(new Particle(x, y, pColor, sizeMultiplier));
    }
}

// --- Difficulty / spawning ------------------------------------------------
function getRunElapsedMs() {
    return runActive ? max(0, millis() - runStartTime) : 0;
}

function getDifficultyMultiplier() {
    const minutes = getRunElapsedMs() / 60000;
    return constrain(1 + minutes * GAME_SETTINGS.DIFFICULTY_RAMP_PER_MINUTE, 1, GAME_SETTINGS.MAX_DIFFICULTY_MULTIPLIER);
}

function getCurrentSpawnInterval() {
    const seconds = getRunElapsedMs() / 1000;
    return max(GAME_SETTINGS.MIN_SPAWN_INTERVAL, spawnInterval - seconds * 3.0);
}

function getCurrentAsteroidSpawnInterval() {
    const minutes = getRunElapsedMs() / 60000;
    return max(ASTEROID_SETTINGS.MIN_SPAWN_INTERVAL, ASTEROID_SETTINGS.SPAWN_INTERVAL - minutes * 1800);
}

// Enemies get tougher and more valuable the longer a run lasts.
function scaleSpawnedEnemy(enemy) {
    if (!enemy) return enemy;
    const d = getDifficultyMultiplier();
    const healthScale = 1 + (d - 1) * 0.95;
    enemy.health = max(1, ceil(enemy.health * healthScale));
    enemy.baseHealth = enemy.health;
    enemy.maxSpeed = min(7, enemy.maxSpeed * (1 + (d - 1) * 0.22));
    enemy.scoreValue = floor(enemy.scoreValue * d);
    enemy.creditsValue = max(1, floor(enemy.creditsValue * (1 + (d - 1) * 0.5)));
    return enemy;
}

function randomEdgeSpawnPoint(padding) {
    switch (floor(random(4))) {
        case 0: return { x: random(width), y: -padding };
        case 1: return { x: width + padding, y: random(height) };
        case 2: return { x: random(width), y: height + padding };
        default: return { x: -padding, y: random(height) };
    }
}

function spawnEnemy() {
    if (enemies.length >= GAME_SETTINGS.MAX_ENEMIES) return;

    const point = randomEdgeSpawnPoint(50);
    const elapsed = getRunElapsedMs();
    const roll = random();

    let type;
    if (elapsed < 20000) {
        // Warm-up: mostly chasers.
        type = roll < 0.85 ? ENEMY_TYPE.CHASER : ENEMY_TYPE.DODGER;
    } else if (elapsed < 50000) {
        type = roll < 0.6 ? ENEMY_TYPE.CHASER : (roll < 0.9 ? ENEMY_TYPE.DODGER : ENEMY_TYPE.SPLITTER);
    } else {
        type = roll < 0.45 ? ENEMY_TYPE.CHASER : (roll < 0.8 ? ENEMY_TYPE.DODGER : ENEMY_TYPE.SPLITTER);
    }

    let enemy;
    if (type === ENEMY_TYPE.CHASER) {
        enemy = new ChaserEnemy(point.x, point.y);
    } else if (type === ENEMY_TYPE.DODGER) {
        enemy = new DodgerEnemy(point.x, point.y);
    } else {
        enemy = new SplitterEnemy(point.x, point.y);
    }
    enemies.push(scaleSpawnedEnemy(enemy));
}

function spawnMinion(x, y, type = ENEMY_TYPE.CHASER) {
    let enemy;
    if (type === ENEMY_TYPE.DODGER) {
        enemy = new DodgerEnemy(x, y);
    } else {
        enemy = new ChaserEnemy(x, y);
    }
    enemies.push(scaleSpawnedEnemy(enemy));
    createExplosion(x, y, 12, color(255, 90, 90, 180), 0.9);
    return enemy;
}

function spawnAsteroid() {
    if (asteroids.length >= ASTEROID_SETTINGS.MAX_COUNT) return;

    let point = { x: 0, y: 0 };
    let attempts = 0;
    do {
        point = randomEdgeSpawnPoint(ASTEROID_SETTINGS.MAX_RADIUS);
        attempts++;
    } while (
        player && attempts < 8 &&
        dist(point.x, point.y, player.pos.x, player.pos.y) < ASTEROID_SETTINGS.SAFE_SPAWN_DISTANCE
    );

    asteroids.push(new Asteroid(point.x, point.y));
    lastAsteroidSpawnTime = millis();
}

function spawnBoss() {
    if (bossSpawnedThisGame || enemies.some(e => e && e.isBoss && !e.dead)) return;
    let boss = new BossMegaChaser(width / 2, -120);
    enemies.push(boss);
    bossSpawnedThisGame = true;
    lastBossTime = millis();
    bossWarningStart = 0;
    screenShakeMagnitude = max(screenShakeMagnitude, 8);
    playMusic(bossMusic);
    return boss;
}

function updateBossProgression() {
    if (bossSpawnedThisGame || enemies.some(e => e && e.isBoss && !e.dead)) {
        bossWarningStart = 0;
        return;
    }

    if (bossWarningStart > 0) {
        if (millis() - bossWarningStart >= GAME_SETTINGS.BOSS_WARNING_DURATION) {
            bossWarningStart = 0;
            spawnBoss();
        }
        return;
    }

    // Score gets the boss to the door; a cooldown keeps late-game score rates
    // from turning the run into a boss conveyor belt.
    if (score >= nextBossScore && millis() - lastBossTime >= GAME_SETTINGS.BOSS_MIN_INTERVAL) {
        bossWarningStart = millis();
        playSfx('bossWarning');
    }
}

function spawnPickup(x, y, type) {
    if (pickups.length >= GAME_SETTINGS.MAX_PICKUPS) return;
    pickups.push(new Pickup(x, y, type));
}

// --- Enemy merging ---------------------------------------------------------
function handleEnemyMerging() {
    let newMergedEnemies = [];
    let indicesToRemove = new Set();

    for (let i = 0; i < enemies.length; i++) {
        const e1 = enemies[i];
        if (!e1 || e1.dead || indicesToRemove.has(i) || e1.isBoss) continue;

        for (let j = i + 1; j < enemies.length; j++) {
            const e2 = enemies[j];
            if (!e2 || e2.dead || indicesToRemove.has(j) || e2.isBoss) continue;

            if (e1.type !== e2.type || e1.constructor !== e2.constructor) continue;
            if (e1.mergeLevel >= ENEMY_MERGE_SETTINGS.MAX_MERGE_LEVEL) continue;
            if (e2.mergeLevel >= ENEMY_MERGE_SETTINGS.MAX_MERGE_LEVEL) continue;

            const d = dist(e1.pos.x, e1.pos.y, e2.pos.x, e2.pos.y);
            if (d < e1.radius + e2.radius - 5) {
                const merged = createMergedEnemy(e1, e2);
                if (!merged) continue;

                newMergedEnemies.push(merged);
                indicesToRemove.add(i);
                indicesToRemove.add(j);
                createExplosion(
                    (e1.pos.x + e2.pos.x) / 2, (e1.pos.y + e2.pos.y) / 2,
                    20 + (e1.mergeLevel + e2.mergeLevel) * 8,
                    ENEMY_MERGE_SETTINGS.MERGE_EFFECT_COLOR,
                    1.1 + (e1.mergeLevel + e2.mergeLevel) * 0.2
                );
                playSfx('merge');
                break;
            }
        }
    }

    if (indicesToRemove.size > 0) {
        // Remove by identity: splicing by index invalidates later indices.
        const toRemove = new Set();
        for (const index of indicesToRemove) {
            if (enemies[index]) toRemove.add(enemies[index]);
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (toRemove.has(enemies[i])) enemies.splice(i, 1);
        }
        for (const merged of newMergedEnemies) {
            if (enemies.length < GAME_SETTINGS.MAX_ENEMIES) enemies.push(merged);
        }
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
        creditsValue: (e1.creditsValue || 0) + (e2.creditsValue || 0) + ENEMY_MERGE_SETTINGS.MERGE_CREDITS_BONUS_BASE * newMergeLevel,
        type: e1.type,
        mergeLevel: newMergeLevel,
        pickupDropChance: min(0.8, e1.pickupDropChance + e2.pickupDropChance + ENEMY_MERGE_SETTINGS.PICKUP_DROP_CHANCE_BONUS * newMergeLevel),
        baseColor: lerpColor(e1.baseColor, e2.baseColor, 0.5),
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

// --- Background / camera ---------------------------------------------------
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

function initStars() {
    stars = [];
    const count = constrain(floor((width * height) / 9000), 50, 220);
    for (let i = 0; i < count; i++) {
        stars.push({
            x: random(width),
            y: random(height),
            z: random(0.25, 1),
            twinkle: random(TWO_PI),
        });
    }
}

function drawStarfield() {
    push();
    noStroke();
    for (const s of stars) {
        s.y += (0.05 + s.z * 0.14) * dtScale;
        if (s.y > height + 2) {
            s.y = -2;
            s.x = random(width);
        }
        const alpha = 25 + 95 * s.z * (0.65 + 0.35 * sin(frameCount * 0.02 + s.twinkle));
        fill(170, 200, 255, alpha);
        ellipse(s.x, s.y, 1 + s.z * 1.7);
    }
    pop();
}

function updateScreenShake() {
    if (screenShakeMagnitude <= 0) {
        screenShakeMagnitude = 0;
        return;
    }
    screenShakeMagnitude *= pow(0.9, dtScale);
    if (screenShakeMagnitude < 0.4) screenShakeMagnitude = 0;
}

// One random offset per frame, shared by the background and the world so the
// two never jitter against each other.
function computeCameraShake(intensity = 1) {
    if (!screenShakeEnabled || screenShakeMagnitude <= 0) {
        cameraShake.x = 0;
        cameraShake.y = 0;
        return;
    }
    const m = screenShakeMagnitude * intensity;
    cameraShake.x = random(-m, m);
    cameraShake.y = random(-m, m);
}

function applyCameraShake() {
    if (cameraShake.x === 0 && cameraShake.y === 0) return;
    translate(cameraShake.x, cameraShake.y);
}

// --- Score multiplier ------------------------------------------------------
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

// --- Queries ---------------------------------------------------------------
function getNearestEnemy(fromPos, maxDist = Infinity) {
    let best = null;
    let bestDist = maxDist;
    for (const e of enemies) {
        if (!e || e.dead) continue;
        const d = dist(fromPos.x, fromPos.y, e.pos.x, e.pos.y);
        if (d < bestDist) {
            bestDist = d;
            best = e;
        }
    }
    return best;
}

function clearHostilesNearPlayer(radius) {
    if (!player) return;
    for (const e of enemies.slice()) {
        if (!e || e.dead) continue;
        const d = dist(player.pos.x, player.pos.y, e.pos.x, e.pos.y);
        if (d > radius) continue;
        if (e.isBoss) {
            // Bosses are knocked back instead of melted.
            let push = p5.Vector.sub(e.pos, player.pos);
            if (push.magSq() < 0.0001) push.set(1, 0);
            e.pos.add(push.setMag(radius * 0.9));
            e.vel.mult(0.2);
        } else {
            e.takeDamage(e.health + 1);
        }
    }
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const eb = enemyBullets[i];
        if (!eb) continue;
        if (dist(player.pos.x, player.pos.y, eb.pos.x, eb.pos.y) < radius) {
            enemyBullets.splice(i, 1);
        }
    }
}

// --- Persistence -----------------------------------------------------------
function loadGameData() {
    let storedScore = parseInt(storageGet('geoShooterEvolvedHighScore'), 10);
    highScore = isNaN(storedScore) ? 0 : storedScore;

    let storedCredits = parseInt(storageGet('geoShooterEvolvedCredits'), 10);
    playerCredits = isNaN(storedCredits) ? GAME_SETTINGS.INITIAL_CREDITS : max(0, storedCredits);

    let storedBonusLives = parseInt(storageGet('geoShooterBonusLives'), 10);
    bonusLives = isNaN(storedBonusLives)
        ? 0
        : constrain(storedBonusLives, 0, PLAYER_SETTINGS.MAX_LIVES - PLAYER_SETTINGS.STARTING_LIVES);

    // Load upgrade levels
    for (let key in availableUpgrades) {
        let storedLevel = parseInt(storageGet('geoShooterUpgrade_' + key), 10);
        availableUpgrades[key].level = isNaN(storedLevel)
            ? 0
            : constrain(storedLevel, 0, availableUpgrades[key].maxLevel);
    }

    debugMode = storageGet('geoShooterEvolvedDebugMode') === 'true';

    let storedVolume = parseFloat(storageGet('geoShooterMasterVolume'));
    masterVolume = isNaN(storedVolume) ? 0.5 : constrain(storedVolume, 0, 1);

    screenShakeEnabled = storageGet('geoShooterScreenShake') !== 'false';
    sfxEnabled = storageGet('geoShooterSfx') !== 'false';
    updateSfxVolume();
}

function saveGameData(isResetting = false) {
    if (isResetting) {
        storageSet('geoShooterEvolvedHighScore', 0);
        highScore = 0;
    } else if (score > highScore) {
        highScore = score;
        storageSet('geoShooterEvolvedHighScore', highScore);
    } else {
        storageSet('geoShooterEvolvedHighScore', highScore);
    }

    storageSet('geoShooterEvolvedCredits', floor(playerCredits));
    storageSet('geoShooterBonusLives', bonusLives);

    for (let key in availableUpgrades) {
        storageSet('geoShooterUpgrade_' + key, availableUpgrades[key].level);
    }
    storageSet('geoShooterEvolvedDebugMode', debugMode);
    storageSet('geoShooterMasterVolume', masterVolume);
    storageSet('geoShooterScreenShake', screenShakeEnabled);
    storageSet('geoShooterSfx', sfxEnabled);
}

function resetGameToDefaults() {
    highScore = 0;
    playerCredits = GAME_SETTINGS.INITIAL_CREDITS;
    bonusLives = 0;

    if (availableUpgrades && Object.keys(availableUpgrades).length > 0) {
        for (let key in availableUpgrades) {
            availableUpgrades[key].level = 0;
        }
    }
    masterVolume = 0.5;
    debugMode = false;
    screenShakeEnabled = true;
    sfxEnabled = true;

    saveGameData(true);
    updateSfxVolume();
    outputVolume(masterVolume);

    if (player) {
        player.applyUpgrades();
        player.bombs = player.maxBombs;
    }
}

// --- Run lifecycle ---------------------------------------------------------
function endGame() {
    if (currentGameState === GAME_STATE.GAME_OVER) return;

    const elapsed = getRunElapsedMs();
    lastRunStats = {
        score: score,
        kills: runKills,
        timeMs: elapsed,
        creditsEarned: runCreditsEarned,
        bossKills: bossesKilled,
        newHighScore: score > highScore,
    };

    currentGameState = GAME_STATE.GAME_OVER;
    runActive = false;
    isShooting = false;
    joystick.active = false;
    saveGameData();
    playMusic(menuMusic);
    playSfx('gameOver');
}

function formatTime(ms) {
    const totalSeconds = max(0, floor(ms / 1000));
    const minutes = floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}
