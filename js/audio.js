// --- Lightweight synthesised sound effects ---------------------------------
// The game ships with music only, so all effects are generated with the
// WebAudio API at runtime (no extra assets, no network requests).

let sfxContext = null;
let sfxMasterGain = null;
let sfxNoiseBuffer = null;

function initAudio() {
    try {
        if (typeof getAudioContext === 'function') {
            sfxContext = getAudioContext();
        } else if (typeof window !== 'undefined' && window.AudioContext) {
            sfxContext = new window.AudioContext();
        }
    } catch (err) {
        sfxContext = null;
    }
    if (!sfxContext) return;

    try {
        if (!sfxMasterGain && sfxContext.createGain) {
            sfxMasterGain = sfxContext.createGain();
            sfxMasterGain.gain.value = 0.4;
            sfxMasterGain.connect(sfxContext.destination);
        }
        updateSfxVolume();
    } catch (err) {
        sfxMasterGain = null;
    }
}

function updateSfxVolume() {
    if (!sfxMasterGain) return;
    const volume = constrain(masterVolume, 0, 1) * 0.4;
    // setTargetAtTime avoids clicks when the slider is dragged.
    try {
        sfxMasterGain.gain.setTargetAtTime(sfxEnabled ? volume : 0, sfxContext.currentTime, 0.02);
    } catch (err) {
        sfxMasterGain.gain.value = sfxEnabled ? volume : 0;
    }
}

function audioReady() {
    if (!sfxEnabled || !sfxContext || !sfxMasterGain) return false;
    if (sfxContext.state === 'suspended' && sfxContext.resume) {
        // Safe: only succeeds once the user has interacted with the page.
        try { sfxContext.resume(); } catch (err) { /* ignore */ }
    }
    return sfxContext.state === 'running';
}

