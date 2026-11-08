// Minimal headless p5.js stand-in.
// It implements just enough of the p5 drawing API (as no-ops) plus real
// Vector / color / math helpers so the game's logic can be exercised in Node.
'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

class Vector {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; return this; }
    copy() { return new Vector(this.x, this.y); }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    mult(n) { this.x *= n; this.y *= n; return this; }
    div(n) { this.x /= n; this.y /= n; return this; }
    mag() { return Math.hypot(this.x, this.y); }
    magSq() { return this.x * this.x + this.y * this.y; }
    normalize() { const m = this.mag(); if (m > 0) this.div(m); return this; }
    limit(max) { const m = this.mag(); if (m > max && m > 0) this.mult(max / m); return this; }
    setMag(n) { return this.normalize().mult(n); }
    heading() { return Math.atan2(this.y, this.x); }
    rotate(a) {
        const nx = this.x * Math.cos(a) - this.y * Math.sin(a);
        const ny = this.x * Math.sin(a) + this.y * Math.cos(a);
        this.x = nx; this.y = ny; return this;
    }
    dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
    lerp(v, amt) {
        this.x += (v.x - this.x) * amt;
        this.y += (v.y - this.y) * amt;
        return this;
    }
    static add(a, b) { return new Vector(a.x + b.x, a.y + b.y); }
    static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
    static mult(a, n) { return new Vector(a.x * n, a.y * n); }
    static dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    static fromAngle(a, l = 1) { return new Vector(Math.cos(a) * l, Math.sin(a) * l); }
    static random2D() { const a = Math.random() * Math.PI * 2; return Vector.fromAngle(a); }
    static lerp(a, b, t) { return new Vector(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t); }
}

class Color {
    constructor(r = 0, g = 0, b = 0, a = 255) {
        this.levels = [r, g, b, a];
        this.r = r; this.g = g; this.b = b; this.a = a;
    }
}

const noopFn = () => {};
let seed = 123456789;
function seededRandom() {
    // Deterministic PRNG so failures are reproducible.
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
}

