// p5.js Main Functions & Game Loop

function preload() {
    soundFormats('mp3');
    menuMusic = loadSound('One Man Symphony - Collateral Damage (Free) - 07 Exploration Theme 02.mp3');
    gameMusic = loadSound('One Man Symphony - Collateral Damage (Free) - 02 Action 02.mp3');
    bossMusic = loadSound('One Man Symphony - Collateral Damage (Free) - 01 Action 01.mp3');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate(60); // Keeps the tuning consistent on high refresh displays
    textFont('Consolas', 16);
    noStroke();
    textAlign(LEFT, TOP);

    ENEMY_MERGE_SETTINGS.MERGE_EFFECT_COLOR = color(200, 220, 255);

    defineUpgrades();   // Define structure of available upgrades first
    loadGameData();     // Load high score, credits, upgrades, volume, options
    outputVolume(masterVolume); // Apply loaded/default volume
    initAudio();
    initStars();

    // Ensure DOM elements are hidden initially
    hideSettingsDomElements();

    setupWelcomeScreen();
    currentGameState = GAME_STATE.WELCOME_SCREEN;

    // Hide loading screen once setup is complete
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

function isWorldState(state = currentGameState) {
    return state === GAME_STATE.PLAYING || state === GAME_STATE.PAUSED || state === GAME_STATE.GAME_OVER;
}

function draw() {
    // Frame-rate independence: 1.0 at 60fps, clamped so a hitch can't teleport entities.
    dtScale = constrain(deltaTime / (1000 / 60), 0.35, 2.5);

    updateScreenShake();
    background(5, 10, 15);
    backgroundPulseAlpha = map(scoreMultiplier, 1, 6, 0, 35, true) + sin(frameCount * 0.05) * 5;

    // World shake only affects the world/background, menus get a gentler shake
    // so text stays readable. Both use the same offset for one frame.
    computeCameraShake(isWorldState() ? 1 : 0.35);
    push();
    applyCameraShake();
    drawGrid();
    drawStarfield();
    pop();

    if (currentGameState === GAME_STATE.WELCOME_SCREEN) {
        drawWelcomeScreen();
    } else if (currentGameState === GAME_STATE.MAIN_MENU) {
        drawMainMenu();
    } else if (currentGameState === GAME_STATE.STORE_SCREEN) {
        drawStoreScreen();
    } else if (currentGameState === GAME_STATE.HOW_TO_PLAY) {
        drawHowToPlayScreen();
    } else if (currentGameState === GAME_STATE.SETTINGS_SCREEN) {
        drawSettingsScreen();
    } else if (currentGameState === GAME_STATE.GAME_OVER) {
        drawFrozenWorld();
        drawGameOverScreen();
    } else if (currentGameState === GAME_STATE.PLAYING || currentGameState === GAME_STATE.PAUSED) {
        if (currentGameState === GAME_STATE.PLAYING) {
            gameLogicUpdate(); // May switch to GAME_OVER
        }

        if (currentGameState === GAME_STATE.PLAYING || currentGameState === GAME_STATE.PAUSED) {
            drawFrozenWorld();
            drawGameUI();
            if (currentGameState === GAME_STATE.PAUSED) {
                drawPauseScreen();
            }
        } else if (currentGameState === GAME_STATE.GAME_OVER) {
            drawFrozenWorld();
            drawGameOverScreen();
        }
    }
}

function drawFrozenWorld() {
    push();
    applyCameraShake();
    drawGameWorld();
    pop();
}

function gameLogicUpdate() {
    checkMultiplierReset();
    handleEnemyMerging();
    updateFloatingLabels();

    if (millis() - lastSpawnTime > getCurrentSpawnInterval()) {
        spawnEnemy();
        lastSpawnTime = millis();
    }
    if (millis() - lastAsteroidSpawnTime > getCurrentAsteroidSpawnInterval()) {
        spawnAsteroid();
    }
    updateBossProgression();

    // Switch back to normal music once the boss is gone
    if (currentTrack === bossMusic && !enemies.some(e => e && e.isBoss && !e.dead)) {
        playMusic(gameMusic);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].isDead()) particles.splice(i, 1);
    }
    for (let i = pickups.length - 1; i >= 0; i--) {
        pickups[i].update();
        if (pickups[i].isDead()) pickups.splice(i, 1);
    }
    for (let i = asteroids.length - 1; i >= 0; i--) {
        if (!asteroids[i] || asteroids[i].dead) { asteroids.splice(i, 1); continue; }
        asteroids[i].update();
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (!bullets[i]) { bullets.splice(i, 1); continue; }
        bullets[i].update();
        if (bullets[i].isOffscreen()) bullets.splice(i, 1);
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (!enemies[i] || enemies[i].dead) { enemies.splice(i, 1); continue; }
        enemies[i].update();
        if (enemies[i].isOffscreen()) {
            // Let stragglers leave but never silently delete bosses.
            enemies.splice(i, 1);
        }
    }

    // --- Enemy projectiles ---
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eb = enemyBullets[i];
        if (!eb) { enemyBullets.splice(i, 1); continue; }
        eb.update();
        if (eb.isOffscreen()) { enemyBullets.splice(i, 1); continue; }

        if (player) {
            let d = dist(eb.pos.x, eb.pos.y, player.pos.x, player.pos.y);
            if (d < eb.radius + player.radius) {
                enemyBullets.splice(i, 1);
                if (player.hit()) return; // Game over
                continue;
            }
        }
    }

    if (player) {
        player.update();
        if (isShooting || isTouchMode) player.shoot(); // Touch devices auto-fire
    }

    // --- Player bullets vs enemies / asteroids ---
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (!b) { bullets.splice(i, 1); continue; }

        let consumed = false;

        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (!e || e.dead || b.hitEnemies.has(e)) continue;
            if (dist(b.pos.x, b.pos.y, e.pos.x, e.pos.y) < b.radius + e.radius) {
                e.takeDamage(b.damage);
                createExplosion(b.pos.x, b.pos.y, 5, b.color, 0.6);
                playSfx('hit');
                if (b.onHitEnemy(e)) {
                    consumed = true;
                    break;
                }
            }
        }

        if (!consumed) {
            for (let j = asteroids.length - 1; j >= 0; j--) {
                const a = asteroids[j];
                if (!a || a.dead) continue;
                if (dist(b.pos.x, b.pos.y, a.pos.x, a.pos.y) < b.radius + a.radius) {
                    a.takeDamage(b.damage);
                    createExplosion(b.pos.x, b.pos.y, 3, a.color, 0.5);
                    consumed = true;
                    break;
                }
            }
        }

        if (consumed) bullets.splice(i, 1);
    }

    // --- Player collisions ---
    if (player && !player.invulnerable) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (!e || e.dead) continue;
            if (dist(player.pos.x, player.pos.y, e.pos.x, e.pos.y) < player.radius + e.radius) {
                e.takeDamage(100 + player.bulletDamage * 50);
                if (player.hit()) return; // Game over
                break; // Invulnerable now, a single hit per frame is enough
            }
        }

        if (player && !player.invulnerable) {
            for (let i = asteroids.length - 1; i >= 0; i--) {
                const a = asteroids[i];
                if (!a || a.dead) continue;
                if (dist(player.pos.x, player.pos.y, a.pos.x, a.pos.y) < player.radius + a.radius) {
                    if (player.hit()) return;
                    a.takeDamage(5);
                    if (player) {
                        player.vel.mult(-0.5).add(p5.Vector.sub(player.pos, a.pos).setMag(2));
                    }
                    screenShakeMagnitude = max(screenShakeMagnitude, 5);
                    break;
                }
            }
        }
    }

    // Keep enemies from stacking inside asteroids
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!e || e.dead) continue;
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const a = asteroids[j];
            if (!a || a.dead) continue;
            if (dist(e.pos.x, e.pos.y, a.pos.x, a.pos.y) < e.radius + a.radius) {
                let pushForce = p5.Vector.sub(e.pos, a.pos).setMag(1);
                e.vel.add(pushForce);
                a.vel.sub(pushForce.mult(0.5));
            }
        }
    }
}

