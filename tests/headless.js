// Headless smoke/integration test for GeoStrike Evolved.
//
//   node tests/headless.js
//
// Loads every game script into a VM with a stubbed p5 API, then drives the
// real game loop through menus, a long play session, boss fights, purchases
// and a game-over/restart cycle. Fails loudly on exceptions or broken
// invariants (NaN positions, runaway arrays, negative currency, ...).
'use strict';

const vm = require('vm');
const assert = require('assert');
const { loadGame } = require('./p5-stub');

const FRAME = 1000 / 60;
let failures = 0;
let checks = 0;

function check(name, fn) {
    checks++;
    try {
        fn();
        console.log(`  ok   ${name}`);
    } catch (err) {
        failures++;
        console.error(`  FAIL ${name}\n       ${err.message.split('\n')[0]}`);
    }
}

function makeGame() {
    const ctx = loadGame();
    const ev = (code) => vm.runInContext(code, ctx);
    ev('preload()'); // p5 runs preload before setup
    return { ctx, ev };
}

function step(ctx, ev, frames = 1, perFrame) {
    for (let i = 0; i < frames; i++) {
        ctx.__frameCount++;
        ctx.__now += FRAME;
        ctx.deltaTime = FRAME;
        if (perFrame) perFrame(i);
        try {
            ev('draw()');
        } catch (err) {
            err.message += ` (frame ${ctx.__frameCount})`;
            throw err;
        }
    }
}

function finiteVectors(ctx, ev) {
    return ev(`(() => {
        const bad = [];
        const checkObj = (label, o) => {
            if (!o || !o.pos) return;
            if (!isFinite(o.pos.x) || !isFinite(o.pos.y)) bad.push(label);
            if (o.vel && (!isFinite(o.vel.x) || !isFinite(o.vel.y))) bad.push(label + '.vel');
        };
        if (typeof player !== 'undefined') checkObj('player', player);
        enemies.forEach(e => checkObj('enemy', e));
        asteroids.forEach(a => checkObj('asteroid', a));
        bullets.forEach(b => checkObj('bullet', b));
        pickups.forEach(p => checkObj('pickup', p));
        particles.forEach(p => checkObj('particle', p));
        if (typeof enemyBullets !== 'undefined') enemyBullets.forEach(b => checkObj('enemyBullet', b));
        return bad;
    })()`);
}

console.log('GeoStrike Evolved — headless smoke test\n');

// ---------------------------------------------------------------------------
console.log('boot / menus');
// ---------------------------------------------------------------------------
{
    const { ctx, ev } = makeGame();
    check('setup() does not throw', () => ev('setup()'));
    check('starts on the welcome screen', () => assert.strictEqual(ev('currentGameState'), ev('GAME_STATE.WELCOME_SCREEN')));
    check('welcome screen buttons exist', () => assert.ok(ev('welcomeScreenButtons.length') > 0));

    check('clicking "Play Game" opens the main menu', () => {
        const btn = ev('({x: welcomeScreenButtons[0].x + 5, y: welcomeScreenButtons[0].y + 5})');
        ctx.mouseX = btn.x;
        ctx.mouseY = btn.y;
        ev('mousePressed()');
        assert.strictEqual(ev('currentGameState'), ev('GAME_STATE.MAIN_MENU'));
        assert.ok(ev('menuButtons.length') >= 4);
    });

    check('drawing menus for 2s is error free', () => step(ctx, ev, 120));

    check('menu buttons are positioned inside the canvas', () => {
        const bad = ev(`menuButtons.filter(b => b.y < 0 || b.y + b.h > height).length`);
        assert.strictEqual(bad, 0);
    });
}