function createContext() {
    const noop = () => {};
    const ctx = {
        // ---- timing ----
        // Virtual clock: tests advance `__now` themselves so a 3 minute run
        // takes milliseconds to simulate.
        __now: 0,
        millis: () => ctx.__now,
        get frameCount() { return ctx.__frameCount || 0; },
        deltaTime: 1000 / 60,
        // ---- math ----
        sin: Math.sin, cos: Math.cos, atan2: Math.atan2, sqrt: Math.sqrt, abs: Math.abs,
        pow: Math.pow, min: Math.min, max: Math.max, round: Math.round,
        floor: Math.floor, ceil: Math.ceil,
        random: (a, b) => {
            if (a === undefined) return seededRandom();
            if (Array.isArray(a)) return a[Math.floor(seededRandom() * a.length)];
            if (b === undefined) return seededRandom() * a;
            return a + seededRandom() * (b - a);
        },
        dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
        map: (v, a, b, c, d, within) => {
            const r = (v - a) / (b - a) * (d - c) + c;
            if (!within) return r;
            return Math.min(Math.max(r, Math.min(c, d)), Math.max(c, d));
        },
        constrain: (v, lo, hi) => Math.min(Math.max(v, lo), hi),
        lerp: (a, b, t) => a + (b - a) * t,
        int: (v) => parseInt(v, 10) || 0,
        str: (v) => String(v),
        nf: (v, a, b) => Number(v).toFixed(b === undefined ? 0 : b),
        TWO_PI: Math.PI * 2, PI: Math.PI, HALF_PI: Math.PI / 2,
        // ---- p5 lifecycle / drawing ----
        createCanvas: () => ({ width: ctx.width, height: ctx.height }),
        resizeCanvas: noop, frameRate: noop, fullscreen: () => false,
        background: noop, fill: noop, noFill: noop, stroke: noop, noStroke: noop,
        strokeWeight: noop, textSize: noop, textFont: noop, textAlign: noop,
        text: noop, textWidth: (t) => String(t).length * 7.2, textLeading: noop, rect: noop, ellipse: noop, circle: noop, triangle: noop,
        line: noop, vertex: noop, beginShape: noop, endShape: noop,
        push: noop, pop: noop, translate: noop, rotate: noop, scale: noop,
        loadFont: noop, image: noop, noLoop: noop, loop: noop,
        blendMode: noop, strokeCap: noop, strokeJoin: noop, angleMode: noop,
        locateURL: noop,
        drawingContext: { save: noop, restore: noop, beginPath: noop, rect: noop, clip: noop },
        // ---- vectors & color ----
        createVector: (x, y) => new Vector(x, y),
        color: (r, g, b, a) => new Color(r, g, b, a),
        lerpColor: (c1, c2, t) => new Color(
            c1.levels[0] + (c2.levels[0] - c1.levels[0]) * t,
            c1.levels[1] + (c2.levels[1] - c1.levels[1]) * t,
            c1.levels[2] + (c2.levels[2] - c1.levels[2]) * t,
            c1.levels[3] + (c2.levels[3] - c1.levels[3]) * t
        ),
        red: (c) => c.levels[0], green: (c) => c.levels[1],
        blue: (c) => c.levels[2], alpha: (c) => c.levels[3],
        // ---- DOM inputs ----
        createInput: (val = '') => makeElement(val),
        createSlider: (min, max, val) => {
            const el = makeElement(String(val));
            el.value = () => val;
            el.size = noop; el.height = 20;
            return el;
        },
        createButton: (label) => makeElement(label),
        select: () => null,
        removeElements: noop,
        // ---- audio ----
        soundFormats: noop,
        loadSound: () => makeSound(),
        outputVolume: noop,
        getAudioContext: () => ({ state: 'suspended', currentTime: 0, resume: () => Promise.resolve(), createGain: () => ({ gain: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: noop }), createOscillator: () => ({ type: '', frequency: { setValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: noop, start: noop, stop: noop }), createBufferSource: () => ({ buffer: null, connect: noop, start: noop, stop: noop }), createBuffer: () => ({ getChannelData: () => new Float32Array(10) }), createBiquadFilter: () => ({ type: '', frequency: { setValueAtTime: noop }, Q: { value: 0 }, connect: noop }), destination: {} }),
        userStartAudio: noop,
        // ---- input state ----
        keyCode: 0, keyIsDown: () => false,
        mouseX: 0, mouseY: 0, mouseButton: 0, pmouseX: 0, pmouseY: 0,
        touches: [], mouseIsPressed: false,
        LEFT: 37, RIGHT: 39, UP: 38, DOWN: 40, ENTER: 13, RETURN: 13,
        UP_ARROW: 38, DOWN_ARROW: 40, LEFT_ARROW: 37, RIGHT_ARROW: 39,
        ESCAPE: 27, SHIFT: 16, SPACE: 32, CLOSE: 1, ALT: 18, CONTROL: 17,
        CENTER: 3, TOP: 101, BOTTOM: 102, BASELINE: 103,
        CORNER: 0, CORNERS: 1, RADIUS: 2, DEGREES: 'degrees', RADIANS: 'radians',
        // ---- environment ----
        width: 1280, height: 720, windowWidth: 1280, windowHeight: 720,
        pixelDensity: noop, displayDensity: () => 1,
        // ---- misc ----
        __frameCount: 0,
        setFrameCount(n) { ctx.__frameCount = n; },
    };

    ctx.p5 = { Vector, Color };

    // Globals referenced by the game but supplied by the browser.
    ctx.window = ctx;
    ctx.globalThis = ctx;
    ctx.navigator = { userAgent: 'node-headless', vendor: '' };
    ctx.confirm = () => true;
    ctx.alert = noop;
    ctx.performance = { now: () => Date.now() };
    ctx.setTimeout = setTimeout;
    ctx.clearTimeout = clearTimeout;
    ctx.console = console;
    ctx.document = {
        getElementById: () => ({ style: {}, remove: noop }),
        createElement: () => ({ style: {}, appendChild: noop }),
        body: { appendChild: noop, style: {} },
        addEventListener: noop,
    };
    const store = new Map();
    ctx.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
        __store: store,
    };
    ctx.__storage = store;
    return ctx;
}

function makeElement(value) {
    return {
        value: () => value,
        setValue: noopFn,
        position: () => {},
        size: () => {},
        show: () => {},
        hide: () => {},
        remove: () => {},
        elt: { style: {} },
        height: 20,
        width: 100,
        input: () => {},
        changed: () => {},
        style: () => {},
    };
}

function makeSound() {
    return {
        isPlaying: () => false,
        isLoaded: () => true,
        loop: () => {},
        play: () => {},
        pause: () => {},
        stop: () => {},
        setVolume: () => {},
        setLoop: () => {},
    };
}

const SCRIPT_ORDER = [
    'js/constants.js',
    'js/globals.js',
    'js/audio.js',
    'js/player.js',
    'js/bullet.js',
    'js/enemy_base.js',
    'js/enemy_types.js',
    'js/particle.js',
    'js/pickup.js',
    'js/asteroid.js',
    'js/upgrades.js',
    'js/utils.js',
    'js/ui.js',
    'sketch.js',
];

function loadGame(rootDir = path.resolve(__dirname, '..')) {
    const sandbox = createContext();
    const context = vm.createContext(sandbox);
    for (const rel of SCRIPT_ORDER) {
        const file = path.join(rootDir, rel);
        if (!fs.existsSync(file)) continue;
        const code = fs.readFileSync(file, 'utf8');
        vm.runInContext(code, context, { filename: rel });
    }
    return sandbox;
}

module.exports = { loadGame, SCRIPT_ORDER, Vector, Color };