function drawGameWorld() {
    for (let a of asteroids) a.draw();
    for (let p of pickups) p.draw();
    for (let p of particles) p.draw();
    for (let e of enemies) e.draw();
    for (let eb of enemyBullets) eb.draw();
    if (player) player.draw();
    for (let b of bullets) b.draw();
}

function initGame() {
    bullets = [];
    enemies = [];
    particles = [];
    pickups = [];
    asteroids = [];
    enemyBullets = [];
    floatingLabels = [];

    player = new Player(width / 2, height / 2);
    player.applyUpgrades();
    player.bombs = player.maxBombs;

    score = 0;
    playerLives = min(PLAYER_SETTINGS.MAX_LIVES, PLAYER_SETTINGS.STARTING_LIVES + bonusLives);
    runKills = 0;
    runCreditsEarned = 0;
    bossesKilled = 0;
    bossTier = 0;
    bossSpawnedThisGame = false;
    bossWarningStart = 0;
    nextBossScore = GAME_SETTINGS.BOSS_FIRST_SCORE;
    lastBossTime = -Infinity;
    lastRunStats = null;

    runStartTime = millis();
    runActive = true;
    lastSpawnTime = millis();
    spawnInterval = GAME_SETTINGS.INITIAL_SPAWN_INTERVAL;
    lastAsteroidSpawnTime = millis();

    screenShakeMagnitude = 0;
    resetMultiplier();
    lastKillTime = millis();
    isShooting = false;
    joystick.active = false;
    storeToast = null;

    hideSettingsDomElements();
    player.startInvulnerability();
    currentGameState = GAME_STATE.PLAYING;
    playMusic(gameMusic);
}

