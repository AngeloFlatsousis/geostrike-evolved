// --- Game Objects ---
let player;
let bullets = [];
let enemies = [];
let particles = [];
let pickups = [];
let asteroids = [];
// --- Audio ---
let menuMusic;
let gameMusic;
let bossMusic;
let currentTrack; // To keep track of the currently playing music
let masterVolume = 0.5; // Default master volume (0.0 to 1.0)

// --- Game State (Gameplay specific) ---
let score = 0;
let highScore = 0;
let playerLives = 3;
let currentGameState = GAME_STATE.MAIN_MENU; // Initialized from constants.js
let playerCredits = 0; // New: Player currency
let debugMode = false; // Global debug mode flag, loaded from localStorage

// --- Leveling & Upgrades (XP system to be phased out) ---
let playerLevel = 1; // Retained for now for boss scaling, but levelUp() is removed.
// let playerXP = 0; // Phased out
// let xpToNextLevel; // Phased out
// let upgradeChoices = []; // Phased out (mid-game choices)
let availableUpgrades = {}; // Populated by defineUpgrades(), levels managed by store & saved

// --- Spawning ---
let lastSpawnTime = 0;
let spawnInterval;
let lastAsteroidSpawnTime = 0;
let bossSpawnedThisGame = false;

// Score Multiplier
let scoreMultiplier = 1;
let killsSinceLastHit = 0;
let lastKillTime = 0;

// --- Controls ---
let moveUp = false;
let moveDown = false;
let moveLeft = false;
let moveRight = false;
let isShooting = false;

// --- Visuals ---
let screenShakeMagnitude = 0;
let screenShakeEnabled = true; // Added for toggling screen shake
let backgroundPulseAlpha = 0;

// --- UI Elements for Main Menu & Store ---
let menuButtons = [];
let storeButtons = []; // For store interactions
let settingsButtons = []; // For settings screen interactions
let pauseMenuButtons = []; // For pause screen interactions
let welcomeScreenButtons = []; // For welcome screen interactions
let settingsHighScoreInput; // DOM input element for high score
let settingsCreditsInput;   // DOM input element for credits
let settingsVolumeSlider;   // DOM slider element for volume
let storeScrollY = 0;       // Vertical scroll position for the store screen