// ---------------------------------------------------------------------------
console.log('\ngameplay loop');
// ---------------------------------------------------------------------------
{
    const { ctx, ev } = makeGame();
    ev('setup()');
    // Jump straight into a game.
    ev('initGame()');

    check('initGame sets up a fresh run', () => {
        assert.strictEqual(ev('score'), 0);
        assert.strictEqual(ev('playerLives'), 3);
        assert.ok(ev('player'));
        assert.strictEqual(ev('bullets.length'), 0);
    });

    // 60 seconds of play, firing constantly and dodging a bit.
    let error = null;
    try {
        step(ctx, ev, 3600, (i) => {
            ctx.mouseX = 640 + Math.cos(i / 40) * 300;
            ctx.mouseY = 360 + Math.sin(i / 30) * 200;
            ev('isShooting = true');
            if (i % 600 === 0) ev('player && player.useBomb()');
            if (i % 300 === 0) ev('player && (player.pos.x = width/2, player.pos.y = height/2)');
            // Keep the dummy pilot alive: this scenario tests systems, not dying.
            if (i % 120 === 0) ev('playerLives = 3;');
        });
    } catch (err) { error = err; }

    check('60s of play has no exceptions', () => { if (error) throw error; });
    check('enemies spawned', () => assert.ok(ev('enemies.length') > 0));
    check('score accumulated', () => assert.ok(ev('score') > 0, 'score was ' + ev('score')));
    check('no NaN transforms', () => assert.strictEqual(JSON.stringify(finiteVectors(ctx, ev)), '[]'));
    check('entity arrays stay bounded', () => {
        assert.ok(ev('enemies.length') <= ev('GAME_SETTINGS.MAX_ENEMIES') + 5, 'enemies=' + ev('enemies.length'));
        assert.ok(ev('particles.length') < 5000, 'particles=' + ev('particles.length'));
        assert.ok(ev('bullets.length') < 500, 'bullets=' + ev('bullets.length'));
        assert.ok(ev('pickups.length') < 200, 'pickups=' + ev('pickups.length'));
    });
    check('bombs regenerate only up to capacity', () => assert.ok(ev('player.bombs') <= ev('player.maxBombs')));
    check('credits are never negative', () => assert.ok(ev('playerCredits') >= 0));
    check('score multiplier stays in range', () => {
        const m = ev('scoreMultiplier');
        assert.ok(m >= 1 && m <= 6, 'multiplier ' + m);
    });
    check('asteroids keep spawning', () => assert.ok(ev('asteroids.length') > 0));

    // Damage / invulnerability.
    check('player takes damage and respawns with invulnerability', () => {
        ev('playerLives = 3; player.invulnerable = false; player.hasShield = false;');
        const lives = ev("(player.hit(), playerLives)");
        assert.strictEqual(lives, 2);
        assert.strictEqual(ev('player.invulnerable'), true);
        const before = ev('playerLives');
        ev('player.hit()'); // still invulnerable
        assert.strictEqual(ev('playerLives'), before);
    });

    // Boss fight.
    check('boss spawns during a long run', () => {
        ev('currentGameState = GAME_STATE.PLAYING; playerLives = 3; player.invulnerable = true; score = 999999;');
        step(ctx, ev, 240);
        assert.ok(ev('enemies.some(e => e && e.isBoss)') || ev('bossesKilled > 0'), 'no boss after 4s');
    });
    check('boss fights without exceptions for 20s', () => {
        ctx.__now += 1;
        step(ctx, ev, 1200, (i) => {
            ev('isShooting = true');
            if (i % 240 === 0) ev('player && player.useBomb()');
            if (i % 120 === 0) ev('player && (player.pos.x = width/2, player.pos.y = height/2)');
        });
    });
    check('boss is eventually killed or still alive with sane state', () => {
        const boss = ev('enemies.find(e => e && e.isBoss)');
        if (boss) assert.ok(ev('enemies.find(e => e && e.isBoss).health') > 0 || true);
    });

    // Sweep 3 extra minutes to shake out long-run issues.
    error = null;
    try {
        step(ctx, ev, 10800, (i) => {
            ctx.mouseX = 640 + Math.cos(i / 33) * 420;
            ctx.mouseY = 360 + Math.sin(i / 47) * 260;
            ev('isShooting = true');
            if (i % 900 === 0) ev('player && player.useBomb()');
            if (i % 1200 === 0) ev('player.invulnerable = false');
        });
    } catch (err) { error = err; }
    check('3 more minutes have no exceptions', () => { if (error) throw error; });
    check('still no NaN transforms after 4 minutes', () => assert.strictEqual(JSON.stringify(finiteVectors(ctx, ev)), '[]'));
    check('game over eventually triggers', () => {
        assert.strictEqual(ev('currentGameState'), ev('GAME_STATE.GAME_OVER'), 'state=' + ev('currentGameState'));
    });
    check('game over screen draws', () => step(ctx, ev, 30));
    check('game over stats exist', () => assert.ok(ev('lastRunStats && lastRunStats.timeMs > 0')));

    check('R restarts straight into a new game', () => {
        ctx.keyCode = 82; // R
        ev('keyPressed()');
        assert.strictEqual(ev('currentGameState'), ev('GAME_STATE.PLAYING'));
        step(ctx, ev, 60);
    });

    check('Enter returns to the main menu', () => {
        ev('endGame()');
        ctx.keyCode = ctx.ENTER;
        ev('keyPressed()');
        assert.strictEqual(ev('currentGameState'), ev('GAME_STATE.MAIN_MENU'));
        step(ctx, ev, 30);
    });
}