// --- Game flow -------------------------------------------------------------
function pauseGame() {
    if (currentGameState !== GAME_STATE.PLAYING) return;
    currentGameState = GAME_STATE.PAUSED;
    pauseStartTime = millis();
    isShooting = false;
    joystick.active = false;
    setupPauseMenu();
    // Duck the music instead of stopping it so resuming is seamless.
    if (currentTrack && currentTrack.isPlaying && currentTrack.isPlaying() && currentTrack.setVolume) {
        currentTrack.setVolume(0.25);
    }
    playSfx('uiClick');
}

function resumeGame() {
    if (currentGameState !== GAME_STATE.PAUSED) return;
    const pausedFor = millis() - pauseStartTime;

    // Shift game clocks forward so pausing doesn't cost buffs or dump a
    // burst of queued spawns/bullets when play resumes.
    runStartTime += pausedFor;
    lastSpawnTime += pausedFor;
    lastAsteroidSpawnTime += pausedFor;
    lastKillTime += pausedFor;
    if (bossWarningStart > 0) bossWarningStart += pausedFor;
    if (player) {
        player.lastShotTime += pausedFor;
        player.lastBombTime += pausedFor;
        if (player.invulnerable) player.invulnerableTime += pausedFor;
        if (player.hasShield) player.shieldStartTime += pausedFor;
        if (player.rapidFireActive) player.rapidFireUntil += pausedFor;
    }
    for (const e of enemies) {
        if (!e) continue;
        if (typeof e.nextBurstTime === 'number') e.nextBurstTime += pausedFor;
        if (typeof e.nextSummonTime === 'number') e.nextSummonTime += pausedFor;
    }

    currentGameState = GAME_STATE.PLAYING;
    if (currentTrack && currentTrack.setVolume) currentTrack.setVolume(1);
}

// --- Music Control ---
function playMusic(trackToPlay) {
    if (!trackToPlay) return;

    if (currentTrack === trackToPlay && currentTrack.isPlaying()) return;

    if (currentTrack && currentTrack !== trackToPlay && currentTrack.isPlaying()) {
        currentTrack.stop();
    }

    try {
        trackToPlay.setVolume(1);
        if (!trackToPlay.isPlaying()) {
            trackToPlay.loop();
        }
        currentTrack = trackToPlay;
    } catch (err) {
        currentTrack = trackToPlay;
    }
}

function stopAllMusic() {
    if (currentTrack && currentTrack.isPlaying()) {
        currentTrack.stop();
    }
    currentTrack = null;
}

// --- Input Handling --------------------------------------------------------
function startAudioIfNeeded() {
    try {
        if (typeof getAudioContext === 'function') {
            if (getAudioContext().state !== 'running') userStartAudio();
        }
    } catch (err) {
        // Audio is optional.
    }
}

function goToMainMenu() {
    saveGameData();
    runActive = false;
    hideSettingsDomElements();
    currentGameState = GAME_STATE.MAIN_MENU;
    setupMainMenu();
    playMusic(menuMusic);
}

