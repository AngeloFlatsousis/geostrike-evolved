// --- Game Objects ---
let player;
let bullets = [];
let enemies = [];
let particles = [];
let pickups = [];
let asteroids = [];
let enemyBullets = [];

// --- Audio ---
let menuMusic;
let gameMusic;
let bossMusic;
let currentTrack; // Keeps track of the currently playing music
let masterVolume = 0.5; // Default master volume (0.0 to 1.0)
let sfxEnabled = true;

// --- Game State (Gameplay specific) ---
let score = 0;
let highScore = 0;
let playerLives = 3;
let currentGameState = GAME_STATE.MAIN_MENU; // Initialized from constants.js
let playerCredits = 0; // Player currency
let debugMode = false; // Global debug mode flag, loaded from localStorage
let bonusLives = 0; // Extra lives bought in the store, persists between runs

// --- Upgrades ---
let availableUpgrades = {}; // Populated by defineUpgrades(), levels saved

// --- Spawning ---
let lastSpawnTime = 0;
let spawnInterval;
let lastAsteroidSpawnTime = 0;
let bossSpawnedThisGame = false;
let bossWarningStart = 0;
let bossTier = 0;
let bossesKilled = 0;
let nextBossScore = 0;
let lastBossTime = -Infinity; // when the last boss spawned

// --- Run statistics ---
let runStartTime = 0;
let runActive = false; // true only while a run is being played
let runKills = 0;
let runCreditsEarned = 0;
let lastRunStats = null;

// Score Multiplier
let scoreMultiplier = 1;
let killsSinceLastHit = 0;
let lastKillTime = 0;

// --- Frame timing ---
// 1.0 at 60fps; every position/velocity update is scaled by this so the game
// runs at the same speed on 144Hz displays and during frame drops.
let dtScale = 1;

// --- Controls ---
let moveUp = false;
let moveDown = false;
let moveLeft = false;
let moveRight = false;
let isShooting = false;

// --- Touch controls (virtual joystick) ---
let isTouchMode = false;
const joystick = {
    active: false,
    originX: 0,
    originY: 0,
    x: 0,
    y: 0,
};

let pauseStartTime = 0;

// --- Visuals ---
let floatingLabels = [];
let screenShakeMagnitude = 0;
let cameraShake = { x: 0, y: 0 };
let screenShakeEnabled = true;
let backgroundPulseAlpha = 0;
let stars = [];

// --- UI Elements ---
let menuButtons = [];
let storeButtons = [];
let settingsButtons = [];
let pauseMenuButtons = [];
let welcomeScreenButtons = [];
let settingsHighScoreInput; // DOM input element for high score
let settingsCreditsInput;   // DOM input element for credits
let settingsVolumeSlider;   // DOM slider element for volume
let storeScrollY = 0;       // Vertical scroll position for the store screen
let storeToast = null;      // { text, color, start }