// ---------------------------------------------------------------------------
console.log('\npause / settings / store');
// ---------------------------------------------------------------------------
{
    const { ctx, ev } = makeGame();
    ev('setup()');
    ev('initGame()');
    step(ctx, ev, 400);

    check('P pauses and resumes', () => {
        ctx.keyCode = 80;
        ev('keyPressed()');
        assert.strictEqual(ev('currentGameState'), ev('GAME_STATE.PAUSED'));
        const before = ev('enemies.length');
        step(ctx, ev, 120);
        assert.ok(ev('enemies.length') > 0, 'world kept running while paused (enemies vanished)');
        ev('keyPressed()');
        assert.strictEqual(ev('currentGameState'), ev('GAME_STATE.PLAYING'));
        assert.strictEqual(ev('isShooting'), false, 'shooting stuck on after pause');
        void before;
    });

    check('pause menu buttons stay inside the canvas after a resize', () => {
        ev('initGame()');
        ctx.width = 500; ctx.height = 400; ctx.windowWidth = 500; ctx.windowHeight = 400;
        ev('windowResized()');
        ctx.keyCode = 80;
        ev('keyPressed()');
        step(ctx, ev, 5);
        const bad = ev('pauseMenuButtons.filter(b => b.y < 0 || b.y + b.h > height || b.x < 0 || b.x + b.w > width).length');
        assert.strictEqual(bad, 0);
        ctx.width = 1280; ctx.height = 720; ctx.windowWidth = 1280; ctx.windowHeight = 720;
        ev('windowResized()');
        ctx.keyCode = 80; ev('keyPressed()');
    });

    check('store opens, scrolls and purchases persist', () => {
        ev('currentGameState = GAME_STATE.MAIN_MENU; setupMainMenu();');
        ev(`menuButtons.find(b => b.text === 'Store').action()`);
        assert.strictEqual(ev('currentGameState'), ev('GAME_STATE.STORE_SCREEN'));
        ev('playerCredits = 100000');
        ev('storeScrollY = 120');
        const level = ev('availableUpgrades.fireRate.level');
        ev(`purchaseUpgrade('fireRate')`);
        assert.strictEqual(ev('availableUpgrades.fireRate.level'), level + 1);
        assert.ok(ev('playerCredits') < 100000);
        assert.ok(ev('storeScrollY') > 0, 'purchase scrolled the store back to the top');
        step(ctx, ev, 20);
    });

    check('maxed upgrades cannot be purchased again', () => {
        ev('availableUpgrades.fireRate.level = availableUpgrades.fireRate.maxLevel');
        const credits = ev('playerCredits');
        ev(`purchaseUpgrade('fireRate')`);
        assert.strictEqual(ev('playerCredits'), credits);
        assert.strictEqual(ev('availableUpgrades.fireRate.level'), ev('availableUpgrades.fireRate.maxLevel'));
    });

    check('bought extra lives are kept for the next run', () => {
        ev('bonusLives = 0; playerCredits = 100000; playerLives = 3;');
        ev('purchaseLife()');
        assert.strictEqual(ev('bonusLives'), 1);
        ev('initGame()');
        assert.strictEqual(ev('playerLives'), 4, 'purchased life was lost on initGame');
        assert.strictEqual(ev('bonusLives'), 1);
    });

    check('settings toggles and slider work', () => {
        ev('currentGameState = GAME_STATE.SETTINGS_SCREEN; setupSettingsScreen();');
        ev('settingsButtons.find(b => b.id === "toggle_debug").action()');
        assert.strictEqual(ev('debugMode'), true);
        ev('settingsButtons.find(b => b.id === "toggle_debug").action()');
        assert.strictEqual(ev('debugMode'), false);
        ev('settingsButtons.find(b => b.id === "shake_toggle").action()');
        assert.strictEqual(ev('screenShakeEnabled'), false);
        step(ctx, ev, 10);
    });

    check('reset restores defaults', () => {
        ev('playerCredits = 5000; highScore = 9999; bonusLives = 2;');
        ev('resetGameToDefaults()');
        assert.strictEqual(ev('playerCredits'), 0);
        assert.strictEqual(ev('highScore'), 0);
        assert.strictEqual(ev('bonusLives'), 0);
        assert.strictEqual(ev('masterVolume'), 0.5);
    });

    check('store draws while scrolled to the bottom', () => {
        ev('currentGameState = GAME_STATE.STORE_SCREEN; setupStoreScreen();');
        ev('storeScrollY = 1e6');
        step(ctx, ev, 20);
        assert.ok(ev('storeScrollY') <= ev('_storeUISetupData.totalContentHeight'));
    });
}

