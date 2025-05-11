// --- Game Configuration & Constants ---
// DEBUG_MODE is now a global variable in globals.js

const GAME_STATE = {
    WELCOME_SCREEN: 'welcomeScreen', // New state for login/guest play
    MAIN_MENU: 'mainMenu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver',
    // UPGRADE_SCREEN: 'upgradeScreen', // Phased out
    STORE_SCREEN: 'storeScreen', // New state for the store
    PAUSED: 'paused',
    HOW_TO_PLAY: 'howToPlay',
    SETTINGS_SCREEN: 'settingsScreen',
};

const ENEMY_TYPE = {
    CHASER: 'chaser',
    DODGER: 'dodger',
    SPLITTER: 'splitter',
    BOSS_MEGA_CHASER: 'boss_mega_chaser',
};

const PICKUP_TYPE = {
    BOMB: 'bomb',
    SHIELD: 'shield',
};

const PLAYER_SETTINGS = {
    RADIUS: 15,
    FRICTION: 0.88,
    TRAIL_LENGTH: 18,
    INVULNERABLE_DURATION: 2000,
    BASE_SPEED: 4.0,
    BASE_SHOOT_COOLDOWN: 140,
    BASE_BULLET_DAMAGE: 1,
    BASE_BULLET_SPEED: 9,
    BASE_PICKUP_RADIUS: 50,
    INITIAL_BOMBS: 1,
    BOMB_COOLDOWN: 500,
    BASE_BOMB_RADIUS: 250,
    SHIELD_BASE_DURATION: 5000,
    DRAW_GLOW_SCALE: 1.2,
    BOMB_PARTICLE_COUNT: 80,
    MAX_LIVES: 5,
    LIFE_COST: 750, // Cost for one life
};

const BULLET_SETTINGS = {
    RADIUS: 5,
    LIFESPAN_DECREMENT: 4,
    TRAIL_LENGTH: 7,
};

const PARTICLE_SETTINGS = {
    LIFESPAN_DECREMENT_MIN: 3,
    LIFESPAN_DECREMENT_MAX: 7,
    FRICTION_MIN: 0.92,
    FRICTION_MAX: 0.98,
};

const PICKUP_SETTINGS = {
    RADIUS: 10,
    LIFESPAN: 8000,
    PULSE_SPEED: 0.1,
    FRICTION: 0.9,
};

const ASTEROID_SETTINGS = {
    MIN_RADIUS: 20,
    MAX_RADIUS: 50,
    MIN_HEALTH: 3,
    MAX_HEALTH_FACTOR: 0.2,
    MAX_SPEED: 0.8,
    MAX_COUNT: 10,
    SPAWN_INTERVAL: 15000,
    POINTS_PER_HEALTH: 5,
    // XP_PER_HEALTH: 2, // Phased out
    CREDITS_PER_HEALTH: 0, // Credits granted per health point of asteroid
    HIT_COLOR_DURATION: 80,
};

const GAME_SETTINGS = {
    INITIAL_SPAWN_INTERVAL: 1900,
    MIN_SPAWN_INTERVAL: 250,
    DIFFICULTY_INCREASE_RATE: 10,
    MULTIPLIER_RESET_TIME: 2500,
    MAX_ENEMIES: 100,
    // INITIAL_XP_TO_NEXT_LEVEL: 150, // Phased out
    // LEVEL_COST_MULTIPLIER: 1.3,    // Phased out
    // XP_BAR_WIDTH: 250,             // Phased out
    // XP_BAR_HEIGHT: 20,            // Phased out
    BOSS_SPAWN_LEVEL: 5,
    GRID_SIZE: 50,
    INITIAL_CREDITS: 0,
};

const ENEMY_MERGE_SETTINGS = {
    MAX_MERGE_LEVEL: 3,
    MAX_MERGED_RADIUS: 70,
    MERGE_HEALTH_BONUS_FACTOR: 1.2,
    MERGE_BASE_HEALTH_BONUS_FACTOR: 1.1,
    MERGE_SCORE_BONUS_BASE: 25,
    // MERGE_XP_BONUS_BASE: 10, // Phased out
    MERGE_CREDITS_BONUS_BASE: 5,
    MERGE_SPEED_MULTIPLIER: 0.92,
    CHASER_MERGE_VERTEX_INCREMENT: 1,
    MAX_CHASER_VERTICES: 12,
    MERGE_EFFECT_COLOR: null,
    PICKUP_DROP_CHANCE_BONUS: 0.03,
};

const ENEMY_BASE_CREDITS = {
    CHASER: 4,
    DODGER: 6,
    SPLITTER: 8,
    BOSS_MEGA_CHASER: 100,
};