function getNoiseBuffer() {
    if (sfxNoiseBuffer || !sfxContext || !sfxContext.createBuffer) return sfxNoiseBuffer;
    try {
        const length = Math.floor(sfxContext.sampleRate * 0.5) || 11025;
        const buffer = sfxContext.createBuffer(1, length, sfxContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        sfxNoiseBuffer = buffer;
    } catch (err) {
        sfxNoiseBuffer = null;
    }
    return sfxNoiseBuffer;
}

function playTone(opts) {
    if (!audioReady()) return;
    const {
        freq = 440, endFreq = null, type = 'square',
        duration = 0.12, gain = 0.16, delay = 0,
    } = opts;
    try {
        const start = sfxContext.currentTime + delay;
        const osc = sfxContext.createOscillator();
        const env = sfxContext.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        if (endFreq !== null) {
            osc.frequency.exponentialRampToValueAtTime(max(endFreq, 1), start + duration);
        }
        env.gain.setValueAtTime(0.0001, start);
        env.gain.exponentialRampToValueAtTime(max(gain, 0.0002), start + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(env);
        env.connect(sfxMasterGain);
        osc.start(start);
        osc.stop(start + duration + 0.02);
    } catch (err) {
        // Audio is a nice-to-have; never let it break gameplay.
    }
}

function playNoise(opts) {
    if (!audioReady()) return;
    const buffer = getNoiseBuffer();
    if (!buffer) return;
    const {
        duration = 0.3, gain = 0.2, freq = 900, endFreq = 120, delay = 0,
    } = opts;
    try {
        const start = sfxContext.currentTime + delay;
        const src = sfxContext.createBufferSource();
        src.buffer = buffer;
        const filter = sfxContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq, start);
        filter.frequency.exponentialRampToValueAtTime(max(endFreq, 30), start + duration);
        const env = sfxContext.createGain();
        env.gain.setValueAtTime(max(gain, 0.0002), start);
        env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        src.connect(filter);
        filter.connect(env);
        env.connect(sfxMasterGain);
        src.start(start);
        src.stop(start + duration + 0.02);
    } catch (err) {
        // ignore
    }
}

const SFX = {
    shoot:        () => playTone({ freq: 760, endFreq: 320, type: 'square', duration: 0.07, gain: 0.055 }),
    enemyShoot:   () => playTone({ freq: 320, endFreq: 120, type: 'sawtooth', duration: 0.14, gain: 0.06 }),
    hit:          () => playTone({ freq: 240, endFreq: 170, type: 'triangle', duration: 0.05, gain: 0.05 }),
    explode:      () => playNoise({ duration: 0.26, gain: 0.16, freq: 1400, endFreq: 140 }),
    bigExplode:   () => {
        playNoise({ duration: 0.55, gain: 0.3, freq: 900, endFreq: 60 });
        playTone({ freq: 120, endFreq: 40, type: 'sine', duration: 0.5, gain: 0.22 });
    },
    bomb:         () => {
        playNoise({ duration: 0.7, gain: 0.32, freq: 2200, endFreq: 60 });
        playTone({ freq: 200, endFreq: 35, type: 'sine', duration: 0.65, gain: 0.28 });
    },
    pickup:       () => {
        playTone({ freq: 660, type: 'sine', duration: 0.09, gain: 0.12 });
        playTone({ freq: 990, type: 'sine', duration: 0.12, gain: 0.12, delay: 0.07 });
    },
    shieldBreak:  () => {
        playTone({ freq: 500, endFreq: 200, type: 'triangle', duration: 0.3, gain: 0.14 });
        playNoise({ duration: 0.25, gain: 0.1, freq: 2600, endFreq: 700 });
    },
    playerHit:    () => {
        playNoise({ duration: 0.45, gain: 0.26, freq: 1200, endFreq: 80 });
        playTone({ freq: 180, endFreq: 55, type: 'sawtooth', duration: 0.4, gain: 0.2 });
    },
    bossWarning:  () => {
        playTone({ freq: 155, type: 'square', duration: 0.28, gain: 0.14 });
        playTone({ freq: 155, type: 'square', duration: 0.28, gain: 0.14, delay: 0.38 });
    },
    bossEnrage:   () => playTone({ freq: 90, endFreq: 200, type: 'sawtooth', duration: 0.6, gain: 0.16 }),
    bossDown:     () => {
        playNoise({ duration: 0.9, gain: 0.32, freq: 1600, endFreq: 50 });
        playTone({ freq: 300, endFreq: 40, type: 'sine', duration: 0.9, gain: 0.26 });
    },
    gameOver:     () => {
        playTone({ freq: 400, endFreq: 300, type: 'triangle', duration: 0.22, gain: 0.14 });
        playTone({ freq: 300, endFreq: 200, type: 'triangle', duration: 0.24, gain: 0.14, delay: 0.2 });
        playTone({ freq: 200, endFreq: 80, type: 'triangle', duration: 0.5, gain: 0.16, delay: 0.42 });
    },
    uiClick:      () => playTone({ freq: 520, endFreq: 620, type: 'sine', duration: 0.06, gain: 0.08 }),
    purchase:     () => {
        playTone({ freq: 520, type: 'sine', duration: 0.08, gain: 0.1 });
        playTone({ freq: 780, type: 'sine', duration: 0.1, gain: 0.1, delay: 0.07 });
        playTone({ freq: 1040, type: 'sine', duration: 0.14, gain: 0.1, delay: 0.15 });
    },
    denied:       () => playTone({ freq: 170, endFreq: 120, type: 'square', duration: 0.16, gain: 0.09 }),
    merge:        () => playTone({ freq: 300, endFreq: 520, type: 'triangle', duration: 0.16, gain: 0.07 }),
};

// Minimum gap between repeats of the same effect (ms). Without this a bomb
// that kills 20 enemies stacks 20 oscillators and clips horribly.
const SFX_MIN_INTERVAL = {
    shoot: 55,
    hit: 40,
    explode: 55,
    merge: 140,
    pickup: 70,
    enemyShoot: 90,
    shieldBreak: 120,
};
const sfxLastPlayed = {};

function playSfx(name) {
    try {
        const fn = SFX[name];
        if (!fn) return;
        const now = millis();
        const minInterval = SFX_MIN_INTERVAL[name] || 0;
        if (minInterval && sfxLastPlayed[name] !== undefined && now - sfxLastPlayed[name] < minInterval) {
            return;
        }
        sfxLastPlayed[name] = now;
        fn();
    } catch (err) {
        // ignore
    }
}