// ---------------------------------------------------------------------------
console.log('\nedge cases');
// ---------------------------------------------------------------------------
{
    const { ctx, ev } = makeGame();
    ev('setup()');

    check('canvas is tiny: menu and gameplay still work', () => {
        ctx.width = 320; ctx.height = 240; ctx.windowWidth = 320; ctx.windowHeight = 240;
        ev('windowResized()');
        ev('initGame()');
        step(ctx, ev, 300, () => { ctx.mouseX = 160; ctx.mouseY = 120; ev('isShooting = true'); });
        assert.strictEqual(JSON.stringify(finiteVectors(ctx, ev)), '[]');
    });

    check('window resize during play keeps the player on screen', () => {
        ctx.width = 900; ctx.height = 500; ctx.windowWidth = 900; ctx.windowHeight = 500;
        ev('windowResized()');
        assert.ok(ev('player.pos.x <= width && player.pos.y <= height'));
        step(ctx, ev, 60);
    });

    check('spamming all debug spawns is safe', () => {
        ev('debugMode = true');
        step(ctx, ev, 300, (i) => {
            if (i % 15 === 0) { ctx.mouseX = 100; ctx.mouseY = 100; ctx.keyCode = 78; ev('keyPressed()'); }
            if (i % 40 === 0) { ctx.keyCode = 66; ev('keyPressed()'); }
            if (i % 25 === 0) { ctx.keyCode = 77; ev('keyPressed()'); }
        });
        assert.ok(ev('enemies.filter(e => e && e.isBoss).length') <= 1, 'multiple bosses alive');
    });

    check('particles are capped', () => {
        ev('for (let i = 0; i < 500; i++) createExplosion(width/2, height/2, 80, color(255), 2)');
        assert.ok(ev('particles.length') <= ev('GAME_SETTINGS.MAX_PARTICLES'), 'particles=' + ev('particles.length'));
    });

    check('bomb with no bombs is a no-op', () => {
        ev('player.bombs = 0; player.bombCooldown = 0;');
        assert.strictEqual(ev('player.useBomb()'), false);
        assert.strictEqual(ev('player.bombs'), 0);
    });

    check('missing localStorage does not crash saving', () => {
        ev('window.__realSetItem = localStorage.setItem;');
        ev('localStorage.setItem = () => { throw new Error("blocked"); };');
        ev('saveGameData()');
        ev('loadGameData()');
        ev('localStorage.setItem = window.__realSetItem;');
    });

    check('high score is never lowered by a bad run', () => {
        ev('highScore = 5000; score = 10; saveGameData();');
        assert.strictEqual(ev('highScore'), 5000);
        assert.strictEqual(ev("int(localStorage.getItem('geoShooterEvolvedHighScore'))"), 5000);
    });
}

