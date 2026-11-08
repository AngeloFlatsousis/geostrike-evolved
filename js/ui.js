// --- Shared UI helpers -----------------------------------------------------
const UI_COLORS = {
    panel: () => color(16, 28, 48, 225),
    panelStroke: () => color(64, 96, 140),
    button: () => color(58, 72, 112, 225),
    buttonHover: () => color(92, 120, 178, 240),
    buttonDisabled: () => color(58, 58, 68, 190),
    accent: () => color(0, 180, 255),
    text: () => color(232, 238, 255),
    textDim: () => color(170, 185, 215),
    gold: () => color(255, 214, 92),
    good: () => color(120, 235, 150),
    bad: () => color(255, 110, 110),
};

function isMouseOver(x, y, w, h) {
    return mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
}

function drawButton(btn, options = {}) {
    const isDisabled = typeof btn.disabled === 'function' ? btn.disabled() : !!btn.disabled;
    const hover = !isDisabled && isMouseOver(btn.x, btn.y, btn.w, btn.h);
    const label = typeof btn.text === 'function' ? btn.text() : btn.text;

    let fillColor = options.fill || UI_COLORS.button();
    if (isDisabled) fillColor = options.disabledFill || UI_COLORS.buttonDisabled();
    else if (hover) fillColor = options.hoverFill || UI_COLORS.buttonHover();

    fill(fillColor);
    stroke(isDisabled ? color(90, 90, 105) : (hover ? 255 : color(150, 175, 210)));
    strokeWeight(hover ? 2.5 : 1.5);
    rect(btn.x, btn.y, btn.w, btn.h, options.radius !== undefined ? options.radius : 8);

    noStroke();
    fill(isDisabled ? color(150, 152, 165) : (hover ? color(255) : color(226, 232, 248)));
    textAlign(CENTER, CENTER);
    textSize(options.textSize || 18);
    text(label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    return hover;
}

function drawPanel(x, y, w, h, title = null) {
    fill(UI_COLORS.panel());
    stroke(UI_COLORS.panelStroke());
    strokeWeight(1.5);
    rect(x, y, w, h, 12);
    if (title) {
        noStroke();
        fill(UI_COLORS.text());
        textAlign(LEFT, CENTER);
        textSize(18);
        text(title, x + 18, y + 22);
    }
}

function drawProgressBar(x, y, w, h, ratio, barColor, backgroundColor) {
    noStroke();
    fill(backgroundColor || color(30, 40, 60, 200));
    rect(x, y, w, h, h / 2);
    fill(barColor);
    const filled = constrain(ratio, 0, 1) * w;
    if (filled > 1) rect(x, y, filled, h, h / 2);
}

// --- Welcome Screen --------------------------------------------------------
function setupWelcomeScreen() {
    welcomeScreenButtons = [];
    hideSettingsDomElements();
    if (typeof emailInput !== 'undefined' && emailInput) emailInput.remove();
    if (typeof passwordInput !== 'undefined' && passwordInput) passwordInput.remove();

    const btnW = min(280, width * 0.6);
    const btnH = 64;
    const startY = height * 0.5;

    welcomeScreenButtons.push({
        x: width / 2 - btnW / 2, y: startY,
        w: btnW, h: btnH,
        text: "PLAY",
        action: () => {
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
            playSfx('uiClick');
        }
    });
}

function drawWelcomeScreen() {
    const titleSize = constrain(width * 0.085, 32, 76);
    push();
    textAlign(CENTER, CENTER);
    textSize(titleSize);
    fill(240, 250, 255);
    stroke(0, 150, 255);
    strokeWeight(4);
    text("GeoStrike Evolved", width / 2, height * 0.24);
    noStroke();

    textSize(constrain(width * 0.022, 14, 24));
    fill(170, 200, 235);
    text("Survive the geometric onslaught", width / 2, height * 0.34);

    textSize(16);
    fill(150, 175, 210);
    text("Best: " + highScore + "    ·    Credits: " + playerCredits, width / 2, height * 0.41);

    for (const btn of welcomeScreenButtons) {
        drawButton(btn, { textSize: 26 });
    }

    textSize(13);
    fill(120, 140, 170);
    text("Click / tap to begin", width / 2, welcomeScreenButtons[0].y + welcomeScreenButtons[0].h + 28);
    pop();
}

// --- Main Menu -------------------------------------------------------------
function setupMainMenu() {
    menuButtons = [];
    hideSettingsDomElements();

    const btnW = min(280, width * 0.64);
    const btnH = constrain(height * 0.082, 44, 60);
    const spacing = 16;
    const startY = height * 0.42;

    const addButton = (text, action) => {
        menuButtons.push({
            x: width / 2 - btnW / 2,
            y: startY + menuButtons.length * (btnH + spacing),
            w: btnW, h: btnH, text, action,
        });
    };

    addButton("Start Game", () => { initGame(); playSfx('uiClick'); });
    addButton("Store", () => {
        currentGameState = GAME_STATE.STORE_SCREEN;
        setupStoreScreen();
        playSfx('uiClick');
    });
    addButton("How To Play", () => {
        currentGameState = GAME_STATE.HOW_TO_PLAY;
        setupHowToPlayScreen();
        playSfx('uiClick');
    });
    addButton("Settings", () => {
        hideSettingsDomElements();
        currentGameState = GAME_STATE.SETTINGS_SCREEN;
        setupSettingsScreen();
        playSfx('uiClick');
    });
}

function drawMainMenu() {
    push();
    textAlign(CENTER, CENTER);
    const titleSize = constrain(width * 0.085, 32, 76);
    textSize(titleSize);
    fill(240, 250, 255);
    stroke(0, 150, 255);
    strokeWeight(4);
    text("GeoStrike Evolved", width / 2, height * 0.19);
    noStroke();

    textSize(constrain(width * 0.022, 14, 24));
    fill(170, 185, 215);
    text("Best: " + highScore + "      Credits: " + playerCredits, width / 2, height * 0.30);

    textSize(14);
    fill(120, 150, 190);
    const livesText = "Lives per run: " + min(PLAYER_SETTINGS.MAX_LIVES, PLAYER_SETTINGS.STARTING_LIVES + bonusLives)
        + " / " + PLAYER_SETTINGS.MAX_LIVES + "      Bosses cleared: " + bossesKilled;
    text(livesText, width / 2, height * 0.35);

    for (const btn of menuButtons) {
        drawButton(btn, { textSize: 24 });
    }

    textSize(12);
    fill(110, 130, 160);
    textAlign(CENTER, BOTTOM);
    const footer = "ENTER start  ·  P pause  ·  WASD / arrows move  ·  hold mouse to fire  ·  SPACE bomb";
    text(footer, width / 2 - (width - 30) / 2, height - 38, width - 30, 30);
    pop();
}

// --- How To Play -----------------------------------------------------------
let howToPlayButtons = [];

function setupHowToPlayScreen() {
    howToPlayButtons = [];
    hideSettingsDomElements();
    if (typeof emailInput !== 'undefined' && emailInput) emailInput.remove();
    if (typeof passwordInput !== 'undefined' && passwordInput) passwordInput.remove();
    howToPlayButtons.push({
        x: width / 2 - 100, y: height - 66,
        w: 200, h: 46,
        text: "Back",
        action: () => {
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
            playSfx('uiClick');
        }
    });
}

function drawHowToPlayScreen() {
    push();
    textAlign(CENTER, CENTER);
    textSize(constrain(width * 0.045, 24, 46));
    fill(230, 240, 255);
    stroke(0, 150, 255);
    strokeWeight(3);
    text("HOW TO PLAY", width / 2, height * 0.075);
    noStroke();

    const contentWidth = min(width * 0.9, 1000);
    const leftX = (width - contentWidth) / 2;
    const colGap = 28;
    const colWidth = (contentWidth - colGap) / 2;
    const top = height * 0.16;
    const available = height - top - 90;
    const lineHeight = constrain(available / 24, 17, 25);

    textAlign(LEFT, TOP);
    textSize(constrain(width * 0.014, 12, 16));

    // Left column
    let y = top;
    const line = (txt, colX = leftX, indent = 0, col = UI_COLORS.textDim()) => {
        fill(col);
        text(txt, colX + indent, y);
        y += lineHeight;
    };
    const heading = (txt, colX = leftX) => {
        y += lineHeight * 0.75;
        fill(UI_COLORS.accent());
        text(txt, colX, y);
        y += lineHeight;
    };

    heading("CONTROLS");
    line("WASD / Arrow keys — move", leftX, 14);
    line("Mouse — aim", leftX, 14);
    line("Hold Left Mouse — fire", leftX, 14);
    line("SPACE — bomb (clears the screen)", leftX, 14);
    line("P / ESC — pause", leftX, 14);
    line("Touch devices: drag to move & auto-fire", leftX, 14);

    heading("OBJECTIVE");
    line("Survive escalating waves, destroy anything that", leftX, 14);
    line("moves, and earn credits for permanent upgrades.", leftX, 14);
    line("Ramming an enemy kills it but costs a life — only", leftX, 14);
    line("worth it when you are invulnerable.", leftX, 14);

    // Right column
    let y2 = top;
    const rightX = leftX + colWidth + colGap;
    const savedY = y;
    const lineR = (txt, indent = 0, col = UI_COLORS.textDim()) => {
        fill(col);
        text(txt, rightX + indent, y2);
        y2 += lineHeight;
    };
    const headingR = (txt) => {
        y2 += lineHeight * 0.75;
        fill(UI_COLORS.accent());
        text(txt, rightX, y2);
        y2 += lineHeight;
    };

    headingR("PICKUPS");
    lineR("B (yellow) — extra bomb", 14);
    lineR("S (blue) — shield absorbs one hit", 14);
    lineR("R (orange) — rapid fire for 8 seconds", 14);

    headingR("SCORE & CREDITS");
    lineR("Kill streaks raise the score multiplier up to x6;", 14);
    lineR("it resets after 2.5s without a kill or when hit.", 14);
    lineR("Spend credits in the Store on permanent upgrades", 14);
    lineR("and extra starting lives.", 14);

    headingR("BOSSES");
    lineR("Every few thousand points a capital ship arrives.", 14);
    lineR("It fires bullet rings and summons escorts — keep", 14);
    lineR("moving and unload everything you have.", 14);

    void savedY;
    for (const btn of howToPlayButtons) drawButton(btn, { textSize: 20 });
    pop();
}

// --- Settings --------------------------------------------------------------
let _settingsUIData = {
    generalSectionY: 0,
    generalSectionHeight: 0,
    debugSectionY: 0,
    debugSectionHeight: 0,
    debugKeysInfoY: 0,
};

function hideSettingsDomElements() {
    if (settingsHighScoreInput) settingsHighScoreInput.hide();
    if (settingsCreditsInput) settingsCreditsInput.hide();
    if (settingsVolumeSlider) settingsVolumeSlider.hide();
}

function setupSettingsScreen() {
    settingsButtons = [];
    hideSettingsDomElements();
    if (typeof emailInput !== 'undefined' && emailInput) emailInput.remove();
    if (typeof passwordInput !== 'undefined' && passwordInput) passwordInput.remove();
    if (settingsHighScoreInput) settingsHighScoreInput.remove();
    if (settingsCreditsInput) settingsCreditsInput.remove();
    if (settingsVolumeSlider) settingsVolumeSlider.remove();
    settingsHighScoreInput = null;
    settingsCreditsInput = null;
    settingsVolumeSlider = null;

    const itemHeight = constrain(height * 0.055, 32, 42);
    const itemSpacing = 12;
    const sectionSpacing = 26;
    const contentWidth = min(width * 0.86, 860);
    const startX = (width - contentWidth) / 2;
    const labelColumnWidth = contentWidth * 0.45;
    const controlColumnX = startX + labelColumnWidth;
    const controlWidth = contentWidth - labelColumnWidth - 24;

    let currentY = height * 0.18;
    const generalSectionY = currentY;
    let items = 0;

    const toggleButton = (id, textFn, action) => {
        settingsButtons.push({
            x: controlColumnX + controlWidth - 130,
            y: currentY,
            w: 130, h: itemHeight,
            text: textFn,
            action: () => { action(); playSfx('uiClick'); },
            id,
        });
        items++;
        currentY += itemHeight + itemSpacing;
    };

    toggleButton("toggle_debug", () => debugMode ? "ON" : "OFF", () => {
        debugMode = !debugMode;
        saveGameData();
        setupSettingsScreen();
    });

    toggleButton("toggle_sfx", () => sfxEnabled ? "ON" : "OFF", () => {
        sfxEnabled = !sfxEnabled;
        updateSfxVolume();
        saveGameData();
    });

    settingsVolumeSlider = createSlider(0, 1, masterVolume, 0.01);
    settingsVolumeSlider.position(controlColumnX, currentY + itemHeight / 2 - 10);
    settingsVolumeSlider.size(controlWidth - 60);
    settingsVolumeSlider.input(() => {
        masterVolume = settingsVolumeSlider.value();
        outputVolume(masterVolume);
        updateSfxVolume();
        saveGameData();
    });
    settingsVolumeSlider.show();
    items++;
    currentY += itemHeight + itemSpacing;

    toggleButton("shake_toggle", () => screenShakeEnabled ? "ON" : "OFF", () => {
        screenShakeEnabled = !screenShakeEnabled;
        saveGameData();
    });

    settingsButtons.push({
        x: controlColumnX + controlWidth - 190,
        y: currentY,
        w: 190, h: itemHeight,
        text: "Reset All Game Data",
        action: () => {
            if (confirm("Are you sure you want to reset all game data? This cannot be undone.")) {
                resetGameToDefaults();
                defineUpgrades();
                loadGameData();
                if (player) player.applyUpgrades();
                setupSettingsScreen();
                if (typeof showStoreToast === 'function') showStoreToast('All progress reset', color(255, 200, 120));
            }
        },
        id: "reset_game_data",
    });
    items++;
    currentY += itemHeight + itemSpacing;

    _settingsUIData.generalSectionY = generalSectionY;
    _settingsUIData.generalSectionHeight = (items * itemHeight) + ((items - 1) * itemSpacing) + 56;

    if (debugMode) {
        // Anchor the debug panel below the general panel instead of stacking
        // offsets by hand, otherwise the two panels overlap.
        const panelTitlePad = 34;
        const generalPanelTop = generalSectionY - panelTitlePad;
        const gap = constrain(height * 0.06, 30, 56);
        currentY = generalPanelTop + _settingsUIData.generalSectionHeight + gap + panelTitlePad;
        _settingsUIData.debugSectionY = currentY;
        let debugItems = 0;

        settingsHighScoreInput = createInput(str(highScore));
        settingsHighScoreInput.position(controlColumnX, currentY + itemHeight / 2 - 10);
        settingsHighScoreInput.size(controlWidth - 120);
        settingsHighScoreInput.show();
        settingsButtons.push({
            x: controlColumnX + controlWidth - 110, y: currentY,
            w: 110, h: itemHeight,
            text: "Set Score",
            action: () => {
                let val = parseInt(settingsHighScoreInput.value(), 10);
                if (!isNaN(val)) { highScore = max(0, val); saveGameData(); }
                settingsHighScoreInput.value(str(highScore));
            },
            id: "set_highscore",
        });
        debugItems++;
        currentY += itemHeight + itemSpacing;

        settingsCreditsInput = createInput(str(playerCredits));
        settingsCreditsInput.position(controlColumnX, currentY + itemHeight / 2 - 10);
        settingsCreditsInput.size(controlWidth - 120);
        settingsCreditsInput.show();
        settingsButtons.push({
            x: controlColumnX + controlWidth - 110, y: currentY,
            w: 110, h: itemHeight,
            text: "Set Credits",
            action: () => {
                let val = parseInt(settingsCreditsInput.value(), 10);
                if (!isNaN(val)) { playerCredits = max(0, val); saveGameData(); }
                settingsCreditsInput.value(str(playerCredits));
            },
            id: "set_credits",
        });
        debugItems++;
        currentY += itemHeight + itemSpacing;

        _settingsUIData.debugSectionHeight = (debugItems * itemHeight) + ((debugItems - 1) * itemSpacing) + 56;
    } else {
        _settingsUIData.debugSectionHeight = 0;
        _settingsUIData.debugSectionY = 0;
    }

    _settingsUIData.debugKeysInfoY = debugMode
        ? _settingsUIData.debugSectionY + _settingsUIData.debugSectionHeight + 14
        : _settingsUIData.generalSectionY + _settingsUIData.generalSectionHeight + 14;

    settingsButtons.push({
        x: width / 2 - 100, y: height - 66,
        w: 200, h: 46,
        text: "Back",
        action: () => {
            hideSettingsDomElements();
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
            playSfx('uiClick');
        },
        id: "back_to_menu",
    });
}

function drawSettingsScreen() {
    push();
    textAlign(CENTER, CENTER);
    textSize(constrain(width * 0.045, 24, 46));
    fill(230, 240, 255);
    text("SETTINGS", width / 2, height * 0.075);

    const itemHeight = constrain(height * 0.055, 32, 42);
    const itemSpacing = 12;
    const contentWidth = min(width * 0.86, 860);
    const startX = (width - contentWidth) / 2;
    const labelColumnWidth = contentWidth * 0.45;
    const labelStartX = startX + 22;

    // General section
    const gY = _settingsUIData.generalSectionY;
    drawPanel(startX, gY - 34, contentWidth, _settingsUIData.generalSectionHeight, "General");

    textAlign(LEFT, CENTER);
    textSize(16);
    let rowY = gY;

    fill(UI_COLORS.textDim());
    text("Enable Debug Mode:", labelStartX, rowY + itemHeight / 2);
    rowY += itemHeight + itemSpacing;

    text("Sound Effects:", labelStartX, rowY + itemHeight / 2);
    rowY += itemHeight + itemSpacing;

    text("Master Volume:", labelStartX, rowY + itemHeight / 2);
    textAlign(RIGHT, CENTER);
    fill(UI_COLORS.text());
    text(nf(masterVolume * 100, 0, 0) + "%", startX + labelColumnWidth + (contentWidth - labelColumnWidth - 24) - 8, rowY + itemHeight / 2);
    textAlign(LEFT, CENTER);
    rowY += itemHeight + itemSpacing;

    fill(UI_COLORS.textDim());
    text("Screen Shake:", labelStartX, rowY + itemHeight / 2);
    rowY += itemHeight + itemSpacing;

    text("Reset All Data:", labelStartX, rowY + itemHeight / 2);

    // Debug section
    if (debugMode && _settingsUIData.debugSectionY > 0) {
        const dY = _settingsUIData.debugSectionY;
        drawPanel(startX, dY - 34, contentWidth, _settingsUIData.debugSectionHeight, "Debug Options");
        textAlign(LEFT, CENTER);
        textSize(16);
        fill(UI_COLORS.textDim());
        text("Set High Score:", labelStartX, dY + itemHeight / 2);
        text("Set Player Credits:", labelStartX, dY + itemHeight + itemSpacing + itemHeight / 2);

        textAlign(CENTER, TOP);
        textSize(13);
        fill(UI_COLORS.textDim());
        text("Debug keys: K +Credits  ·  N spawn Splitter  ·  M spawn Shield  ·  B spawn Boss",
            width / 2, _settingsUIData.debugKeysInfoY);
    }

    for (const btn of settingsButtons) {
        let options = {};
        if (btn.id === "toggle_debug") {
            options = debugMode
                ? { fill: color(60, 150, 70, 225), hoverFill: color(80, 180, 90, 240) }
                : { fill: color(150, 60, 60, 225), hoverFill: color(180, 80, 80, 240) };
        } else if (btn.id === "toggle_sfx") {
            options = sfxEnabled
                ? { fill: color(60, 150, 70, 225), hoverFill: color(80, 180, 90, 240) }
                : { fill: color(150, 60, 60, 225), hoverFill: color(180, 80, 80, 240) };
        } else if (btn.id === "shake_toggle") {
            options = screenShakeEnabled
                ? { fill: color(60, 150, 70, 225), hoverFill: color(80, 180, 90, 240) }
                : { fill: color(150, 60, 60, 225), hoverFill: color(180, 80, 80, 240) };
        } else {
            options = { textSize: btn.id === "back_to_menu" ? 20 : 15 };
        }
        drawButton(btn, options);
    }
    pop();
}

// --- Store -----------------------------------------------------------------
const _storeUISetupData = {
    totalContentHeight: 0,
    listStartY: 0,
    listVisibleHeight: 0,
    startX: 0,
    contentWidth: 0,
    itemEntryHeight: 0,
    itemSpacing: 0,
    buttonWidth: 0,
};

function setupStoreScreen(preserveScroll = false) {
    if (typeof emailInput !== 'undefined' && emailInput) emailInput.remove();
    if (typeof passwordInput !== 'undefined' && passwordInput) passwordInput.remove();
    hideSettingsDomElements();

    if (!preserveScroll) storeScrollY = 0;
    storeButtons = [];

    const previousScroll = storeScrollY;
    const itemEntryHeight = constrain(height * 0.105, 64, 84);
    const buttonWidth = 150;
    const buttonHeight = 34;
    const contentWidth = min(width * 0.92, 1020);
    const startX = (width - contentWidth) / 2;
    const itemSpacing = 10;

    if (typeof availableUpgrades === 'undefined' || Object.keys(availableUpgrades).length === 0) {
        defineUpgrades();
    }

    let currentYOffset = 0;

    for (const key in availableUpgrades) {
        if (!Object.prototype.hasOwnProperty.call(availableUpgrades, key)) continue;
        const upgrade = availableUpgrades[key];
        storeButtons.push({
            originalY: currentYOffset + (itemEntryHeight - buttonHeight) / 2,
            x: startX + contentWidth - buttonWidth - 18,
            w: buttonWidth,
            h: buttonHeight,
            id: `buy_${key}`,
            upgradeKey: key,
            text: () => {
                if (upgrade.level >= upgrade.maxLevel) return "MAXED";
                if (playerCredits < upgrade.getCost()) return `Need ${upgrade.getCost()}`;
                return `Buy — ${upgrade.getCost()}`;
            },
            action: () => {
                if (upgrade.level < upgrade.maxLevel) purchaseUpgrade(key);
            },
            disabled: () => upgrade.level >= upgrade.maxLevel || playerCredits < upgrade.getCost(),
            isFixed: false,
        });
        currentYOffset += itemEntryHeight + itemSpacing;
    }

    const maxBonusLives = PLAYER_SETTINGS.MAX_LIVES - PLAYER_SETTINGS.STARTING_LIVES;
    storeButtons.push({
        originalY: currentYOffset + (itemEntryHeight - buttonHeight) / 2,
        x: startX + contentWidth - buttonWidth - 18,
        w: buttonWidth,
        h: buttonHeight,
        id: "buy_life",
        text: () => {
            if (bonusLives >= maxBonusLives) return "MAXED";
            if (playerCredits < PLAYER_SETTINGS.LIFE_COST) return `Need ${PLAYER_SETTINGS.LIFE_COST}`;
            return `Buy — ${PLAYER_SETTINGS.LIFE_COST}`;
        },
        action: () => {
            if (bonusLives < maxBonusLives) purchaseLife();
        },
        disabled: () => bonusLives >= maxBonusLives || playerCredits < PLAYER_SETTINGS.LIFE_COST,
        isFixed: false,
    });
    currentYOffset += itemEntryHeight + itemSpacing;

    _storeUISetupData.totalContentHeight = currentYOffset - itemSpacing;
    _storeUISetupData.listStartY = height * 0.19;
    const backButtonHeight = 46;
    const bottomPadding = 26;
    _storeUISetupData.listVisibleHeight = max(80, height - _storeUISetupData.listStartY - backButtonHeight - bottomPadding - 10);
    _storeUISetupData.startX = startX;
    _storeUISetupData.contentWidth = contentWidth;
    _storeUISetupData.itemEntryHeight = itemEntryHeight;
    _storeUISetupData.itemSpacing = itemSpacing;
    _storeUISetupData.buttonWidth = buttonWidth;

    storeButtons.push({
        x: width / 2 - 110,
        y: height - backButtonHeight - 14,
        w: 220,
        h: backButtonHeight,
        id: "back_to_main_menu_from_store",
        text: "Back to Menu",
        action: () => {
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
            playSfx('uiClick');
        },
        disabled: () => false,
        isFixed: true,
    });

    // Keep the scroll position sane after the content changed (e.g. after a purchase).
    const maxScroll = max(0, _storeUISetupData.totalContentHeight - _storeUISetupData.listVisibleHeight);
    storeScrollY = preserveScroll ? constrain(previousScroll, 0, maxScroll) : 0;
}

function showStoreToast(text, toastColor) {
    storeToast = { text, color: toastColor || color(255), start: millis() };
}

function drawStoreToast() {
    if (!storeToast) return;
    const elapsed = millis() - storeToast.start;
    const duration = 2200;
    if (elapsed > duration) { storeToast = null; return; }
    const alpha = elapsed > duration - 400 ? map(elapsed, duration - 400, duration, 255, 0, true) : 255;
    push();
    textAlign(CENTER, CENTER);
    textSize(17);
    const w = min(width * 0.8, textWidth(storeToast.text) + 44);
    const x = width / 2 - w / 2;
    const y = _storeUISetupData.listStartY + _storeUISetupData.listVisibleHeight - 46;
    fill(12, 22, 38, alpha * 0.92);
    stroke(red(storeToast.color), green(storeToast.color), blue(storeToast.color), alpha * 0.8);
    strokeWeight(1.5);
    rect(x, y, w, 36, 8);
    noStroke();
    fill(red(storeToast.color), green(storeToast.color), blue(storeToast.color), alpha);
    text(storeToast.text, width / 2, y + 18);
    pop();
}

function drawStoreScreen() {
    push();
    const contentWidth = min(width * 0.92, 1020);
    const startX = (width - contentWidth) / 2;

    textAlign(CENTER, CENTER);
    textSize(constrain(width * 0.04, 22, 42));
    fill(235, 245, 255);
    text("UPGRADE STORE", width / 2, height * 0.07);

    textSize(20);
    fill(UI_COLORS.gold());
    text("Credits: " + floor(playerCredits), width / 2, height * 0.125);

    textSize(13);
    fill(UI_COLORS.textDim());
    text("Permanent upgrades — they apply to every future run", width / 2, height * 0.158);

    const {
        itemEntryHeight, itemSpacing, buttonWidth: upgradeButtonWidth,
        listStartY, listVisibleHeight, totalContentHeight,
    } = _storeUISetupData;
    const textXOffset = 20;

    const maxScroll = max(0, totalContentHeight - listVisibleHeight);
    storeScrollY = constrain(storeScrollY, 0, maxScroll);

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(startX, listStartY, contentWidth, listVisibleHeight);
    drawingContext.clip();

    push();
    translate(0, listStartY - storeScrollY);
    let currentYDraw = 0;

    const drawEntry = (title, levelText, effectText, canBuy) => {
        fill(24, 38, 62, 225);
        stroke(canBuy ? color(70, 100, 150) : color(52, 62, 84));
        strokeWeight(1.5);
        rect(startX, currentYDraw, contentWidth, itemEntryHeight, 10);

        noStroke();
        textAlign(LEFT, TOP);
        fill(UI_COLORS.text());
        textSize(19);
        text(title, startX + textXOffset, currentYDraw + 10);

        textSize(13);
        fill(UI_COLORS.textDim());
        text(levelText, startX + textXOffset, currentYDraw + 34);

        textSize(12);
        fill(canBuy ? color(150, 200, 235) : color(120, 140, 165));
        text(effectText, startX + textXOffset, currentYDraw + 53, contentWidth - upgradeButtonWidth - 60);
    };

    for (const key in availableUpgrades) {
        if (!Object.prototype.hasOwnProperty.call(availableUpgrades, key)) continue;
        const upgrade = availableUpgrades[key];
        const itemTopAbsolute = listStartY + currentYDraw - storeScrollY;
        if (itemTopAbsolute + itemEntryHeight > listStartY && itemTopAbsolute < listStartY + listVisibleHeight) {
            const maxed = upgrade.level >= upgrade.maxLevel;
            const affordable = playerCredits >= upgrade.getCost();
            const effectText = maxed
                ? "Max level reached!"
                : (upgrade.getEffectChangeText ? upgrade.getEffectChangeText() : upgrade.description);
            drawEntry(upgrade.name, `Level ${upgrade.level} / ${upgrade.maxLevel}`, effectText, !maxed && affordable);
        }
        currentYDraw += itemEntryHeight + itemSpacing;
    }

    const lifeTopAbsolute = listStartY + currentYDraw - storeScrollY;
    if (lifeTopAbsolute + itemEntryHeight > listStartY && lifeTopAbsolute < listStartY + listVisibleHeight) {
        const lifeCanBuy = bonusLives < PLAYER_SETTINGS.MAX_LIVES - PLAYER_SETTINGS.STARTING_LIVES;
        drawEntry(
            "Extra Starting Life",
            `Start with ${min(PLAYER_SETTINGS.MAX_LIVES, PLAYER_SETTINGS.STARTING_LIVES + bonusLives)} lives (max ${PLAYER_SETTINGS.MAX_LIVES})`,
            lifeCanBuy ? `Cost: ${PLAYER_SETTINGS.LIFE_COST} credits — permanent for all future runs` : "Maximum extra lives reached",
            lifeCanBuy && playerCredits >= PLAYER_SETTINGS.LIFE_COST
        );
    }

    // Buttons (drawn inside the scrolled/clipped space)
    for (const btn of storeButtons) {
        if (btn.isFixed) continue;
        const buttonScreenY = listStartY + btn.originalY - storeScrollY;
        if (buttonScreenY + btn.h < listStartY || buttonScreenY > listStartY + listVisibleHeight) continue;

        const hover = mouseX > btn.x && mouseX < btn.x + btn.w &&
            mouseY > buttonScreenY && mouseY < buttonScreenY + btn.h;
        const isDisabled = typeof btn.disabled === 'function' ? btn.disabled() : !!btn.disabled;
        const fillColor = isDisabled ? color(62, 62, 74, 200) : (hover ? color(90, 175, 105, 240) : color(62, 140, 78, 225));

        fill(fillColor);
        stroke(isDisabled ? color(90, 90, 105) : (hover ? 235 : 170));
        strokeWeight(1.5);
        rect(btn.x, btn.originalY, btn.w, btn.h, 8);

        noStroke();
        fill(isDisabled ? color(150) : color(245));
        textAlign(CENTER, CENTER);
        textSize(14);
        text(typeof btn.text === 'function' ? btn.text() : btn.text, btn.x + btn.w / 2, btn.originalY + btn.h / 2);
    }

    pop();
    drawingContext.restore();

    // Scrollbar
    if (totalContentHeight > listVisibleHeight) {
        const scrollbarAreaX = startX + contentWidth + 8;
        const trackHeight = listVisibleHeight;
        const handleHeight = max(24, trackHeight * (listVisibleHeight / totalContentHeight));
        const handleY = listStartY + (trackHeight - handleHeight) * (storeScrollY / maxScroll);
        noStroke();
        fill(45, 60, 88, 180);
        rect(scrollbarAreaX, listStartY, 8, trackHeight, 4);
        fill(105, 135, 190, 220);
        rect(scrollbarAreaX, handleY, 8, handleHeight, 4);
    }

    for (const btn of storeButtons) {
        if (!btn.isFixed) continue;
        drawButton(btn, { textSize: 20 });
    }

    drawStoreToast();

    pop();
}

// --- Pause -----------------------------------------------------------------
function setupPauseMenu() {
    pauseMenuButtons = [];
    hideSettingsDomElements();
    const btnW = min(260, width * 0.6);
    const btnH = constrain(height * 0.07, 40, 52);
    const spacing = 14;
    const startY = height / 2 - 10;

    pauseMenuButtons.push({
        x: width / 2 - btnW / 2, y: startY,
        w: btnW, h: btnH,
        text: "Resume",
        action: () => { resumeGame(); playSfx('uiClick'); },
    });
    pauseMenuButtons.push({
        x: width / 2 - btnW / 2, y: startY + btnH + spacing,
        w: btnW, h: btnH,
        text: "Restart Run",
        action: () => { initGame(); playSfx('uiClick'); },
    });
    pauseMenuButtons.push({
        x: width / 2 - btnW / 2, y: startY + 2 * (btnH + spacing),
        w: btnW, h: btnH,
        text: "Main Menu",
        action: () => {
            saveGameData();
            runActive = false;
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
            playSfx('uiClick');
        },
    });
}

function drawPauseScreen() {
    push();
    fill(4, 8, 16, 205);
    rect(0, 0, width, height);

    textAlign(CENTER, CENTER);
    textSize(constrain(width * 0.06, 30, 60));
    fill(240, 248, 255);
    stroke(0, 150, 255);
    strokeWeight(3);
    text("PAUSED", width / 2, height * 0.24);
    noStroke();

    textSize(16);
    fill(UI_COLORS.textDim());
    text(`Score ${score}   ·   ${formatTime(getRunElapsedMs())} survived   ·   ${runKills} kills`,
        width / 2, height * 0.31);

    for (const btn of pauseMenuButtons) drawButton(btn, { textSize: 21 });
    pop();
}

// --- Game over -------------------------------------------------------------
function drawGameOverScreen() {
    push();
    textAlign(CENTER, CENTER);

    const panelW = min(width * 0.86, 640);
    const panelH = min(height * 0.78, 420);
    const px = width / 2 - panelW / 2;
    const py = height / 2 - panelH / 2;

    fill(6, 12, 22, 225);
    stroke(90, 40, 50);
    strokeWeight(2);
    rect(px, py, panelW, panelH, 14);

    noStroke();
    textSize(constrain(width * 0.06, 30, 64));
    fill(255, 235, 235);
    stroke(190, 40, 60);
    strokeWeight(3);
    text("GAME OVER", width / 2, py + panelH * 0.13);
    noStroke();

    const stats = lastRunStats || { score: score, kills: runKills, timeMs: 0, creditsEarned: 0, bossKills: 0, newHighScore: false };

    textSize(constrain(width * 0.028, 18, 34));
    fill(UI_COLORS.text());
    text("Score: " + stats.score, width / 2, py + panelH * 0.29);

    if (stats.newHighScore) {
        textSize(18);
        fill(UI_COLORS.gold());
        text("NEW HIGH SCORE!", width / 2, py + panelH * 0.37);
    } else {
        textSize(16);
        fill(UI_COLORS.textDim());
        text("Best: " + highScore, width / 2, py + panelH * 0.37);
    }

    textSize(16);
    fill(UI_COLORS.textDim());
    const rowY = py + panelH * 0.49;
    text(`Survived ${formatTime(stats.timeMs)}   ·   ${stats.kills} kills   ·   ${stats.bossKills} boss${stats.bossKills === 1 ? '' : 'es'}`, width / 2, rowY);

    fill(UI_COLORS.gold());
    text(`Credits earned: +${stats.creditsEarned}   (total ${floor(playerCredits)})`, width / 2, rowY + 28);

    textSize(17);
    fill(UI_COLORS.text());
    text("Press ENTER for the main menu", width / 2, py + panelH * 0.75);
    textSize(14);
    fill(UI_COLORS.textDim());
    text("or R to jump straight back in", width / 2, py + panelH * 0.84);
    pop();
}

// --- In-game HUD -----------------------------------------------------------
function drawHudPanel(x, y, w, h) {
    noStroke();
    fill(6, 14, 26, 170);
    rect(x, y, w, h, 10);
    stroke(60, 95, 140, 200);
    strokeWeight(1);
    noFill();
    rect(x, y, w, h, 10);
    noStroke();
}

function drawLifeIcon(x, y, size, active) {
    fill(active ? color(0, 190, 255) : color(50, 70, 95));
    noStroke();
    triangle(x - size, y + size * 0.7, x + size, y + size * 0.7, x, y - size);
}

function drawBombIcon(x, y, size, active) {
    fill(active ? color(255, 220, 70) : color(70, 65, 40));
    noStroke();
    ellipse(x, y, size * 2);
}

function drawGameUI() {
    push();
    textAlign(LEFT, TOP);

    // ---- Top-left panel ----
    const panelX = 14;
    const panelY = 14;
    const panelW = min(270, width * 0.56);
    const panelH = 112;
    drawHudPanel(panelX, panelY, panelW, panelH);

    noStroke();
    fill(UI_COLORS.text());
    textSize(constrain(width * 0.02, 18, 26));
    text("SCORE " + score, panelX + 14, panelY + 10);

    fill(UI_COLORS.textDim());
    textSize(12);
    text("BEST " + max(highScore, score), panelX + 14, panelY + 38);

    // Lives
    const lives = max(0, playerLives);
    for (let i = 0; i < PLAYER_SETTINGS.MAX_LIVES; i++) {
        drawLifeIcon(panelX + 24 + i * 24, panelY + 62, 7, i < lives);
    }

    // Bombs
    if (player) {
        for (let i = 0; i < player.maxBombs; i++) {
            drawBombIcon(panelX + 24 + i * 20, panelY + 88, 5, i < player.bombs);
        }
        fill(UI_COLORS.textDim());
        textSize(11);
        textAlign(RIGHT, TOP);
        text("BOMBS", panelX + panelW - 14, panelY + 82);
        textAlign(LEFT, TOP);
    }

    // Credits
    fill(UI_COLORS.gold());
    textSize(13);
    textAlign(RIGHT, TOP);
    text("CREDITS " + floor(playerCredits), panelX + panelW - 14, panelY + 34);
    textAlign(LEFT, TOP);

    // Multiplier + decay bar
    const multY = panelY + panelH + 8;
    const multActive = scoreMultiplier > 1;
    fill(multActive ? color(255, 235, 90) : color(150, 160, 180));
    textSize(multActive ? 24 : 16);
    text("x" + scoreMultiplier, panelX + 12, multY);
    if (multActive) {
        const remaining = 1 - constrain((millis() - lastKillTime) / GAME_SETTINGS.MULTIPLIER_RESET_TIME, 0, 1);
        drawProgressBar(panelX + 12, multY + 28, panelW - 24, 6, remaining, color(255, 215, 70), color(60, 55, 30, 180));
    }

    // ---- Top-right panel ----
    const rightW = min(210, width * 0.32);
    drawHudPanel(width - rightW - 14, panelY, rightW, 62);
    textAlign(RIGHT, TOP);
    fill(UI_COLORS.text());
    textSize(16);
    text("TIME " + formatTime(getRunElapsedMs()), width - 28, panelY + 12);
    fill(UI_COLORS.textDim());
    textSize(12);
    text("KILLS " + runKills, width - 28, panelY + 38);
    textAlign(LEFT, TOP);

    // ---- Buff timers ----
    let buffY = height - 26;
    textAlign(LEFT, BOTTOM);
    textSize(13);
    if (player && player.hasShield) {
        const remaining = 1 - constrain((millis() - player.shieldStartTime) / max(1, player.shieldDuration), 0, 1);
        fill(150, 170, 255);
        text("SHIELD " + max(0, (player.shieldDuration - (millis() - player.shieldStartTime)) / 1000).toFixed(1) + "s", 16, buffY);
        drawProgressBar(16 + 96, buffY - 10, 90, 5, remaining, color(150, 170, 255), color(40, 45, 70, 180));
        buffY = height - 50;
    }
    if (player && player.rapidFireActive) {
        const remaining = 1 - constrain((player.rapidFireUntil - millis()) / PLAYER_SETTINGS.RAPID_FIRE_DURATION, 0, 1);
        fill(255, 165, 70);
        text("RAPID " + max(0, (player.rapidFireUntil - millis()) / 1000).toFixed(1) + "s", 16, buffY);
        drawProgressBar(16 + 84, buffY - 10, 90, 5, remaining, color(255, 165, 70), color(60, 45, 30, 180));
        buffY = height - 74;
    }

    // ---- Boss bar ----
    const boss = enemies.find(e => e && e.isBoss && !e.dead);
    if (boss) {
        const barW = min(width * 0.6, 640);
        const barH = 20;
        const barX = width / 2 - barW / 2;
        // On narrow screens the top corners belong to the HUD panels.
        const barY = width < 720 ? 142 : 20;
        noStroke();
        fill(40, 10, 14, 220);
        rect(barX, barY, barW, barH, 6);
        fill(boss.enraged ? color(255, 70, 70) : color(200, 30, 40));
        rect(barX, barY, barW * constrain(boss.health / max(1, boss.baseHealth), 0, 1), barH, 6);

        textAlign(CENTER, CENTER);
        textSize(13);
        fill(255);
        text(
            (boss.type.replace("boss_", "").replace(/_/g, " ").toUpperCase()) +
            "  —  " + max(0, ceil(boss.health)) + " HP" + (boss.enraged ? "  (ENRAGED)" : ""),
            width / 2, barY + barH / 2
        );
        textAlign(LEFT, TOP);
    }

    // ---- Boss warning ----
    if (bossWarningStart > 0) {
        const progress = constrain((millis() - bossWarningStart) / GAME_SETTINGS.BOSS_WARNING_DURATION, 0, 1);
        const flash = 0.55 + 0.45 * sin(millis() * 0.02);
        push();
        textAlign(CENTER, CENTER);
        textSize(constrain(width * 0.032, 18, 34));
        fill(255, 60, 60, 230 * flash);
        stroke(255, 200, 200, 160 * flash);
        strokeWeight(2);
        text("WARNING — CAPITAL SHIP INBOUND", width / 2, height * 0.3);
        noStroke();
        drawProgressBar(width / 2 - 150, height * 0.3 + 30, 300, 6, progress, color(255, 80, 80), color(60, 20, 20, 200));
        pop();
    }

    // ---- Control hint for new pilots ----
    if (getRunElapsedMs() < CONTROL_HINT_DURATION) {
        const fade = 1 - constrain((getRunElapsedMs() - (CONTROL_HINT_DURATION - 1500)) / 1500, 0, 1);
        push();
        textAlign(CENTER, BOTTOM);
        textSize(13);
        fill(180, 200, 230, 190 * fade);
        const hint = isTouchMode
            ? "Drag to move · auto-fire · tap BOMB to clear the screen"
            : "WASD / arrows move · hold mouse to fire · SPACE bomb · P pause";
        // Touch hint sits under the HUD: the bottom of a phone screen is
        // occupied by the joystick and the bomb/pause buttons.
        const hintY = isTouchMode ? 150 : height - 38;
        text(hint, width / 2 - (width - 24) / 2, hintY, width - 24, 26);
        pop();
    }

    // ---- Touch pause button ----
    if (isTouchMode && player) {
        const prect = getTouchPauseButtonRect();
        push();
        noStroke();
        fill(20, 34, 56, 150);
        ellipse(prect.x + prect.w / 2, prect.y + prect.h / 2, prect.w);
        stroke(150, 190, 240, 200);
        strokeWeight(2);
        noFill();
        ellipse(prect.x + prect.w / 2, prect.y + prect.h / 2, prect.w);
        noStroke();
        fill(220, 235, 255, 220);
        const cx = prect.x + prect.w / 2;
        const cy = prect.y + prect.h / 2;
        rect(cx - 9, cy - 11, 6, 22, 2);
        rect(cx + 3, cy - 11, 6, 22, 2);
        pop();
    }

    // ---- Touch bomb button ----
    if (isTouchMode && player) {
        const rect = getTouchBombButtonRect();
        const ready = player.bombs > 0 && millis() - player.lastBombTime >= player.bombCooldown;
        push();
        noStroke();
        fill(ready ? color(255, 200, 70, 70) : color(90, 90, 100, 60));
        ellipse(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w);
        stroke(ready ? color(255, 220, 120, 220) : color(120, 120, 130, 160));
        strokeWeight(2);
        noFill();
        ellipse(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(15);
        fill(ready ? color(255, 240, 200) : color(150, 150, 160));
        text("BOMB", rect.x + rect.w / 2, rect.y + rect.h / 2 - 8);
        textSize(13);
        text(player.bombs + "/" + player.maxBombs, rect.x + rect.w / 2, rect.y + rect.h / 2 + 12);
        pop();
    }

    // ---- Virtual joystick ----
    if (isTouchMode && joystick.active) {
        push();
        noStroke();
        fill(120, 180, 255, 45);
        ellipse(joystick.originX, joystick.originY, JOYSTICK_RADIUS * 2);
        stroke(150, 200, 255, 120);
        strokeWeight(2);
        noFill();
        ellipse(joystick.originX, joystick.originY, JOYSTICK_RADIUS * 2);

        let dx = joystick.x - joystick.originX;
        let dy = joystick.y - joystick.originY;
        let d = Math.hypot(dx, dy);
        if (d > JOYSTICK_RADIUS) {
            dx = (dx / d) * JOYSTICK_RADIUS;
            dy = (dy / d) * JOYSTICK_RADIUS;
        }
        noStroke();
        fill(180, 220, 255, 150);
        ellipse(joystick.originX + dx, joystick.originY + dy, 44);
        pop();
    }

    drawFloatingLabels();
    pop();
}

function getTouchPauseButtonRect() {
    const size = min(62, width * 0.14);
    const bomb = getTouchBombButtonRect();
    return { x: width - size - 22, y: bomb.y - size - 16, w: size, h: size };
}

function isTouchPauseButtonHit(x, y) {
    const rect = getTouchPauseButtonRect();
    return x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h;
}

function getTouchBombButtonRect() {
    const size = min(88, width * 0.18);
    return { x: width - size - 22, y: height - size - 22, w: size, h: size };
}

function mouseWheelStoreScreen(event) {
    if (currentGameState !== GAME_STATE.STORE_SCREEN) return false;

    const { listStartY, listVisibleHeight, startX, contentWidth, totalContentHeight } = _storeUISetupData;
    if (mouseX > startX && mouseX < startX + contentWidth + 20 &&
        mouseY > listStartY && mouseY < listStartY + listVisibleHeight) {
        storeScrollY = constrain(
            storeScrollY + event.deltaY * 0.5,
            0,
            max(0, totalContentHeight - listVisibleHeight)
        );
        return true;
    }
    return false;
}
