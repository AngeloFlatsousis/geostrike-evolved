// p5.js Main Functions & Game Loop

function preload() {
    soundFormats('mp3'); // Specify sound formats if needed, good practice
    // Commenting out to isolate the "loading..." issue
    menuMusic = loadSound('One Man Symphony - Collateral Damage (Free) - 07 Exploration Theme 02.mp3');
    gameMusic = loadSound('One Man Symphony - Collateral Damage (Free) - 02 Action 02.mp3');
    bossMusic = loadSound('One Man Symphony - Collateral Damage (Free) - 01 Action 01.mp3');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    textFont('Consolas', 16);
    noStroke();
    textAlign(LEFT, TOP);

    ENEMY_MERGE_SETTINGS.MERGE_EFFECT_COLOR = color(200, 220, 255);

    defineUpgrades(); // Define structure of availableUpgrades first
    loadGameData();   // Load high score, credits, saved upgrade levels, and volume
    outputVolume(masterVolume); // Apply loaded/default volume
    
    // Ensure DOM elements are hidden initially before first setup
    if (settingsHighScoreInput) settingsHighScoreInput.hide();
    if (settingsCreditsInput) settingsCreditsInput.hide();
    
    setupWelcomeScreen(); // Setup for the new welcome screen
    currentGameState = GAME_STATE.WELCOME_SCREEN; // Start with welcome screen
    // playMusic(menuMusic); // Music will be handled by screen transitions

    // Hide loading screen once setup is complete
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

function draw() {
    background(5, 10, 15);
    applyScreenShake();
    backgroundPulseAlpha = map(scoreMultiplier, 1, 6, 0, 35, true) + sin(frameCount * 0.05) * 5;
    drawGrid();

    if (currentGameState === GAME_STATE.WELCOME_SCREEN) {
        drawWelcomeScreen(); // Function to be created
    } else if (currentGameState === GAME_STATE.MAIN_MENU) {
        drawMainMenu();
    } else if (currentGameState === GAME_STATE.STORE_SCREEN) { // New: Draw store screen
        drawStoreScreen();
    } else if (currentGameState === GAME_STATE.HOW_TO_PLAY) {
        drawHowToPlayScreen();
    } else if (currentGameState === GAME_STATE.SETTINGS_SCREEN) {
        drawSettingsScreen();
    } else if (currentGameState === GAME_STATE.GAME_OVER) {
        drawGameOverScreen();
    // } else if (currentGameState === GAME_STATE.UPGRADE_SCREEN) { // Phased out
    //     drawGameWorld();
    //     drawGameUI();
    //     drawUpgradeScreen();
    } else if (currentGameState === GAME_STATE.PLAYING || currentGameState === GAME_STATE.PAUSED) {
        let initialGameStateForFrame = currentGameState; // Store state at start of this block

        if (initialGameStateForFrame === GAME_STATE.PLAYING) {
            gameLogicUpdate(); // This might change currentGameState to GAME_OVER
        }

        // After gameLogicUpdate, check the state *again*
        if (currentGameState === GAME_STATE.PLAYING || currentGameState === GAME_STATE.PAUSED) {
            // If still playing or paused, draw the game world and UI
            drawGameWorld();
            drawGameUI();
            if (currentGameState === GAME_STATE.PAUSED) { // Check current state for pause screen
                drawPauseScreen();
            }
        } else if (currentGameState === GAME_STATE.GAME_OVER) {
            // If gameLogicUpdate changed state to GAME_OVER, draw game over screen immediately
            // This prevents drawing the game world/UI with a potentially "dead" player state
            // before the next frame's main GAME_OVER branch is hit.
            drawGameOverScreen();
        }
        // Note: If state changed to something else (e.g. MAIN_MENU directly from gameLogicUpdate, though not current design)
        // it would be handled by the next frame's draw() cycle.
    }
}

function gameLogicUpdate() {
    checkMultiplierReset();
    handleEnemyMerging();

    if (millis() - lastSpawnTime > spawnInterval) {
        spawnEnemy();
        lastSpawnTime = millis();
    }
    if (millis() - lastAsteroidSpawnTime > ASTEROID_SETTINGS.SPAWN_INTERVAL) {
        spawnAsteroid();
    }
    // Phasing out playerLevel based boss spawn, might need alternative trigger
    // if (playerLevel >= GAME_SETTINGS.BOSS_SPAWN_LEVEL && !bossSpawnedThisGame && !enemies.find(e => e.isBoss)) {
    //     spawnBoss();
    // }
    // Temporary boss spawn condition (e.g., after a certain score or time)
    if (score > 5000 && !bossSpawnedThisGame && !enemies.find(e => e.isBoss) && playerLevel >= GAME_SETTINGS.BOSS_SPAWN_LEVEL) {
         spawnBoss(); // This function will now also handle playing boss music
    }

    // Check if boss was defeated to switch back to game music
    // This relies on the boss's die() method setting bossSpawnedThisGame = false
    if (currentTrack === bossMusic && !enemies.find(e => e.isBoss)) {
        playMusic(gameMusic);
        // bossSpawnedThisGame is already set to false by the boss's die() method.
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
        asteroids[i].update();
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        if (bullets[i].isOffscreen()) bullets.splice(i, 1);
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (!enemies[i]) continue;
        enemies[i].update();
        if (enemies[i].isOffscreen()) enemies.splice(i, 1);
    }

    if (player) player.update();
    if (isShooting && player) player.shoot();

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        if (!b) continue;

        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            if (!e || b.hitEnemies.has(e)) continue;
            if (dist(b.pos.x, b.pos.y, e.pos.x, e.pos.y) < b.radius + e.radius) {
                e.takeDamage(b.damage);
                createExplosion(b.pos.x, b.pos.y, 5, b.color, 0.6);
                if (b.onHitEnemy(e)) {
                    bullets.splice(i, 1);
                    break;
                }
            }
        }
        if (!bullets[i]) continue;

        for (let j = asteroids.length - 1; j >= 0; j--) {
            let a = asteroids[j];
            if (!a) continue;
            if (dist(b.pos.x, b.pos.y, a.pos.x, a.pos.y) < b.radius + a.radius) {
                a.takeDamage(b.damage);
                createExplosion(b.pos.x, b.pos.y, 3, a.color, 0.5);
                bullets.splice(i, 1);
                break;
            }
        }
    }

    if (player && !player.invulnerable) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            if (!e) continue;
            if (dist(player.pos.x, player.pos.y, e.pos.x, e.pos.y) < player.radius + e.radius) {
                e.takeDamage(100 + player.bulletDamage * 50);
                if (player.hit()) { // player.hit() now returns true if game over
                    return; // Exit gameLogicUpdate immediately if game is over
                }
                if (!player) break; 
            }
        }
        if (player) { 
            for (let i = asteroids.length - 1; i >= 0; i--) {
                let a = asteroids[i];
                if (!a) continue;
                if (dist(player.pos.x, player.pos.y, a.pos.x, a.pos.y) < player.radius + a.radius) {
                    if (player.hit()) { 
                        return; 
                    }
                    a.takeDamage(5);
                    if (player) { 
                         player.vel.mult(-0.5).add(p5.Vector.sub(player.pos, a.pos).setMag(2));
                    }
                    screenShakeMagnitude = max(screenShakeMagnitude, 5);
                    if (!player) break; 
                }
            }
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        if (!e) continue;
        for (let j = asteroids.length - 1; j >= 0; j--) {
            let a = asteroids[j];
            if (!a) continue;
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
    if (player) player.draw();
    for (let b of bullets) b.draw();
}

function initGame() {
    bullets = [];
    enemies = [];
    particles = [];
    pickups = [];
    asteroids = [];

    player = new Player(width / 2, height / 2);
    player.applyUpgrades(); 
    player.bombs = player.maxBombs;

    score = 0;
    playerLives = 3; 
    lastSpawnTime = millis();
    spawnInterval = GAME_SETTINGS.INITIAL_SPAWN_INTERVAL;
    lastAsteroidSpawnTime = millis();
    bossSpawnedThisGame = false;
    screenShakeMagnitude = 0;
    resetMultiplier();
    player.startInvulnerability();
    currentGameState = GAME_STATE.PLAYING;
    playMusic(gameMusic);
}

// --- Music Control ---
function playMusic(trackToPlay) {
    if (!trackToPlay) {
        console.warn("playMusic called with undefined track");
        return;
    }

    if (currentTrack && currentTrack.isPlaying()) {
        if (currentTrack === trackToPlay) return; 
        currentTrack.stop();
    }
    
    trackToPlay.loop();
    currentTrack = trackToPlay;
}

function stopAllMusic() {
    if (currentTrack && currentTrack.isPlaying()) {
        currentTrack.stop();
    }
    currentTrack = null;
}

// --- Input Handling ---
function keyPressed() {
    if (currentGameState === GAME_STATE.GAME_OVER) {
        if (keyCode === ENTER || keyCode === RETURN) {
            saveGameData();
            if (settingsHighScoreInput) settingsHighScoreInput.hide();
            if (settingsCreditsInput) settingsCreditsInput.hide();
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
        }
        return;
    }
    if (currentGameState === GAME_STATE.STORE_SCREEN) {
        if (keyCode === ESCAPE) {
            if (settingsHighScoreInput) settingsHighScoreInput.hide();
            if (settingsCreditsInput) settingsCreditsInput.hide();
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
        }
        return;
    }
    if (currentGameState === GAME_STATE.HOW_TO_PLAY) {
        if (keyCode === ESCAPE) {
            if (settingsHighScoreInput) settingsHighScoreInput.hide();
            if (settingsCreditsInput) settingsCreditsInput.hide();
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
        }
        return;
    }
    if (currentGameState === GAME_STATE.SETTINGS_SCREEN) {
        if (keyCode === ESCAPE) {
            if (settingsHighScoreInput) settingsHighScoreInput.hide();
            if (settingsCreditsInput) settingsCreditsInput.hide();
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
        }
        return; 
    }
    if (currentGameState === GAME_STATE.MAIN_MENU) return;

    if (keyCode === 80) { // 'P'
        if (currentGameState === GAME_STATE.PLAYING) {
            currentGameState = GAME_STATE.PAUSED;
            setupPauseMenu(); 
        } else if (currentGameState === GAME_STATE.PAUSED) {
            currentGameState = GAME_STATE.PLAYING;
        }
    }

    if (currentGameState !== GAME_STATE.PLAYING) return;

    if (keyCode === 87 || keyCode === UP_ARROW) moveUp = true;
    if (keyCode === 83 || keyCode === DOWN_ARROW) moveDown = true;
    if (keyCode === 65 || keyCode === LEFT_ARROW) moveLeft = true;
    if (keyCode === 68 || keyCode === RIGHT_ARROW) moveRight = true;

    if (keyCode === 32 && player) player.useBomb();

    if (debugMode) { 
        if (keyCode === 75) playerCredits += 100; 
        if (keyCode === 78) enemies.push(new SplitterEnemy(mouseX, mouseY));
        if (keyCode === 77) pickups.push(new Pickup(mouseX, mouseY, PICKUP_TYPE.SHIELD));
        if (keyCode === 66) spawnBoss();
    }
}

function keyReleased() {
    if (keyCode === 87 || keyCode === UP_ARROW) moveUp = false;
    if (keyCode === 83 || keyCode === DOWN_ARROW) moveDown = false;
    if (keyCode === 65 || keyCode === LEFT_ARROW) moveLeft = false;
    if (keyCode === 68 || keyCode === RIGHT_ARROW) moveRight = false;
}

function mousePressed(event) {
    if (currentGameState === GAME_STATE.WELCOME_SCREEN) {
        if (getAudioContext().state !== 'running') {
            userStartAudio(); // Ensure audio context is started on first interaction
        }
        for (let btn of welcomeScreenButtons) {
            if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) {
                if (!btn.disabled) {
                    btn.action();
                }
                return false; // Prevent default
            }
        }
        return false; // Prevent default even if no button clicked
    } else if (currentGameState === GAME_STATE.MAIN_MENU) {
        if (getAudioContext().state !== 'running') {
            userStartAudio();
        }
        if (!currentTrack || !currentTrack.isPlaying() || currentTrack !== menuMusic) {
            playMusic(menuMusic);
        }
        for (let btn of menuButtons) { 
            if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) {
                btn.action();
                return false; // Prevent default
            }
        }
        return false; // Prevent default even if no button clicked on this screen
    }

    if (currentGameState === GAME_STATE.STORE_SCREEN) {
        for (let btn of storeButtons) {
            let actualButtonY;
            if (btn.isFixed) {
                actualButtonY = btn.y;
            } else {
                actualButtonY = _storeUISetupData.listStartY + btn.originalY - storeScrollY;
            }

            if (mouseX > btn.x && mouseX < btn.x + btn.w && 
                mouseY > actualButtonY && mouseY < actualButtonY + btn.h) {
                
                if (!btn.isFixed) {
                    if (mouseY < _storeUISetupData.listStartY || mouseY > _storeUISetupData.listStartY + _storeUISetupData.listVisibleHeight) {
                        continue; 
                    }
                }
                
                let isDisabled = typeof btn.disabled === 'function' ? btn.disabled() : btn.disabled;
                if (!isDisabled) {
                    btn.action();
                }
                return false; // Prevent default whether button was enabled or disabled but clicked
            }
        }
        // If click was not on a button in store screen, still prevent default
        if (mouseY > _storeUISetupData.listStartY && mouseY < _storeUISetupData.listStartY + _storeUISetupData.listVisibleHeight) {
            // Click was within scrollable area but not on a button, could be for dragging scrollbar (if implemented)
            // For now, just prevent default.
             return false;
        }
        // If click was outside scrollable area (e.g. header/footer of store), also prevent default.
        return false;
    }

    if (currentGameState === GAME_STATE.HOW_TO_PLAY) {
        for (let btn of howToPlayButtons) {
            if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) {
                btn.action(); 
                return false; // Prevent default
            }
        }
        return false; // Prevent default even if no button clicked
    }

    if (currentGameState === GAME_STATE.SETTINGS_SCREEN) {
        let clickedOnCanvasButton = false;
        for (let btn of settingsButtons) {
            if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) {
                if (!btn.disabled) {
                    btn.action();
                }
                clickedOnCanvasButton = true;
                return false; // Prevent default for canvas button interactions
            }
        }
        // If the click was not on a canvas button, allow default behavior for DOM elements.
        // This means if event.target is one of the DOM inputs, its default action will proceed.
        // If it's on the canvas but not a button, and no inputs are active, this return allows default (which is usually nothing for canvas).
        // To be absolutely sure no canvas selection happens if not on a button or DOM element:
        if (!clickedOnCanvasButton && 
            !(settingsHighScoreInput && settingsHighScoreInput.elt === event.target) && 
            !(settingsCreditsInput && settingsCreditsInput.elt === event.target) && 
            !(settingsVolumeSlider && settingsVolumeSlider.elt === event.target)) {
            // This condition means the click was on the canvas but not on a p5 button OR a DOM element.
            // return false; // Uncomment this if you want to prevent selection even on empty canvas parts of settings.
                           // For now, allowing default here is fine as it doesn't typically cause selection if not dragging.
        }
        return; // Allow default for DOM elements or unhandled canvas clicks in settings
    }
    
    if (currentGameState === GAME_STATE.PAUSED) {
        for (let btn of pauseMenuButtons) {
            if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) {
                btn.action();
                return false; // Prevent default
            }
        }
        return false; // Prevent default even if no button clicked
    }
    
    if (currentGameState === GAME_STATE.GAME_OVER) {
        // No interactive elements other than keyPressed, so allow default or return false.
        // Returning false is safer to prevent any accidental selection.
        return false;
    }

    if (currentGameState === GAME_STATE.PLAYING && mouseButton === LEFT) {
        isShooting = true;
        return false; // Prevent text selection when clicking to shoot
    }
    // Default catch-all if no other state handled it, to prevent selection.
    // However, be cautious if there are other intended default browser interactions.
    // For a full canvas game, this is generally safe.
    return false; 
}