function keyPressed(event) {
    const isRepeat = !!(event && event.repeat);

    if (currentGameState === GAME_STATE.GAME_OVER) {
        if (!isRepeat && (keyCode === ENTER || keyCode === RETURN)) {
            goToMainMenu();
        } else if (!isRepeat && keyCode === 82) { // R
            initGame();
        }
        return false;
    }

    if (currentGameState === GAME_STATE.STORE_SCREEN ||
        currentGameState === GAME_STATE.HOW_TO_PLAY ||
        currentGameState === GAME_STATE.SETTINGS_SCREEN) {
        // ESC goes back. Don't swallow keys in Settings: DOM inputs need them.
        if (keyCode === ESCAPE) {
            if (currentGameState === GAME_STATE.SETTINGS_SCREEN) {
                hideSettingsDomElements();
                currentGameState = GAME_STATE.MAIN_MENU;
                setupMainMenu();
                playMusic(menuMusic);
                return false;
            }
            goToMainMenu();
            return false;
        }
        return;
    }

    if (currentGameState === GAME_STATE.WELCOME_SCREEN) {
        if (!isRepeat && (keyCode === ENTER || keyCode === RETURN)) {
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
        }
        return false;
    }

    if (currentGameState === GAME_STATE.MAIN_MENU) {
        if (!isRepeat && (keyCode === ENTER || keyCode === RETURN)) {
            initGame();
        }
        return false;
    }

    // --- Playing / paused ---
    if (!isRepeat && (keyCode === 80 || keyCode === ESCAPE)) { // P or ESC
        if (currentGameState === GAME_STATE.PLAYING) pauseGame();
        else if (currentGameState === GAME_STATE.PAUSED) resumeGame();
        return false;
    }

    if (currentGameState !== GAME_STATE.PLAYING) return false;

    // Using the keyboard means this is a desktop session: drop touch auto-aim.
    if ([87, 83, 65, 68, UP_ARROW, DOWN_ARROW, LEFT_ARROW, RIGHT_ARROW].indexOf(keyCode) !== -1) {
        if (isTouchMode) isTouchMode = false;
    }

    if (keyCode === 87 || keyCode === UP_ARROW) moveUp = true;
    if (keyCode === 83 || keyCode === DOWN_ARROW) moveDown = true;
    if (keyCode === 65 || keyCode === LEFT_ARROW) moveLeft = true;
    if (keyCode === 68 || keyCode === RIGHT_ARROW) moveRight = true;

    if (keyCode === 32 && player) player.useBomb();

    if (debugMode) {
        if (keyCode === 75) playerCredits += 100; // K
        if (keyCode === 78) enemies.push(new SplitterEnemy(mouseX, mouseY)); // N
        if (keyCode === 77) pickups.push(new Pickup(mouseX, mouseY, PICKUP_TYPE.SHIELD)); // M
        if (keyCode === 66) spawnBoss(); // B
    }

    // Stop arrows/space from scrolling the page.
    return false;
}

function keyReleased() {
    if (keyCode === 87 || keyCode === UP_ARROW) moveUp = false;
    if (keyCode === 83 || keyCode === DOWN_ARROW) moveDown = false;
    if (keyCode === 65 || keyCode === LEFT_ARROW) moveLeft = false;
    if (keyCode === 68 || keyCode === RIGHT_ARROW) moveRight = false;
}

function hitTestButtonList(buttons) {
    for (const btn of buttons) {
        const y = btn.y !== undefined ? btn.y : 0;
        if (isMouseOver(btn.x, y, btn.w, btn.h)) {
            const isDisabled = typeof btn.disabled === 'function' ? btn.disabled() : !!btn.disabled;
            if (!isDisabled) {
                btn.action();
            } else if (typeof btn.action === 'function' && btn.id && btn.id.startsWith('buy_')) {
                playSfx('denied');
            }
            return true;
        }
    }
    return false;
}

