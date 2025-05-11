// --- Welcome Screen ---
function setupWelcomeScreen() {
    welcomeScreenButtons = [];
    // Ensure any previous DOM elements from other screens are removed or hidden
    if (typeof emailInput !== 'undefined' && emailInput) emailInput.remove();
    if (typeof passwordInput !== 'undefined' && passwordInput) passwordInput.remove();
    if (typeof settingsHighScoreInput !== 'undefined' && settingsHighScoreInput) settingsHighScoreInput.hide();
    if (typeof settingsCreditsInput !== 'undefined' && settingsCreditsInput) settingsCreditsInput.hide();
    if (typeof settingsVolumeSlider !== 'undefined' && settingsVolumeSlider) settingsVolumeSlider.hide();


    let btnW = 250;
    let btnH = 60;
    let spacing = 20; // Keep spacing consistent if only one button now
    let startY = height * 0.5 - btnH / 2; // Center the single button

    welcomeScreenButtons.push({
        x: width / 2 - btnW / 2, y: startY,
        w: btnW, h: btnH,
        text: "Play Game", // Changed from "Play as Guest" to be more direct
        action: () => {
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
        }
    });
}

function drawWelcomeScreen() {
    textAlign(CENTER, CENTER);
    textSize(72);
    fill(255);
    stroke(0, 150, 255);
    strokeWeight(4);
    text("GeoStrike Evolved", width / 2, height * 0.20);
    noStroke();

    textSize(36);
    fill(200);
    text("Welcome!", width / 2, height * 0.35);

    for (let btn of welcomeScreenButtons) {
        let hover = mouseX > btn.x && mouseX < btn.x + btn.w &&
                    mouseY > btn.y && mouseY < btn.y + btn.h && !btn.disabled;
        
        let currentFill = color(50, 50, 80, 200);
        if (btn.disabled) {
            currentFill = color(100, 100, 100, 150); // Greyed out for disabled
        } else if (hover) {
            currentFill = color(80, 80, 120, 200);
        }
        
        fill(currentFill);
        stroke(btn.disabled ? 150 : (hover ? 255 : 200));
        strokeWeight(2);
        rect(btn.x, btn.y, btn.w, btn.h, 10);

        fill(btn.disabled ? 180 : (hover ? 255 : 220));
        noStroke();
        textSize(28);
        text(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
    }
    textAlign(LEFT, TOP);
}

// --- Settings Screen ---
function setupSettingsScreen() {
    settingsButtons = [];
    // Ensure welcome screen specific inputs are hidden if they were somehow created
    if (typeof emailInput !== 'undefined' && emailInput) emailInput.hide();
    if (typeof passwordInput !== 'undefined' && passwordInput) passwordInput.hide();
    if (settingsHighScoreInput) settingsHighScoreInput.remove();
    if (settingsCreditsInput) settingsCreditsInput.remove();
    if (settingsVolumeSlider) settingsVolumeSlider.remove();

    const itemHeight = 40;
    const itemSpacing = 15; 
    const sectionSpacing = 30; 
    const contentWidth = width * 0.65; 
    const startX = (width - contentWidth) / 2;
    const labelColumnWidth = contentWidth * 0.45;
    const controlColumnX = startX + labelColumnWidth;
    const controlWidth = contentWidth - labelColumnWidth - 20; 

    let currentY = height * 0.18; 

    // --- Section 1: General Settings ---
    let generalSectionY = currentY;
    let generalSectionItems = 0;

    settingsButtons.push({
        x: controlColumnX + (controlWidth - 130) / 2, 
        y: currentY,
        w: 130, h: itemHeight,
        text: () => debugMode ? "ON" : "OFF",
        action: () => {
            debugMode = !debugMode;
            saveGameData();
            setupSettingsScreen(); 
        },
        id: "toggle_debug"
    });
    generalSectionItems++;
    currentY += itemHeight + itemSpacing;

    settingsVolumeSlider = createSlider(0, 1, masterVolume, 0.01);
    settingsVolumeSlider.position(controlColumnX, currentY + itemHeight / 2 - settingsVolumeSlider.height / 2);
    settingsVolumeSlider.size(controlWidth - 60); 
    settingsVolumeSlider.input(() => {
        masterVolume = settingsVolumeSlider.value();
        outputVolume(masterVolume);
        saveGameData();
    });
    settingsVolumeSlider.show();
    generalSectionItems++;
    currentY += itemHeight + itemSpacing;

    settingsButtons.push({
        x: controlColumnX + (controlWidth - 130) / 2, 
        y: currentY,
        w: 130, h: itemHeight,
        text: () => screenShakeEnabled ? "ON" : "OFF", 
        action: () => {
            screenShakeEnabled = !screenShakeEnabled;
            saveGameData();
        },
        id: "shake_toggle",
        disabled: false
    });
    generalSectionItems++;
    currentY += itemHeight + itemSpacing;

    settingsButtons.push({
        x: controlColumnX + (controlWidth - 180) / 2, 
        y: currentY,
        w: 180, h: itemHeight,
        text: "Reset All Game Data",
        action: () => {
            if (confirm("Are you sure you want to reset all game data? This cannot be undone.")) {
                resetGameToDefaults();
                outputVolume(masterVolume); 
                defineUpgrades(); 
                loadGameData(); 
                if (player) player.applyUpgrades(); 
                setupSettingsScreen(); 
            }
        },
        id: "reset_game_data"
    });
    generalSectionItems++;
    currentY += itemHeight + itemSpacing;
    
    _settingsUIData.generalSectionHeight = (generalSectionItems * itemHeight) + ((generalSectionItems -1) * itemSpacing) + 40; 
    _settingsUIData.generalSectionY = generalSectionY;

    if (debugMode) {
        currentY += sectionSpacing; 
        _settingsUIData.debugSectionY = currentY;
        let debugSectionItems = 0;

        settingsHighScoreInput = createInput(str(highScore));
        settingsHighScoreInput.position(controlColumnX, currentY + itemHeight / 2 - settingsHighScoreInput.height / 2);
        settingsHighScoreInput.size(controlWidth - 110); 
        settingsHighScoreInput.show();
        settingsButtons.push({
            x: controlColumnX + controlWidth - 100, y: currentY, 
            w: 100, h: itemHeight,
            text: "Set Score",
            action: () => {
                let val = parseInt(settingsHighScoreInput.value());
                if (!isNaN(val)) { highScore = val; saveGameData(); }
                settingsHighScoreInput.value(str(highScore));
            },
            id: "set_highscore"
        });
        debugSectionItems++;
        currentY += itemHeight + itemSpacing;

        settingsCreditsInput = createInput(str(playerCredits));
        settingsCreditsInput.position(controlColumnX, currentY + itemHeight / 2 - settingsCreditsInput.height / 2);
        settingsCreditsInput.size(controlWidth - 110); 
        settingsCreditsInput.show();
        settingsButtons.push({
            x: controlColumnX + controlWidth - 100, y: currentY, 
            w: 100, h: itemHeight,
            text: "Set Credits",
            action: () => {
                let val = parseInt(settingsCreditsInput.value());
                if (!isNaN(val)) { playerCredits = val; saveGameData(); }
                settingsCreditsInput.value(str(playerCredits));
            },
            id: "set_credits"
        });
        debugSectionItems++;
        currentY += itemHeight + itemSpacing;
        
        _settingsUIData.debugSectionHeight = (debugSectionItems * itemHeight) + ((debugSectionItems -1) * itemSpacing) + 40; 
    } else {
         _settingsUIData.debugSectionHeight = 0;
         _settingsUIData.debugSectionY = 0;
    }

    _settingsUIData.debugKeysInfoY = debugMode ? currentY + sectionSpacing / 2 : _settingsUIData.generalSectionY + _settingsUIData.generalSectionHeight + sectionSpacing / 2;

    settingsButtons.push({
        x: width / 2 - 100, y: height - 70, 
        w: 200, h: 50,
        text: "Back",
        action: () => {
            if (settingsHighScoreInput) settingsHighScoreInput.remove();
            if (settingsCreditsInput) settingsCreditsInput.remove();
            if (settingsVolumeSlider) settingsVolumeSlider.remove();
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
        },
        id: "back_to_menu"
    });
}

let _settingsUIData = {
    generalSectionY: 0,
    generalSectionHeight: 0,
    debugSectionY: 0,
    debugSectionHeight: 0,
    debugKeysInfoY: 0
};

function drawSettingsScreen() {
    push();
    background(10, 20, 35); 

    textAlign(CENTER, CENTER);
    textSize(48); 
    fill(230, 230, 255);
    text("SETTINGS", width / 2, height * 0.08);

    const itemHeight = 40;
    const itemSpacing = 15;
    const sectionTitleSpacing = 25; 
    const contentWidth = width * 0.65;
    const startX = (width - contentWidth) / 2;
    const labelColumnWidth = contentWidth * 0.45; 
    const labelStartX = startX + 20; 
    const controlColumnX = startX + labelColumnWidth; 
    const controlWidth = contentWidth - labelColumnWidth - 20; 

    const sectionBgColor = color(25, 40, 65, 200); 
    const sectionStrokeColor = color(60, 80, 110);
    const sectionTitleColor = color(210, 210, 240);
    const labelColor = color(190, 190, 220);
    const valueColor = color(220, 220, 250);

    let currentY = _settingsUIData.generalSectionY; 

    fill(sectionBgColor);
    stroke(sectionStrokeColor);
    strokeWeight(1.5);
    rect(startX, currentY - sectionTitleSpacing - 5, contentWidth, _settingsUIData.generalSectionHeight, 8); 

    textAlign(LEFT, CENTER);
    textSize(22);
    fill(sectionTitleColor);
    noStroke();
    text("General", labelStartX, currentY - sectionTitleSpacing + 5); 
    
    textSize(16);
    fill(labelColor);
    text("Enable Debug Mode:", labelStartX, currentY + itemHeight / 2);
    currentY += itemHeight + itemSpacing;

    fill(labelColor);
    text("Master Volume:", labelStartX, currentY + itemHeight / 2);
    textAlign(RIGHT, CENTER);
    fill(valueColor);
    text(nf(masterVolume * 100, 0, 0) + "%", controlColumnX + controlWidth - 5, currentY + itemHeight / 2); 
    textAlign(LEFT, CENTER); 
    currentY += itemHeight + itemSpacing;

    fill(labelColor);
    text("Screen Shake:", labelStartX, currentY + itemHeight / 2);
    currentY += itemHeight + itemSpacing;

    fill(labelColor);
    text("Reset All Data:", labelStartX, currentY + itemHeight / 2);
    currentY += itemHeight + itemSpacing;

    if (debugMode && _settingsUIData.debugSectionY > 0) {
        currentY = _settingsUIData.debugSectionY; 
        fill(sectionBgColor);
        stroke(sectionStrokeColor);
        rect(startX, currentY - sectionTitleSpacing - 5, contentWidth, _settingsUIData.debugSectionHeight, 8);

        textAlign(LEFT, CENTER);
        textSize(22);
        fill(sectionTitleColor);
        noStroke();
        text("Debug Options", labelStartX, currentY - sectionTitleSpacing + 5);

        textSize(16);
        fill(labelColor);
        text("Set High Score:", labelStartX, currentY + itemHeight / 2);
        currentY += itemHeight + itemSpacing;

        fill(labelColor);
        text("Set Player Credits:", labelStartX, currentY + itemHeight / 2);
        currentY += itemHeight + itemSpacing;
    }
    
    let debugKeysYPos = (debugMode && _settingsUIData.debugSectionY > 0) ?
                        _settingsUIData.debugSectionY + _settingsUIData.debugSectionHeight + 10 :
                        _settingsUIData.generalSectionY + _settingsUIData.generalSectionHeight + 10;

    if (debugMode) { 
        textAlign(CENTER, TOP);
        textSize(16);
        fill(labelColor);
        noStroke();
        text("Debug Keys:", width / 2, debugKeysYPos);
        debugKeysYPos += itemHeight * 0.7;
        textSize(12);
        fill(170, 170, 200);
        text("K: +Credits  |  N: Spawn Splitter  |  M: Spawn Shield  |  B: Spawn Boss", width / 2, debugKeysYPos);
    }

    for (let btn of settingsButtons) {
        let hover = mouseX > btn.x && mouseX < btn.x + btn.w &&
                    mouseY > btn.y && mouseY < btn.y + btn.h;
        
        let currentBtnFill;
        if (btn.disabled) {
            currentBtnFill = color(80, 80, 90, 180);
        } else if (btn.id === "toggle_debug") {
            currentBtnFill = debugMode ? color(70, 160, 70, 220) : color(160, 70, 70, 220);
            if (hover) {
                currentBtnFill = debugMode ? color(90, 180, 90, 255) : color(180, 90, 90, 255);
            }
        } else if (btn.id === "shake_toggle") {
            currentBtnFill = screenShakeEnabled ? color(70, 160, 70, 220) : color(160, 70, 70, 220);
            if (hover) {
                currentBtnFill = screenShakeEnabled ? color(90, 180, 90, 255) : color(180, 90, 90, 255);
            }
        } else {
             currentBtnFill = hover ? color(100, 100, 140, 230) : color(70, 70, 110, 200);
        }

        fill(currentBtnFill);
        stroke(btn.disabled ? 100 : (hover ? 220 : 160));
        strokeWeight(1.5);
        rect(btn.x, btn.y, btn.w, btn.h, 8); 

        fill(btn.disabled ? 150 : (hover ? 255 : 230));
        noStroke();
        textSize(btn.id === "back_to_menu" ? 20 : 16);
        textAlign(CENTER, CENTER);
        text(typeof btn.text === 'function' ? btn.text() : btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
    }
    pop();
}

function setupMainMenu() {
    menuButtons = [];
    // Ensure welcome screen specific inputs are hidden
    if (typeof emailInput !== 'undefined' && emailInput) emailInput.hide();
    if (typeof passwordInput !== 'undefined' && passwordInput) passwordInput.hide();
    let btnW = 250;
    let btnH = 60;
    let spacing = 20;
    let startY = height * 0.45; 

    menuButtons.push({ 
        x: width / 2 - btnW / 2, y: startY,
        w: btnW, h: btnH,
        text: "Start Game",
        action: () => { initGame(); }
    });
    menuButtons.push({ 
        x: width / 2 - btnW / 2, y: startY + (btnH + spacing),
        w: btnW, h: btnH,
        text: "Store",
        action: () => {
            currentGameState = GAME_STATE.STORE_SCREEN;
            setupStoreScreen();
        }
    });
    menuButtons.push({ 
        x: width / 2 - btnW / 2, y: startY + 2 * (btnH + spacing),
        w: btnW, h: btnH,
        text: "How To Play",
        action: () => {
            currentGameState = GAME_STATE.HOW_TO_PLAY;
            setupHowToPlayScreen();
        }
    });
    menuButtons.push({ 
        x: width / 2 - btnW / 2, y: startY + 3 * (btnH + spacing),
        w: btnW, h: btnH,
        text: "Settings",
        action: () => {
            if (settingsHighScoreInput) settingsHighScoreInput.hide();
            if (settingsCreditsInput) settingsCreditsInput.hide();
            if (settingsVolumeSlider) settingsVolumeSlider.hide(); 
            currentGameState = GAME_STATE.SETTINGS_SCREEN;
            setupSettingsScreen();
        }
    });
}

function drawMainMenu() {
    textAlign(CENTER, CENTER);
    textSize(72);
    fill(255);
    stroke(0, 150, 255); // Spiky blue outline for title
    strokeWeight(4);
    text("GeoStrike Evolved", width / 2, height * 0.20);
    noStroke(); // Reset stroke

    textSize(24);
    fill(200);
    text("High Score: " + highScore, width / 2, height * 0.30);
    text("Credits: " + playerCredits, width/2, height * 0.35);

    for (let btn of menuButtons) {
        let hover = mouseX > btn.x && mouseX < btn.x + btn.w &&
                    mouseY > btn.y && mouseY < btn.y + btn.h;
        fill(hover ? color(80, 80, 120, 200) : color(50, 50, 80, 200));
        stroke(hover ? 255 : 200);
        strokeWeight(2);
        rect(btn.x, btn.y, btn.w, btn.h, 10);

        fill(hover ? 255 : 220);
        stroke(0, 100, 200); // Spiky blue outline for button text
        strokeWeight(2);
        textSize(28);
        text(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
        noStroke(); // Reset stroke
    } 
    textAlign(LEFT, TOP);
} 

let howToPlayButtons = []; 

function setupHowToPlayScreen() {
    howToPlayButtons = [];
    // Ensure welcome screen specific inputs are hidden
    if (typeof emailInput !== 'undefined' && emailInput) emailInput.hide();
    if (typeof passwordInput !== 'undefined' && passwordInput) passwordInput.hide();
    howToPlayButtons.push({
        x: width / 2 - 100, y: height - 80, 
        w: 200, h: 50,
        text: "Back",
        action: () => {
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu(); 
            playMusic(menuMusic);
        }
    });
}

function drawHowToPlayScreen() {
    push();
    background(10, 20, 40); 

    textAlign(CENTER, CENTER);
    textSize(52);
    fill(220, 220, 255);
    stroke(0, 150, 255); // Spiky blue outline
    strokeWeight(3);
    text("HOW TO PLAY", width / 2, height * 0.1);
    noStroke();

    fill(200, 200, 220); 
    textSize(18);
    textAlign(LEFT, TOP); 

    let lineY = height * 0.22; 
    let lineHeight = 28;     
    let textX = width * 0.1;   
    let textWidth = width * 0.8; 

    text("Welcome to GeoStrike Evolved!", textX, lineY);
    lineY += lineHeight * 1.5;

    text("CONTROLS:", textX, lineY);
    lineY += lineHeight;
    text("- Move Ship: WASD or Arrow Keys", textX + 20, lineY);
    lineY += lineHeight;
    text("- Aim: Mouse Cursor", textX + 20, lineY);
    lineY += lineHeight;
    text("- Shoot: Left Mouse Button", textX + 20, lineY);
    lineY += lineHeight;
    text("- Use Bomb: SPACE Bar", textX + 20, lineY);
    lineY += lineHeight;
    text("- Pause/Resume: P Key", textX + 20, lineY);
    lineY += lineHeight * 1.5;

    text("OBJECTIVE:", textX, lineY);
    lineY += lineHeight;
    text("Survive the onslaught of geometric enemies and asteroids for as long as possible. Destroy enemies to earn credits.", textX + 20, lineY, textWidth - 20);
    lineY += lineHeight * 1.5;

    text("STORE & UPGRADES:", textX, lineY);
    lineY += lineHeight;
    text("Visit the Store from the Main Menu to spend credits on permanent upgrades for your ship, such as improved fire rate, damage, speed, and more. You can also purchase extra lives.", textX + 20, lineY, textWidth - 20);
    lineY += lineHeight * 1.5;

    text("PICKUPS:", textX, lineY);
    lineY += lineHeight;
    text("  B (Yellow) - Bomb: Instantly adds one bomb to your inventory.", textX + 20, lineY, textWidth - 20);
    lineY += lineHeight;
    text("  S (Blue) - Shield: Grants temporary invulnerability to all damage.", textX + 20, lineY, textWidth - 20);
    lineY += lineHeight * 1.5;

    text("Good luck, pilot!", textX, lineY);

    for (let btn of howToPlayButtons) {
        let hover = mouseX > btn.x && mouseX < btn.x + btn.w &&
                    mouseY > btn.y && mouseY < btn.y + btn.h;
        fill(hover ? color(120, 120, 160, 230) : color(80, 80, 120, 200));
        stroke(hover ? 255 : 180);
        strokeWeight(1.5);
        rect(btn.x, btn.y, btn.w, btn.h, 6);

        fill(hover ? 255 : 230);
        stroke(0,100,200); // Spiky blue outline for button text
        strokeWeight(2);
        textSize(24);
        textAlign(CENTER, CENTER);
        text(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
        noStroke();
    }
    pop();
}

const _storeUISetupData = {
    totalContentHeight: 0,
    listStartY: 0,
    listVisibleHeight: 0,
    startX: 0,
    contentWidth: 0,
    itemEntryHeight: 0,
    itemSpacing: 0,
    buttonWidth: 0
};

function setupStoreScreen() {
    storeButtons = [];
    // Ensure welcome screen specific inputs are hidden
    if (typeof emailInput !== 'undefined' && emailInput) emailInput.hide();
    if (typeof passwordInput !== 'undefined' && passwordInput) passwordInput.hide();
    storeScrollY = 0;

    const itemEntryHeight = 75; 
    const buttonWidth = 130;
    const buttonHeight = 35;
    const contentWidth = width * 0.9;
    const startX = (width - contentWidth) / 2;
    const itemSpacing = 10;

    if (typeof availableUpgrades === 'undefined' || Object.keys(availableUpgrades).length === 0) {
        defineUpgrades();
    }

    let currentYOffset = 0; 

    for (const key in availableUpgrades) {
        if (availableUpgrades.hasOwnProperty(key)) {
            const upgrade = availableUpgrades[key];
            storeButtons.push({
                originalY: currentYOffset + (itemEntryHeight - buttonHeight) / 2,
                x: startX + contentWidth - buttonWidth - 20,
                w: buttonWidth,
                h: buttonHeight,
                id: `buy_${key}`,
                upgradeKey: key,
                text: () => upgrade.level >= upgrade.maxLevel ? "Maxed" : `Buy (${upgrade.getCost()})`,
                action: () => {
                    if (upgrade.level < upgrade.maxLevel) {
                        purchaseUpgrade(key); 
                    }
                },
                disabled: () => upgrade.level >= upgrade.maxLevel || playerCredits < upgrade.getCost(),
                isFixed: false
            });
            currentYOffset += itemEntryHeight + itemSpacing;
        }
    }

    storeButtons.push({
        originalY: currentYOffset + (itemEntryHeight - buttonHeight) / 2,
        x: startX + contentWidth - buttonWidth - 20,
        w: buttonWidth,
        h: buttonHeight,
        id: "buy_life",
        text: () => playerLives >= PLAYER_SETTINGS.MAX_LIVES ? "Max Lives" : `Buy Life (${PLAYER_SETTINGS.LIFE_COST})`,
        action: () => {
            if (playerLives < PLAYER_SETTINGS.MAX_LIVES) {
                purchaseLife(); 
            }
        },
        disabled: () => playerLives >= PLAYER_SETTINGS.MAX_LIVES || playerCredits < PLAYER_SETTINGS.LIFE_COST,
        isFixed: false
    });
    currentYOffset += itemEntryHeight + itemSpacing;

    _storeUISetupData.totalContentHeight = currentYOffset - itemSpacing;
    _storeUISetupData.listStartY = height * 0.18;
    const backButtonHeight = 45;
    const bottomPadding = 25; 
    _storeUISetupData.listVisibleHeight = height - _storeUISetupData.listStartY - backButtonHeight - bottomPadding - 10; 
    _storeUISetupData.startX = startX;
    _storeUISetupData.contentWidth = contentWidth;
    _storeUISetupData.itemEntryHeight = itemEntryHeight;
    _storeUISetupData.itemSpacing = itemSpacing;
    _storeUISetupData.buttonWidth = buttonWidth;

    storeButtons.push({
        x: width / 2 - 100,
        y: height - backButtonHeight - 15, 
        w: 200,
        h: backButtonHeight,
        id: "back_to_main_menu_from_store",
        text: "Back to Menu",
        action: () => {
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
        },
        disabled: () => false,
        isFixed: true 
    });
}


function drawStoreScreen() {
    push(); 
    background(15, 25, 45);

    textAlign(CENTER, CENTER);
    textSize(52); fill(220, 220, 255);
    stroke(0, 150, 255); strokeWeight(3); // Spiky blue outline for title
    text("UPGRADE STORE", width / 2, height * 0.07);
    noStroke();

    textSize(28); fill(255, 220, 100);
    stroke(150, 120, 0); strokeWeight(2); // Spiky gold outline for credits
    text("Credits: " + playerCredits, width / 2, height * 0.13);
    noStroke();

    const {
        totalContentHeight, listStartY, listVisibleHeight, startX, contentWidth,
        itemEntryHeight, itemSpacing, buttonWidth: upgradeButtonWidth
    } = _storeUISetupData;
    const textXOffset = 20;

    const maxScroll = Math.max(0, totalContentHeight - listVisibleHeight);
    storeScrollY = constrain(storeScrollY, 0, maxScroll);

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(startX, listStartY, contentWidth, listVisibleHeight);
    drawingContext.clip();

    push(); 
    translate(0, listStartY - storeScrollY); 

    let currentYDraw = 0; 

    for (const key in availableUpgrades) {
        if (availableUpgrades.hasOwnProperty(key)) {
            const upgrade = availableUpgrades[key];
            let itemTopAbsolute = listStartY + currentYDraw - storeScrollY; 
            
            if (itemTopAbsolute + itemEntryHeight > listStartY && itemTopAbsolute < listStartY + listVisibleHeight) {
                fill(30, 45, 75, 220); stroke(80, 100, 140); strokeWeight(1.5);
                rect(startX, currentYDraw, contentWidth, itemEntryHeight, 10);

                fill(230, 230, 255); textSize(22); textAlign(LEFT, TOP);
                stroke(0, 100, 180); strokeWeight(1.5); // Spiky outline for upgrade name
                text(upgrade.name, startX + textXOffset, currentYDraw + 12);
                noStroke();

                textSize(15); fill(190, 190, 220);
                text(`Level: ${upgrade.level} / ${upgrade.maxLevel}`, startX + textXOffset, currentYDraw + 40);

                textSize(14);
                let effectText = upgrade.level >= upgrade.maxLevel ? "Max Level Reached!" : (upgrade.getEffectChangeText ? upgrade.getEffectChangeText() : upgrade.description);
                fill(upgrade.level >= upgrade.maxLevel ? color(150, 255, 150) : color(170, 200, 230));
                text(effectText, startX + textXOffset, currentYDraw + 60, contentWidth - upgradeButtonWidth - textXOffset * 2 - 15);
            }
            currentYDraw += itemEntryHeight + itemSpacing;
        }
    }

    let lifeItemTopAbsolute = listStartY + currentYDraw - storeScrollY;
    if (lifeItemTopAbsolute + itemEntryHeight > listStartY && lifeItemTopAbsolute < listStartY + listVisibleHeight) {
        fill(30, 45, 75, 220); stroke(80, 100, 140); strokeWeight(1.5);
        rect(startX, currentYDraw, contentWidth, itemEntryHeight, 10);
        fill(230, 230, 255); textSize(22); textAlign(LEFT, TOP);
        stroke(0, 100, 180); strokeWeight(1.5); // Spiky outline
        text("Extra Life", startX + textXOffset, currentYDraw + 12);
        noStroke();
        textSize(15); fill(190, 190, 220);
        text(`Current Lives: ${playerLives} / ${PLAYER_SETTINGS.MAX_LIVES}`, startX + textXOffset, currentYDraw + 40);
        textSize(14); fill(170, 200, 230);
        text(playerLives >= PLAYER_SETTINGS.MAX_LIVES ? "Maximum lives reached." : `Cost: ${PLAYER_SETTINGS.LIFE_COST} credits.`, startX + textXOffset, currentYDraw + 60);
    }
    
    for (let btn of storeButtons) {
        if (btn.isFixed) continue; 

        let buttonScreenY = listStartY + btn.originalY - storeScrollY;
        if (buttonScreenY + btn.h < listStartY || buttonScreenY > listStartY + listVisibleHeight) {
            continue;
        }

        let hover = mouseX > btn.x && mouseX < btn.x + btn.w &&
                    mouseY > buttonScreenY && mouseY < buttonScreenY + btn.h; 
        
        let isActuallyDisabled = typeof btn.disabled === 'function' ? btn.disabled() : btn.disabled;
        let btnFillColor = isActuallyDisabled ? color(100,100,100,180) : (hover ? color(100,180,100,230) : color(70,150,70,200));
        let btnTextColor = isActuallyDisabled ? color(160) : (hover ? color(255) : color(230));

        if (btn.id && btn.id.startsWith("buy_") && btn.id !== "buy_life") {
            const upgrade = availableUpgrades[btn.upgradeKey];
            if (upgrade && upgrade.level >= upgrade.maxLevel) {
                btnFillColor = color(120,120,120,200); btnTextColor = color(200);
            }
        } else if (btn.id === "buy_life" && playerLives >= PLAYER_SETTINGS.MAX_LIVES) {
            btnFillColor = color(120,120,120,200); btnTextColor = color(200);
        }
        
        fill(btnFillColor); stroke(isActuallyDisabled ? 120 : (hover ? 230 : 180)); strokeWeight(1.5);
        rect(btn.x, btn.originalY, btn.w, btn.h, 8); 
        
        fill(btnTextColor); 
        stroke(0,50,100); strokeWeight(1.5); // Spiky outline for button text
        textSize(15); textAlign(CENTER,CENTER);
        text(typeof btn.text === 'function' ? btn.text() : btn.text, btn.x + btn.w/2, btn.originalY + btn.h/2);
        noStroke();
    }

    pop(); 
    drawingContext.restore(); 

    if (totalContentHeight > listVisibleHeight) {
        const scrollbarAreaX = startX + contentWidth + 5;
        const scrollbarTrackHeight = listVisibleHeight;
        const handleHeight = max(20, scrollbarTrackHeight * (listVisibleHeight / totalContentHeight));
        const handleY = listStartY + (scrollbarTrackHeight - handleHeight) * (storeScrollY / maxScroll);
        fill(50,50,80,150); rect(scrollbarAreaX, listStartY, 8, scrollbarTrackHeight, 4);
        fill(100,100,150,200); rect(scrollbarAreaX, handleY, 8, handleHeight, 4);
    }
    
    for (let btn of storeButtons) {
        if (!btn.isFixed) continue;

        let hover = mouseX > btn.x && mouseX < btn.x + btn.w &&
                    mouseY > btn.y && mouseY < btn.y + btn.h;
        let btnFillColor = hover ? color(100,100,140,230) : color(70,70,110,200);
        let btnTextColor = hover ? color(255) : color(230);

        fill(btnFillColor); stroke(hover ? 230 : 180); strokeWeight(1.5);
        rect(btn.x, btn.y, btn.w, btn.h, 8);
        
        fill(btnTextColor); 
        stroke(0,50,100); strokeWeight(2); // Spiky outline for back button text
        textSize(18); textAlign(CENTER,CENTER);
        text(btn.text, btn.x + btn.w/2, btn.y + btn.h/2);
        noStroke();
    }
    pop(); 
}

function drawGameOverScreen() {
    push();
    fill(255);
    stroke(0, 150, 255); // Spiky blue outline
    strokeWeight(4);
    textSize(72);
    textAlign(CENTER, CENTER);
    textFont('Consolas');
    text("GAME OVER", width / 2, height / 2 - 60);

    noStroke(); // Reset for subsequent text
    textSize(40);
    fill(255); // Ensure fill is white for score
    text("Score: " + score, width / 2, height / 2 + 20);
    text("High Score: " + highScore, width / 2, height / 2 + 70);

    textSize(28);
    fill(255); // Ensure fill is white
    stroke(0,100,200); // Spiky outline
    strokeWeight(2);
    text("Press ENTER for Main Menu", width / 2, height / 2 + 140);
    noStroke();
    pop();
}

function setupPauseMenu() {
    pauseMenuButtons = [];
    // Ensure welcome screen specific inputs are hidden
    if (typeof emailInput !== 'undefined' && emailInput) emailInput.hide();
    if (typeof passwordInput !== 'undefined' && passwordInput) passwordInput.hide();
    const btnW = 220;
    const btnH = 50;
    const spacing = 25; 
    let startY = height / 2 - btnH / 2 - spacing; 

    pauseMenuButtons.push({
        x: width / 2 - btnW / 2, y: startY,
        w: btnW, h: btnH,
        text: "Resume",
        action: () => { currentGameState = GAME_STATE.PLAYING; }
    });

    pauseMenuButtons.push({
        x: width / 2 - btnW / 2, y: startY + btnH + spacing,
        w: btnW, h: btnH,
        text: "Main Menu",
        action: () => {
            saveGameData(); 
            currentGameState = GAME_STATE.MAIN_MENU;
            setupMainMenu();
            playMusic(menuMusic);
        }
    });
}

function drawPauseScreen(){
    push();
    fill(0,0,0, 180); 
    rect(0,0,width,height);

    textAlign(CENTER,CENTER);
    textSize(60);
    fill(255);
    stroke(0,150,255); // Spiky blue outline for PAUSED text
    strokeWeight(3);
    text("PAUSED", width/2, height/2 - 120);
    noStroke();

    for(let btn of pauseMenuButtons){
        let hover = mouseX > btn.x && mouseX < btn.x + btn.w &&
                    mouseY > btn.y && mouseY < btn.y + btn.h;
        fill(hover ? color(100,100,140, 220) : color(70,70,110, 200));
        stroke(hover ? 220 : 160);
        strokeWeight(2);
        rect(btn.x, btn.y, btn.w, btn.h, 8);

        fill(hover ? 255 : 230);
        stroke(0,80,180); // Spiky blue outline for button text
        strokeWeight(2);
        textSize(26);
        text(btn.text, btn.x + btn.w/2, btn.y + btn.h/2);
        noStroke();
    }
    pop();
}

function drawGameUI() {
    push();
    textAlign(LEFT, TOP);
    textSize(24);

    // Common style for UI text that needs the spiky effect
    const uiTextColor = color(255);
    const uiStrokeColor = color(0, 100, 200); // Blue for spiky effect
    const uiStrokeWeight = 2;

    // Score Text
    fill(uiTextColor);
    stroke(uiStrokeColor);
    strokeWeight(uiStrokeWeight);
    text("Score: " + score, 20, 20);

    // Lives Text
    fill(uiTextColor);
    stroke(uiStrokeColor);
    strokeWeight(uiStrokeWeight);
    text("Lives: " + playerLives, 20, 50);

    // Credits Text
    fill(uiTextColor);
    stroke(uiStrokeColor);
    strokeWeight(uiStrokeWeight);
    text("Credits: " + playerCredits, 20, 80);
    noStroke(); // Reset stroke after this block of main stats

    let nextTextY = 110; 

    if (player && player.hasShield) {
        let shieldTimeLeft = (player.shieldDuration - (millis() - player.shieldStartTime)) / 1000;
        shieldTimeLeft = max(0, shieldTimeLeft); 
        fill(150, 150, 255, 200); 
        stroke(50,50,150); // Darker blue outline for shield text
        strokeWeight(uiStrokeWeight);
        textSize(18);
        text(`Shield: ${shieldTimeLeft.toFixed(1)}s`, 20, nextTextY);
        noStroke();
        nextTextY += 25; 
    }

    if (player) { 
        fill(uiTextColor); 
        stroke(uiStrokeColor);
        strokeWeight(uiStrokeWeight);
        textSize(24); 
        text("Bombs: " + player.bombs + "/" + player.maxBombs, 20, nextTextY);
        noStroke();
        nextTextY += 30; 
    }

    if (scoreMultiplier > 1) {
        fill(255, 255, 0);
        stroke(150,150,0); // Darker yellow outline for multiplier
        strokeWeight(uiStrokeWeight + 1); // Slightly thicker for emphasis
        textSize(36);
    } else {
        fill(180);
        stroke(100); // Grey outline for normal multiplier
        strokeWeight(uiStrokeWeight);
        textSize(24);
    }
    text("x" + scoreMultiplier, 20, nextTextY);
    noStroke();

    textAlign(RIGHT, TOP);
    fill(uiTextColor);
    stroke(uiStrokeColor);
    strokeWeight(uiStrokeWeight);
    textSize(24);
    text("High Score: " + highScore, width - 20, 20);
    noStroke();

    let boss = enemies.find(e => e.isBoss);
    if (boss) {
        let barW = width * 0.6;
        let barH = 25;
        let barX = width / 2 - barW / 2;
        let barY = 30;

        noStroke(); 
        fill(80, 0, 0);
        rect(barX, barY, barW, barH);
        
        noStroke(); 
        fill(200, 0, 0);
        rect(barX, barY, barW * constrain(boss.health / boss.baseHealth, 0, 1), barH); 

        fill(255);
        stroke(0); // Black outline for boss text for contrast
        strokeWeight(1.5);
        textAlign(CENTER, CENTER);
        textSize(18);
        text(`${boss.type.replace("boss_", "").toUpperCase()}: ${max(0, floor(boss.health))}`, width / 2, barY + barH / 2);
        noStroke();
    }
    pop();
}

function mouseWheelStoreScreen(event) {
    if (currentGameState === GAME_STATE.STORE_SCREEN) {
        const { listStartY, listVisibleHeight, startX, contentWidth, totalContentHeight } = _storeUISetupData;
        if (mouseX > startX && mouseX < startX + contentWidth + 15 && // Include scrollbar area
            mouseY > listStartY && mouseY < listStartY + listVisibleHeight) {
            
            storeScrollY += event.deltaY * 0.5; 
            const maxScroll = Math.max(0, totalContentHeight - listVisibleHeight);
            storeScrollY = constrain(storeScrollY, 0, maxScroll);
            return true; 
        }
    }
    return false; 
}