function mouseReleased() {
    if (mouseButton === LEFT) {
        isShooting = false;
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    if (currentGameState === GAME_STATE.WELCOME_SCREEN || currentGameState === GAME_STATE.MAIN_MENU || currentGameState === GAME_STATE.STORE_SCREEN || currentGameState === GAME_STATE.HOW_TO_PLAY || currentGameState === GAME_STATE.SETTINGS_SCREEN) {
        if (settingsHighScoreInput) settingsHighScoreInput.hide();
        if (settingsCreditsInput) settingsCreditsInput.hide();

        if (currentGameState === GAME_STATE.WELCOME_SCREEN) setupWelcomeScreen();

        if (currentGameState === GAME_STATE.MAIN_MENU) setupMainMenu();
        if (currentGameState === GAME_STATE.STORE_SCREEN) setupStoreScreen(); // This will re-calc _storeUISetupData
        if (currentGameState === GAME_STATE.HOW_TO_PLAY) setupHowToPlayScreen();
        if (currentGameState === GAME_STATE.SETTINGS_SCREEN) setupSettingsScreen(); 
    }
    if (player && (currentGameState === GAME_STATE.PLAYING || currentGameState === GAME_STATE.PAUSED)) {
        player.pos.x = constrain(player.pos.x, player.radius, width - player.radius);
        player.pos.y = constrain(player.pos.y, player.radius, height - player.radius);
    }
}

// p5.js built-in function that is called when mouse wheel is used
function mouseWheel(event) {
  if (mouseWheelStoreScreen(event)) {
    return false; // Prevent default browser scrolling if event was handled by store screen
  }
  // Add other mouse wheel handling here if needed for other game states
}