function mousePressed() {
    switch (currentGameState) {
        case GAME_STATE.WELCOME_SCREEN:
            startAudioIfNeeded();
            hitTestButtonList(welcomeScreenButtons);
            return false;

        case GAME_STATE.MAIN_MENU:
            startAudioIfNeeded();
            if (!currentTrack || !currentTrack.isPlaying()) playMusic(menuMusic);
            hitTestButtonList(menuButtons);
            return false;

        case GAME_STATE.STORE_SCREEN: {
            const { listStartY, listVisibleHeight } = _storeUISetupData;
            for (const btn of storeButtons) {
                const y = btn.isFixed
                    ? btn.y
                    : listStartY + btn.originalY - storeScrollY;
                if (!btn.isFixed && (mouseY < listStartY || mouseY > listStartY + listVisibleHeight)) {
                    continue;
                }
                if (isMouseOver(btn.x, y, btn.w, btn.h)) {
                    const isDisabled = typeof btn.disabled === 'function' ? btn.disabled() : !!btn.disabled;
                    if (!isDisabled) btn.action();
                    else playSfx('denied');
                    return false;
                }
            }
            return false;
        }

        case GAME_STATE.HOW_TO_PLAY:
            hitTestButtonList(howToPlayButtons);
            return false;

        case GAME_STATE.SETTINGS_SCREEN:
            for (const btn of settingsButtons) {
                if (isMouseOver(btn.x, btn.y, btn.w, btn.h)) {
                    const isDisabled = typeof btn.disabled === 'function' ? btn.disabled() : !!btn.disabled;
                    if (!isDisabled) btn.action();
                    return false;
                }
            }
            return; // Let DOM inputs handle their own clicks

        case GAME_STATE.PAUSED:
            hitTestButtonList(pauseMenuButtons);
            return false;

        case GAME_STATE.GAME_OVER:
            return false;

        case GAME_STATE.PLAYING:
            if (mouseButton === LEFT) {
                isShooting = true;
                startAudioIfNeeded();
            }
            return false;
    }
    return false;
}

function mouseReleased() {
    if (mouseButton === LEFT) {
        isShooting = false;
    }
}

// --- Touch controls --------------------------------------------------------
function getTouchPoint() {
    if (typeof touches !== 'undefined' && touches.length > 0) {
        return touches[0];
    }
    return { x: mouseX, y: mouseY };
}

function isTouchBombButtonHit(x, y) {
    const rect = getTouchBombButtonRect();
    return x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h;
}

function touchStarted() {
    isTouchMode = true;
    const p = getTouchPoint();
    mouseX = p.x;
    mouseY = p.y;

    startAudioIfNeeded();

    if (currentGameState === GAME_STATE.PLAYING && player) {
        if (isTouchPauseButtonHit(p.x, p.y)) {
            pauseGame();
            return false;
        }
        if (isTouchBombButtonHit(p.x, p.y)) {
            player.useBomb();
            return false;
        }
        joystick.active = true;
        joystick.originX = p.x;
        joystick.originY = p.y;
        joystick.x = p.x;
        joystick.y = p.y;
        isShooting = true;
        return false;
    }

    if (currentGameState === GAME_STATE.PAUSED) {
        mousePressed();
        return false;
    }

    // Menus: reuse the mouse handling (p5 mirrors touches to mouseX/mouseY).
    mousePressed();
    return false;
}

function touchMoved() {
    const p = getTouchPoint();
    mouseX = p.x;
    mouseY = p.y;
    if (currentGameState === GAME_STATE.PLAYING && joystick.active) {
        joystick.x = p.x;
        joystick.y = p.y;
    }
    return false;
}

function touchEnded() {
    if (joystick.active) {
        joystick.active = false;
        isShooting = false;
    }
    return false;
}

// --- Misc lifecycle --------------------------------------------------------
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    initStars();
    hideSettingsDomElements();
    joystick.active = false;

    if (currentGameState === GAME_STATE.WELCOME_SCREEN) {
        setupWelcomeScreen();
    } else if (currentGameState === GAME_STATE.MAIN_MENU) {
        setupMainMenu();
    } else if (currentGameState === GAME_STATE.STORE_SCREEN) {
        setupStoreScreen(true);
    } else if (currentGameState === GAME_STATE.HOW_TO_PLAY) {
        setupHowToPlayScreen();
    } else if (currentGameState === GAME_STATE.SETTINGS_SCREEN) {
        setupSettingsScreen();
    } else if (currentGameState === GAME_STATE.PAUSED) {
        setupPauseMenu();
    }

    if (player && (currentGameState === GAME_STATE.PLAYING || currentGameState === GAME_STATE.PAUSED)) {
        player.pos.x = constrain(player.pos.x, player.radius, max(player.radius, width - player.radius));
        player.pos.y = constrain(player.pos.y, player.radius, max(player.radius, height - player.radius));
    }
}

function mouseWheel(event) {
    if (mouseWheelStoreScreen(event)) {
        return false; // Prevent default browser scrolling
    }
}