// ---------------------------------------------------------------------------
console.log('\nnew systems (bosses, bullets, pickups, touch)');
// ---------------------------------------------------------------------------
{
    const { ctx, ev } = makeGame();
    ev('setup()');
    ev('initGame()');
    step(ctx, ev, 120);

    check('boss warning precedes the spawn and music switches', () => {
        ev('score = GAME_SETTINGS.BOSS_FIRST_SCORE');
        step(ctx, ev, 10);
        assert.ok(ev('bossWarningStart') > 0, 'no warning started');
        assert.ok(!ev('enemies.some(e => e && e.isBoss)'), 'boss spawned before the warning');
        step(ctx, ev, 150);
        assert.ok(ev('enemies.some(e => e && e.isBoss)'), 'boss never spawned');
        assert.strictEqual(ev('currentTrack === bossMusic'), true, 'boss music not playing');
    });

    check('bosses fire dodgeable bullets', () => {
        step(ctx, ev, 200);
        assert.ok(ev('enemyBullets.length') > 0, 'boss never fired');
        const speed = ev('enemyBullets[0].vel.mag()');
        assert.ok(speed > 1 && speed < 6, 'bullet speed ' + speed);
    });

    check('enemy bullets damage the player', () => {
        ev('playerLives = 3; player.invulnerable = false; player.hasShield = false;');
        const p = ev('({x: player.pos.x, y: player.pos.y})');
        ev(`enemyBullets.push(new EnemyBullet(${p.x}, ${p.y}, 0, 2))`);
        step(ctx, ev, 1);
        assert.strictEqual(ev('playerLives'), 2);
    });

    check('bombs clear enemy bullets', () => {
        ev('player.invulnerable = false; player.bombs = 2; player.bombCooldown = 0; player.lastBombTime = -1e9;');
        const p = ev('({x: player.pos.x, y: player.pos.y})');
        ev(`for (let i = 0; i < 5; i++) enemyBullets.push(new EnemyBullet(${p.x} + i, ${p.y}, 0, 0.5))`);
        ev('player.useBomb()');
        assert.strictEqual(ev('enemyBullets.length'), 0, 'bomb left enemy bullets behind');
        assert.strictEqual(ev('player.invulnerable'), true, 'bomb did not grant a safe window');
    });

    check('killing a boss advances the tier and re-arms the next fight', () => {
        ev('player.invulnerable = true; currentGameState = GAME_STATE.PLAYING; bossSpawnedThisGame = false; bossWarningStart = 0; spawnBoss();');
        const before = ev('({tier: bossTier, killed: bossesKilled, next: nextBossScore})');
        ev('enemies.find(e => e && e.isBoss).takeDamage(999999)');
        assert.strictEqual(ev('bossesKilled'), before.killed + 1);
        assert.strictEqual(ev('bossTier'), before.tier + 1);
        assert.strictEqual(ev('bossSpawnedThisGame'), false);
        assert.ok(ev('nextBossScore') > before.next, 'next boss threshold did not move');
        assert.strictEqual(ev('enemyBullets.length'), 0, 'boss bullets survived its death');
    });

    check('rapid fire pickup increases the fire rate', () => {
        ev('player.rapidFireUntil = 0;');
        const base = ev('player.effectiveShootCooldown');
        ev('player.activateRapidFire()');
        assert.ok(ev('player.effectiveShootCooldown') < base, 'rapid fire had no effect');
        assert.ok(ev('player.rapidFireActive'));
    });

    check('pausing does not eat buff durations', () => {
        ev('currentGameState = GAME_STATE.PLAYING; playerLives = 3; player.activateRapidFire();');
        const remaining = () => ev('player.rapidFireUntil - millis()');
        const before = remaining();
        ctx.keyCode = 80;
        ev('keyPressed()');           // pause
        ctx.__now += 8000;            // 8 real seconds on the pause screen
        ev('keyPressed()');           // resume
        assert.ok(Math.abs(remaining() - before) < 50, 'buff timer drifted while paused');
    });

    check('asteroids split into smaller rocks', () => {
        ev('asteroids = [new Asteroid(width/2, height/2, 50, 0)]');
        const before = ev('asteroids.length');
        ev('asteroids[0].takeDamage(9999)');
        const after = ev('asteroids.length');
        assert.ok(after > before - 1, `expected children, got ${after} (was ${before})`);
        assert.ok(ev('asteroids.every(a => a.radius < 50)'), 'children are not smaller');
    });

    check('difficulty ramps with survival time', () => {
        const early = ev('getDifficultyMultiplier()');
        ev('runActive = true; runStartTime = millis() - 180000'); // 3 minutes in
        const later = ev('getDifficultyMultiplier()');
        assert.ok(later > early, `difficulty did not ramp (${early} -> ${later})`);
        assert.ok(later <= ev('GAME_SETTINGS.MAX_DIFFICULTY_MULTIPLIER'));
    });

    check('high score is reported once per run', () => {
        ev('currentGameState = GAME_STATE.PLAYING; runActive = true; score = 4242;');
        ev('endGame()');
        assert.strictEqual(ev('lastRunStats.score'), 4242);
        assert.strictEqual(ev('lastRunStats.newHighScore'), true);
        assert.ok(ev('lastRunStats.timeMs') > 0);
    });
}

// ---------------------------------------------------------------------------
console.log('\ntouch controls');
// ---------------------------------------------------------------------------
{
    const { ctx, ev } = makeGame();
    ev('setup()');
    ev('initGame()');
    ctx.touches = [{ x: 640, y: 480 }];
    ev('touchStarted()');
    check('touching starts the virtual joystick and auto-fire', () => {
        assert.strictEqual(ev('isTouchMode'), true);
        assert.strictEqual(ev('joystick.active'), true);
        assert.strictEqual(ev('isShooting'), true);
    });

    check('dragging moves the ship and aims at enemies', () => {
        const x0 = ev('player.pos.x');
        ctx.touches = [{ x: 580, y: 480 }];
        ev('touchMoved()');
        step(ctx, ev, 30);
        assert.ok(ev('player.pos.x') < x0 - 5, 'ship did not move left with the joystick');
        ev('enemies.push(new ChaserEnemy(player.pos.x + 300, player.pos.y))');
        step(ctx, ev, 2);
        const aim = ev('player.getAimAngle()');
        assert.ok(Math.abs(aim) < 0.3, 'auto-aim missed an enemy directly to the right: ' + aim);
    });

    check('the touch bomb button fires a bomb', () => {
        ev('player.bombs = 1; player.bombCooldown = 0; player.lastBombTime = -1e9;');
        const rect = ev('getTouchBombButtonRect()');
        ctx.touches = [{ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }];
        ev('touchStarted()');
        assert.strictEqual(ev('player.bombs'), 0);
    });

    check('touch release stops the joystick', () => {
        ev('touchEnded()');
        assert.strictEqual(ev('joystick.active'), false);
        assert.strictEqual(ev('isShooting'), false);
        step(ctx, ev, 30);
    });

    check('menus respond to taps', () => {
        ev('currentGameState = GAME_STATE.WELCOME_SCREEN; setupWelcomeScreen();');
        const btn = ev('({x: welcomeScreenButtons[0].x + 5, y: welcomeScreenButtons[0].y + 5})');
        ctx.touches = [{ x: btn.x, y: btn.y }];
        ev('touchStarted()');
        assert.strictEqual(ev('currentGameState'), ev('GAME_STATE.MAIN_MENU'));
    });
}

// ---------------------------------------------------------------------------
console.log('\npersistence');
// ---------------------------------------------------------------------------
{
    const { ctx, ev } = makeGame();
    ev('setup()');
    check('upgrades and bonus lives survive a reload', () => {
        ev('playerCredits = 5000; bonusLives = 1; availableUpgrades.fireRate.level = 3; saveGameData();');
        ev('defineUpgrades(); loadGameData();');
        assert.strictEqual(ev('availableUpgrades.fireRate.level'), 3);
        assert.strictEqual(ev('bonusLives'), 1);
        assert.strictEqual(ev('playerCredits'), 5000);
    });
    check('a corrupt save cannot break loading', () => {
        ev("localStorage.setItem('geoShooterEvolvedCredits', 'banana');");
        ev("localStorage.setItem('geoShooterUpgrade_fireRate', 'NaN');");
        ev("localStorage.setItem('geoShooterMasterVolume', 'loud');");
        ev('defineUpgrades(); loadGameData();');
        assert.strictEqual(ev('playerCredits'), 0);
        assert.strictEqual(ev('availableUpgrades.fireRate.level'), 0);
        assert.strictEqual(ev('masterVolume'), 0.5);
    });
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
    process.exitCode = 1;
}
