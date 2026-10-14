/**
 * ============================================================================
 * APEX VELOCITY 2D - PRODUCTION-READY HTML5 CANVAS CAR RACING ENGINE
 * ============================================================================
 * Architecture:
 *  - Deterministic Fixed-Timestep Accumulator Game Loop (Delta Time)
 *  - Responsive 9:16 Mobile-First Canvas with Sub-Pixel Rendering
 *  - Dual Input Management: Hardware Keyboard + Android Multi-Touch Gamepad
 *  - Realistic Top-Down Arcade Vehicle Dynamics (Inertia, Drift, Grip Slip)
 *  - Multi-Lane Highway with Curbs, Parallax Roadside & Speed Wind Streaks
 *  - High-Detail Procedural 2D Vector Sports Car (Zero external images)
 *  - Web Audio API Procedural Sound Synthesis (Engine, Drift, Nitro)
 * ============================================================================
 */

'use strict';

// ----------------------------------------------------------------------------
// Canvas 2D roundRect Polyfill (Ensures 100% Android WebView & Safari compatibility)
// ----------------------------------------------------------------------------
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
        if (!radii) radii = 0;
        if (typeof radii === 'number') radii = [radii, radii, radii, radii];
        const r = radii[0] || 0;
        this.beginPath();
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        this.closePath();
        return this;
    };
}

/* ============================================================================
   1. CONSTANTS & CONFIGURATION
   ============================================================================ */
const CONFIG = {
    // Virtual Logical Canvas Resolution (9:16 vertical aspect ratio)
    CANVAS_WIDTH: 720,
    CANVAS_HEIGHT: 1280,
    FIXED_DT: 1 / 60,       // 60Hz physics step (0.01666s)
    MAX_FRAME_TIME: 0.1,    // Maximum allowed frame time to prevent lag spikes

    // Road Dimensions & Metrics
    ROAD_WIDTH: 520,
    ROAD_LANES: 4,
    SHOULDER_WIDTH: 35,
    CURB_WIDTH: 18,

    // Vehicle Physics Specifications
    CAR: {
        WIDTH: 56,
        LENGTH: 108,
        ACCELERATION: 950,        // Forward engine acceleration (px/s^2)
        BRAKE_FORCE: 1600,        // Braking deceleration (px/s^2)
        REVERSE_ACCEL: 450,       // Reverse gear acceleration (px/s^2)
        DRAG: 0.35,               // Aerodynamic air drag coefficient
        ROLLING_RESISTANCE: 140,  // Tire rolling friction
        MAX_SPEED: 1350,          // Top forward speed (~270 km/h)
        MAX_REVERSE_SPEED: -380,  // Max reverse speed (~75 km/h)
        NITRO_ACCEL_MULT: 2.1,    // Acceleration multiplier under Nitro
        NITRO_TOP_SPEED: 1750,    // Top speed under Nitro (~350 km/h)
        NITRO_CONSUMPTION: 30,    // Nitro used per second (0-100)
        NITRO_RECHARGE: 6,        // Passive Nitro recharge per second
        NITRO_DRIFT_BONUS: 20,    // Extra Nitro awarded per second while drifting
        
        // Steering & Drift Mechanics
        STEER_SPEED: 4.8,         // Angular response rate (rad/s)
        STEER_RETURN_RATE: 7.2,   // Centering spring speed
        MAX_STEER_ANGLE: 0.44,    // Max wheel turn angle (~25 deg)
        GRIP_LATERAL: 8.5,        // Lateral tire grip factor
        DRIFT_THRESHOLD: 0.38,    // Slip angle threshold to break traction
        DRIFT_SLIP_DRAG: 0.88,    // Velocity retention during active drift
        OFFROAD_SLOWDOWN: 0.45    // Grip & speed penalty when hitting grass
    },

    // HUD & Visuals
    SPEED_KMH_FACTOR: 0.20,      // Conversion from world px/s to display km/h
    MAX_PARTICLES: 250,
    MAX_SKIDMARKS: 600
};

/* ============================================================================
   PHASE 2: 10-CAR DATABASE & VEHICLE SPECIFICATIONS
   ============================================================================ */
const CARS_DATABASE = [
    {
        id: 'car_1',
        name: 'Rusty Hatchback',
        tag: 'TIER 1 • STARTER',
        desc: 'Balanced starter hatchback. Modest speed, predictable handling, and resilient unpainted metal.',
        price: 0,
        unlocked: true,
        width: 52,
        length: 96,
        stats: {
            topSpeed: 1100,      // ~220 km/h
            acceleration: 850,
            handling: 0.85,
            armor: 0.70,
            nitroCapacity: 80
        },
        displayStats: {
            speed: '220 km/h',
            accel: '4.8s',
            handling: '65%',
            armor: '70%',
            nitro: '80%'
        },
        bars: { speed: 52, accel: 45, handling: 65, armor: 70, nitro: 44 }
    },
    {
        id: 'car_2',
        name: 'City Sedan',
        tag: 'TIER 1 • EXECUTIVE',
        desc: 'Nimble city executive 4-door. Exceptional handling, chrome trim, and tight cornering response.',
        price: 400,
        unlocked: false,
        width: 54,
        length: 104,
        stats: {
            topSpeed: 1200,      // ~240 km/h
            acceleration: 950,
            handling: 1.25,
            armor: 0.65,
            nitroCapacity: 90
        },
        displayStats: {
            speed: '240 km/h',
            accel: '4.2s',
            handling: '88%',
            armor: '65%',
            nitro: '90%'
        },
        bars: { speed: 60, accel: 52, handling: 88, armor: 65, nitro: 50 }
    },
    {
        id: 'car_3',
        name: 'Street Tuner',
        tag: 'TIER 2 • DRIFT SPEC',
        desc: 'Japanese tuner icon. Rapid low-end turbo acceleration, dual racing stripes, and drift-tuned suspension.',
        price: 1000,
        unlocked: false,
        width: 56,
        length: 102,
        stats: {
            topSpeed: 1320,      // ~264 km/h
            acceleration: 1220,
            handling: 1.15,
            armor: 0.55,
            nitroCapacity: 100
        },
        displayStats: {
            speed: '264 km/h',
            accel: '3.6s',
            handling: '82%',
            armor: '55%',
            nitro: '100%'
        },
        bars: { speed: 70, accel: 72, handling: 82, armor: 55, nitro: 56 }
    },
    {
        id: 'car_4',
        name: 'Classic Muscle',
        tag: 'TIER 2 • MUSCLE',
        desc: 'American big-block V8 brute. Massive straight-line top speed, protruding blower scoop, heavy steering.',
        price: 1800,
        unlocked: false,
        width: 58,
        length: 112,
        stats: {
            topSpeed: 1440,      // ~288 km/h
            acceleration: 1150,
            handling: 0.72,
            armor: 0.85,
            nitroCapacity: 95
        },
        displayStats: {
            speed: '288 km/h',
            accel: '3.8s',
            handling: '58%',
            armor: '85%',
            nitro: '95%'
        },
        bars: { speed: 78, accel: 68, handling: 58, armor: 85, nitro: 53 }
    },
    {
        id: 'car_5',
        name: 'Off-Road 4x4 Pickup',
        tag: 'TIER 3 • HEAVY DUTY',
        desc: 'Armored lifted pickup truck. Maximum armor, heavy bull bar, roof rally lamps, impervious to curb strikes.',
        price: 2800,
        unlocked: false,
        width: 62,
        length: 116,
        stats: {
            topSpeed: 1240,      // ~248 km/h
            acceleration: 1050,
            handling: 0.82,
            armor: 1.00,
            nitroCapacity: 110
        },
        displayStats: {
            speed: '248 km/h',
            accel: '4.0s',
            handling: '62%',
            armor: '100%',
            nitro: '110%'
        },
        bars: { speed: 64, accel: 62, handling: 62, armor: 100, nitro: 61 }
    },
    {
        id: 'car_6',
        name: 'Police Interceptor',
        tag: 'TIER 3 • ENFORCER',
        desc: 'Highway pursuit cruiser. Flashing red & blue strobe sirens, heavy steel push bumper, aggressive speed.',
        price: 4200,
        unlocked: false,
        width: 58,
        length: 110,
        stats: {
            topSpeed: 1480,      // ~296 km/h
            acceleration: 1280,
            handling: 1.05,
            armor: 0.90,
            nitroCapacity: 115
        },
        displayStats: {
            speed: '296 km/h',
            accel: '3.4s',
            handling: '76%',
            armor: '90%',
            nitro: '115%'
        },
        bars: { speed: 82, accel: 76, handling: 76, armor: 90, nitro: 64 }
    },
    {
        id: 'car_7',
        name: 'Cyber Neon Coupe',
        tag: 'TIER 4 • SYNTHWAVE',
        desc: 'Futuristic street predator. Oversized dual Nitro tanks, geometric wedge styling, pulsing neon underglow.',
        price: 6000,
        unlocked: false,
        width: 56,
        length: 108,
        stats: {
            topSpeed: 1540,      // ~308 km/h
            acceleration: 1350,
            handling: 1.18,
            armor: 0.65,
            nitroCapacity: 160
        },
        displayStats: {
            speed: '308 km/h',
            accel: '3.1s',
            handling: '86%',
            armor: '65%',
            nitro: '160%'
        },
        bars: { speed: 86, accel: 82, handling: 86, armor: 65, nitro: 89 }
    },
    {
        id: 'car_8',
        name: 'Apex Supercar',
        tag: 'TIER 4 • EXOTIC',
        desc: 'Aerodynamic carbon hypercar. Elite top speed with razor-sharp handling and active aero wing.',
        price: 8500,
        unlocked: false,
        width: 58,
        length: 112,
        stats: {
            topSpeed: 1640,      // ~328 km/h
            acceleration: 1440,
            handling: 1.38,
            armor: 0.70,
            nitroCapacity: 130
        },
        displayStats: {
            speed: '328 km/h',
            accel: '2.8s',
            handling: '94%',
            armor: '70%',
            nitro: '130%'
        },
        bars: { speed: 92, accel: 88, handling: 94, armor: 70, nitro: 72 }
    },
    {
        id: 'car_9',
        name: 'Formula 2D Open-Wheel',
        tag: 'TIER 5 • GRAND PRIX',
        desc: 'Grand Prix open-wheeler. Extreme downforce wings, instant turbo throttle, and exposed wide slicks.',
        price: 12000,
        unlocked: false,
        width: 60,
        length: 114,
        stats: {
            topSpeed: 1700,      // ~340 km/h
            acceleration: 1600,
            handling: 1.60,
            armor: 0.40,
            nitroCapacity: 140
        },
        displayStats: {
            speed: '340 km/h',
            accel: '2.4s',
            handling: '100%',
            armor: '40%',
            nitro: '140%'
        },
        bars: { speed: 95, accel: 96, handling: 100, armor: 40, nitro: 78 }
    },
    {
        id: 'car_10',
        name: 'Hyper-Jet Prototype',
        tag: 'TIER 5 • PROTOTYPE X',
        desc: 'Ultimate aerospace turbine hybrid. Twin plasma thrusters, delta wings, and maxed-out specs.',
        price: 18000,
        unlocked: false,
        width: 62,
        length: 118,
        stats: {
            topSpeed: 1820,      // ~364 km/h (450+ with Nitro)
            acceleration: 1720,
            handling: 1.48,
            armor: 0.95,
            nitroCapacity: 180
        },
        displayStats: {
            speed: '364 km/h',
            accel: '2.1s',
            handling: '96%',
            armor: '95%',
            nitro: '180%'
        },
        bars: { speed: 100, accel: 100, handling: 96, armor: 95, nitro: 100 }
    }
];

/* ============================================================================
   PHASE 3: 10-LEVEL PROGRESSION SYSTEM CONFIGURATION
   ============================================================================ */
const LEVELS_CONFIG = [
    {
        id: 1,
        title: 'Suburban Cruise',
        subtitle: 'Sunny Suburbs • Easy',
        desc: 'Wide lanes, gentle civilian traffic, and generous bonus coins. Perfect for warm-up.',
        theme: 'day_sunny',
        targetDist: 1000,
        timeLimit: 0,            // No timer on Level 1
        lanes: 4,
        trafficDensity: 'low',
        trafficSpeedRange: [320, 480],
        allowLaneChange: false,
        oncomingTraffic: false,
        hazards: [],
        gripMult: 1.0,
        coinSpawnRate: 0.85
    },
    {
        id: 2,
        title: 'Boulevard Breeze',
        subtitle: 'Sunny Suburbs • Easy',
        desc: 'Slightly denser suburban commuter traffic with rolling delivery vans and bonus vault coins.',
        theme: 'day_sunny',
        targetDist: 1400,
        timeLimit: 0,
        lanes: 4,
        trafficDensity: 'low_med',
        trafficSpeedRange: [350, 520],
        allowLaneChange: false,
        oncomingTraffic: false,
        hazards: [],
        gripMult: 1.0,
        coinSpawnRate: 0.75
    },
    {
        id: 3,
        title: 'Sunset Highway',
        subtitle: 'Highway Rush • Medium',
        desc: 'Golden hour multi-lane expressway. Vehicles begin changing lanes with amber blinkers.',
        theme: 'sunset',
        targetDist: 2000,
        timeLimit: 85,
        lanes: 4,
        trafficDensity: 'medium',
        trafficSpeedRange: [420, 620],
        allowLaneChange: true,
        oncomingTraffic: false,
        hazards: [],
        gripMult: 1.0,
        coinSpawnRate: 0.65
    },
    {
        id: 4,
        title: 'Coastal Expressway',
        subtitle: 'Highway Rush • Medium',
        desc: 'Brisk oceanfront freeway. Faster traffic weaving across lanes under a strict time clock.',
        theme: 'sunset',
        targetDist: 2500,
        timeLimit: 80,
        lanes: 4,
        trafficDensity: 'medium_high',
        trafficSpeedRange: [460, 680],
        allowLaneChange: true,
        oncomingTraffic: false,
        hazards: [],
        gripMult: 1.0,
        coinSpawnRate: 0.60
    },
    {
        id: 5,
        title: 'Downtown Midnight',
        subtitle: 'Night City Neon • Hard',
        desc: 'Pitch-black downtown highway illuminated only by your headlight beams and road work barricades.',
        theme: 'night_neon',
        targetDist: 3000,
        timeLimit: 75,
        lanes: 4,
        trafficDensity: 'high',
        trafficSpeedRange: [480, 720],
        allowLaneChange: true,
        oncomingTraffic: false,
        hazards: ['roadblock'],
        gripMult: 1.0,
        coinSpawnRate: 0.55
    },
    {
        id: 6,
        title: 'Neon Underground',
        subtitle: 'Night City Neon • Hard',
        desc: 'Underground cyber bypass. Slick oil spills cause sudden loss of steering grip; watch construction zones.',
        theme: 'night_neon',
        targetDist: 3500,
        timeLimit: 75,
        lanes: 4,
        trafficDensity: 'high',
        trafficSpeedRange: [500, 750],
        allowLaneChange: true,
        oncomingTraffic: false,
        hazards: ['roadblock', 'oil'],
        gripMult: 1.0,
        coinSpawnRate: 0.50
    },
    {
        id: 7,
        title: 'Sandstorm Dunes',
        subtitle: 'Desert Sandstorm • Expert',
        desc: 'Blinding desert gale with reduced tire traction, drifting sand barricades, and fast traffic.',
        theme: 'desert_storm',
        targetDist: 4000,
        timeLimit: 70,
        lanes: 4,
        trafficDensity: 'high',
        trafficSpeedRange: [520, 780],
        allowLaneChange: true,
        oncomingTraffic: false,
        hazards: ['roadblock'],
        gripMult: 0.82,
        coinSpawnRate: 0.45
    },
    {
        id: 8,
        title: 'Monsoon Highway',
        subtitle: 'Rain Storm • Expert',
        desc: 'Torrential downpour with slippery wet asphalt, oncoming wrong-way racers, and aggressive rival cars.',
        theme: 'rain_storm',
        targetDist: 4500,
        timeLimit: 70,
        lanes: 4,
        trafficDensity: 'high',
        trafficSpeedRange: [540, 820],
        allowLaneChange: true,
        oncomingTraffic: true,
        hazards: ['oil', 'rival'],
        gripMult: 0.74,
        coinSpawnRate: 0.45
    },
    {
        id: 9,
        title: 'Cyber Arterial',
        subtitle: 'Cyber Expressway • Master',
        desc: 'High-velocity neon corridor. Police roadblocks with flashing barriers and extreme traffic density.',
        theme: 'cyber_grid',
        targetDist: 5200,
        timeLimit: 65,
        lanes: 4,
        trafficDensity: 'very_high',
        trafficSpeedRange: [580, 860],
        allowLaneChange: true,
        oncomingTraffic: true,
        hazards: ['roadblock', 'oil', 'rival'],
        gripMult: 0.95,
        coinSpawnRate: 0.40
    },
    {
        id: 10,
        title: 'Apex Boss Run',
        subtitle: 'The Gauntlet • Extreme',
        desc: 'The ultimate survival race. Police enforcer pursuit, oncoming wrong-way speeders, and non-stop hazards.',
        theme: 'boss_run',
        targetDist: 6000,
        timeLimit: 60,
        lanes: 4,
        trafficDensity: 'extreme',
        trafficSpeedRange: [620, 920],
        allowLaneChange: true,
        oncomingTraffic: true,
        hazards: ['roadblock', 'oil', 'police_chaser', 'rival'],
        gripMult: 0.90,
        coinSpawnRate: 0.50
    }
];


/* ============================================================================
   2. PROCEDURAL SOUND SYNTHESIZER (WEB AUDIO API)
   ============================================================================ */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.initialized = false;

        // Sound Nodes
        this.engineOsc = null;
        this.engineGain = null;
        this.engineFilter = null;

        this.driftNoiseNode = null;
        this.driftGain = null;
        this.driftFilter = null;

        this.nitroNoiseNode = null;
        this.nitroGain = null;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();

            // --- 1. Procedural Engine Sound (Sawtooth + Lowpass Filter) ---
            this.engineOsc = this.ctx.createOscillator();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

            this.engineOsc.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);
            this.engineOsc.start();

            // --- 2. Procedural Tire Drift Screech (Filtered White Noise) ---
            const bufferSize = this.ctx.sampleRate * 2;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            this.driftNoiseNode = this.ctx.createBufferSource();
            this.driftNoiseNode.buffer = noiseBuffer;
            this.driftNoiseNode.loop = true;

            this.driftFilter = this.ctx.createBiquadFilter();
            this.driftFilter.type = 'bandpass';
            this.driftFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
            this.driftFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

            this.driftGain = this.ctx.createGain();
            this.driftGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

            this.driftNoiseNode.connect(this.driftFilter);
            this.driftFilter.connect(this.driftGain);
            this.driftGain.connect(this.ctx.destination);
            this.driftNoiseNode.start();

            // --- 3. Procedural Nitro Boost Jet Sound ---
            this.nitroNoiseNode = this.ctx.createBufferSource();
            this.nitroNoiseNode.buffer = noiseBuffer;
            this.nitroNoiseNode.loop = true;

            const nitroFilter = this.ctx.createBiquadFilter();
            nitroFilter.type = 'lowpass';
            nitroFilter.frequency.setValueAtTime(750, this.ctx.currentTime);

            this.nitroGain = this.ctx.createGain();
            this.nitroGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

            this.nitroNoiseNode.connect(nitroFilter);
            nitroFilter.connect(this.nitroGain);
            this.nitroGain.connect(this.ctx.destination);
            this.nitroNoiseNode.start();

            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio initialization prevented or unsupported:', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.ctx && this.isMuted) {
            if (this.engineGain) this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
            if (this.driftGain) this.driftGain.gain.setValueAtTime(0, this.ctx.currentTime);
            if (this.nitroGain) this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    update(speedRatio, isDrifting, driftIntensity, isNitro) {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Dynamic Engine Pitch & Volume
        const baseFreq = 42 + speedRatio * 180 + (isNitro ? 45 : 0);
        this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
        this.engineFilter.frequency.setTargetAtTime(250 + speedRatio * 900, now, 0.05);
        
        const targetEngineVol = 0.04 + speedRatio * 0.12 + (isNitro ? 0.06 : 0);
        this.engineGain.gain.setTargetAtTime(targetEngineVol, now, 0.05);

        // Drift Screech Volume
        const targetDriftVol = isDrifting ? Math.min(0.22, driftIntensity * 0.28) : 0;
        this.driftGain.gain.setTargetAtTime(targetDriftVol, now, 0.04);

        // Nitro Jet Volume
        const targetNitroVol = isNitro ? 0.18 : 0;
        this.nitroGain.gain.setTargetAtTime(targetNitroVol, now, 0.05);
    }

    playCrash() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.36);
        } catch (e) {}
    }

    playCoin() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now);
            osc.frequency.setValueAtTime(1318.51, now + 0.08);

            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    }

    playRepair() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.26);
        } catch (e) {}
    }

    playNitroPickup() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.25);

            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.32);
        } catch (e) {}
    }

    playWin() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        try {
            const notes = [523.25, 659.25, 783.99, 1046.5];
            notes.forEach((freq, idx) => {
                const noteTime = this.ctx.currentTime + idx * 0.12;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.25, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.35);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(noteTime);
                osc.stop(noteTime + 0.36);
            });
        } catch (e) {}
    }

    playNearMiss() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(2400, now + 0.15);

            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.24);
        } catch (e) {}
    }

    playButtonClick() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
        } catch (e) {}
    }
}

/* ============================================================================
   3. DUAL INPUT SYSTEM (KEYBOARD + ANDROID MULTI-TOUCH)
   ============================================================================ */
class InputManager {
    constructor() {
        // Unified input state
        this.steerLeft = false;
        this.steerRight = false;
        this.accelerate = false;
        this.brake = false;
        this.nitro = false;

        // Track active touch identifiers for buttons
        this.touchMap = new Map();

        // UI button element references
        this.btnLeft = document.getElementById('btn-left');
        this.btnRight = document.getElementById('btn-right');
        this.btnGas = document.getElementById('btn-gas');
        this.btnBrake = document.getElementById('btn-brake');
        this.btnNitro = document.getElementById('btn-nitro');

        this.hasInteracted = false;
        this.setupKeyboardListeners();
        this.setupTouchListeners();
        this.setupWindowListeners();
    }

    onFirstInteraction() {
        if (!this.hasInteracted) {
            this.hasInteracted = true;
            // Hide intro controls hint overlay
            const hint = document.getElementById('controls-hint');
            if (hint) {
                hint.classList.add('fade-out');
                setTimeout(() => hint.remove(), 1000);
            }
        }
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            this.onFirstInteraction();
            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    this.accelerate = true;
                    this.updateBtnClass(this.btnGas, true);
                    e.preventDefault();
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    this.brake = true;
                    this.updateBtnClass(this.btnBrake, true);
                    e.preventDefault();
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    this.steerLeft = true;
                    this.updateBtnClass(this.btnLeft, true);
                    e.preventDefault();
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    this.steerRight = true;
                    this.updateBtnClass(this.btnRight, true);
                    e.preventDefault();
                    break;
                case 'Space':
                    this.nitro = true;
                    this.updateBtnClass(this.btnNitro, true);
                    e.preventDefault();
                    break;
            }
        }, { passive: false });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    this.accelerate = false;
                    this.updateBtnClass(this.btnGas, false);
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    this.brake = false;
                    this.updateBtnClass(this.btnBrake, false);
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    this.steerLeft = false;
                    this.updateBtnClass(this.btnLeft, false);
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    this.steerRight = false;
                    this.updateBtnClass(this.btnRight, false);
                    break;
                case 'Space':
                    this.nitro = false;
                    this.updateBtnClass(this.btnNitro, false);
                    break;
            }
        });
    }

    setupTouchListeners() {
        const buttons = [
            { el: this.btnLeft, key: 'steerLeft' },
            { el: this.btnRight, key: 'steerRight' },
            { el: this.btnGas, key: 'accelerate' },
            { el: this.btnBrake, key: 'brake' },
            { el: this.btnNitro, key: 'nitro' }
        ];

        // Track touch identifier -> control key
        const touchActionMap = new Map();

        const getButtonUnderPoint = (x, y) => {
            const target = document.elementFromPoint(x, y);
            if (!target) return null;
            for (const b of buttons) {
                if (b.el && (b.el === target || b.el.contains(target))) {
                    return b;
                }
            }
            return null;
        };

        const recomputeTouchStates = () => {
            const activeKeys = new Set(touchActionMap.values());
            for (const b of buttons) {
                const isActive = activeKeys.has(b.key);
                if (this[b.key] !== isActive) {
                    this[b.key] = isActive;
                    this.updateBtnClass(b.el, isActive);
                }
            }
        };

        const handleTouchStart = (e) => {
            if (e.cancelable) e.preventDefault();
            this.onFirstInteraction();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const btn = getButtonUnderPoint(touch.clientX, touch.clientY);
                if (btn) {
                    touchActionMap.set(touch.identifier, btn.key);
                    if (navigator.vibrate) {
                        try { navigator.vibrate(12); } catch (_) {}
                    }
                }
            }
            recomputeTouchStates();
        };

        const handleTouchMove = (e) => {
            if (e.cancelable) e.preventDefault();
            let changed = false;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touchActionMap.has(touch.identifier)) {
                    const btn = getButtonUnderPoint(touch.clientX, touch.clientY);
                    const currentKey = touchActionMap.get(touch.identifier);
                    if (btn && btn.key !== currentKey) {
                        touchActionMap.set(touch.identifier, btn.key);
                        changed = true;
                    } else if (!btn && currentKey) {
                        touchActionMap.delete(touch.identifier);
                        changed = true;
                    }
                }
            }
            if (changed) recomputeTouchStates();
        };

        const handleTouchEnd = (e) => {
            if (e.cancelable) e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                touchActionMap.delete(touch.identifier);
            }
            recomputeTouchStates();
        };

        // Attach touch listeners to the touch controls container
        const touchContainer = document.getElementById('touch-controls');
        if (touchContainer) {
            touchContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
            touchContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
            touchContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
            touchContainer.addEventListener('touchcancel', handleTouchEnd, { passive: false });
        }

        // Pointer fallback for Desktop mouse testing (ignores touch pointerType)
        buttons.forEach(({ el, key }) => {
            if (!el) return;
            el.addEventListener('pointerdown', (e) => {
                if (e.pointerType === 'touch') return;
                this.onFirstInteraction();
                this[key] = true;
                this.updateBtnClass(el, true);
            });
            el.addEventListener('pointerup', (e) => {
                if (e.pointerType === 'touch') return;
                this[key] = false;
                this.updateBtnClass(el, false);
            });
            el.addEventListener('pointerleave', (e) => {
                if (e.pointerType === 'touch') return;
                this[key] = false;
                this.updateBtnClass(el, false);
            });
        });
    }


    setupWindowListeners() {
        // Prevent stuck keys when user switches tabs or window loses focus
        window.addEventListener('blur', () => {
            this.steerLeft = false;
            this.steerRight = false;
            this.accelerate = false;
            this.brake = false;
            this.nitro = false;
            this.clearAllButtonClasses();
        });
    }

    updateBtnClass(btn, active) {
        if (!btn) return;
        if (active) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    clearAllButtonClasses() {
        const btns = [this.btnLeft, this.btnRight, this.btnGas, this.btnBrake, this.btnNitro];
        btns.forEach(b => b && b.classList.remove('active'));
    }
}

/* ============================================================================
   4. PARTICLE & SKIDMARK SYSTEMS
   ============================================================================ */
class Particle {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 0;
        this.maxLife = 1;
        this.life = 0;
        this.color = '#fff';
        this.type = 'smoke'; // 'smoke', 'fire', 'nitro', 'spark', 'dust', 'debris', 'near_miss'
        this.angle = 0;
        this.rotSpeed = 0;
    }

    init(x, y, vx, vy, radius, life, color, type, angle = 0, rotSpeed = 0) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.maxLife = life;
        this.life = life;
        this.color = color;
        this.type = type;
        this.angle = angle;
        this.rotSpeed = rotSpeed;
        this.active = true;
    }

    update(dt, worldSpeed) {
        if (!this.active) return;
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        // Move with its own velocity plus the road downward scrolling
        this.x += this.vx * dt;
        this.y += (this.vy + worldSpeed) * dt;

        if (this.type === 'smoke' || this.type === 'dust') {
            this.radius += 20 * dt;
            this.vx *= 0.95;
            this.vy *= 0.95;
        } else if (this.type === 'debris') {
            this.angle += this.rotSpeed * dt;
            this.vx *= 0.97;
            this.vy *= 0.97;
        } else if (this.type === 'fire') {
            this.radius += 8 * dt;
            this.vx *= 0.96;
            this.vy *= 0.96;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        const progress = 1 - (this.life / this.maxLife);
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        ctx.globalAlpha = alpha;

        if (this.type === 'nitro') {
            ctx.fillStyle = this.color;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (1 - progress * 0.4), 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'fire') {
            ctx.fillStyle = progress > 0.4 ? '#ff5500' : '#ffea00';
            ctx.shadowColor = '#ff3300';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (1 - progress * 0.45), 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'spark') {
            ctx.strokeStyle = this.color || '#fffb88';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * 0.035, this.y - this.vy * 0.035);
            ctx.stroke();
        } else if (this.type === 'debris') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.radius, -this.radius * 0.6, this.radius * 2, this.radius * 1.2);
            ctx.restore();
        } else if (this.type === 'near_miss') {
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (1 - progress * 0.3), 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Tire smoke / dust
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.pool = Array.from({ length: CONFIG.MAX_PARTICLES || 250 }, () => new Particle());
    }

    spawn(x, y, vx, vy, radius, life, color, type, angle = 0, rotSpeed = 0) {
        const p = this.pool.find(item => !item.active);
        if (p) {
            p.init(x, y, vx, vy, radius, life, color, type, angle, rotSpeed);
        }
    }

    spawnExplosion(x, y, color = '#00f0ff') {
        // Fireballs
        for (let i = 0; i < 14; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 60 + Math.random() * 220;
            this.spawn(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                14 + Math.random() * 12,
                0.4 + Math.random() * 0.35,
                '#ff5500', 'fire'
            );
        }
        // Dense dark smoke
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 40 + Math.random() * 140;
            this.spawn(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                16 + Math.random() * 14,
                0.7 + Math.random() * 0.5,
                'rgba(40, 45, 55, 0.75)', 'smoke'
            );
        }
        // Flying rotating debris shards
        const debrisColors = [color, '#222831', '#e2e8f0', '#e74c3c'];
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 120 + Math.random() * 320;
            const rotSpeed = (Math.random() - 0.5) * 15;
            this.spawn(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                3 + Math.random() * 4,
                0.6 + Math.random() * 0.4,
                debrisColors[Math.floor(Math.random() * debrisColors.length)],
                'debris',
                Math.random() * Math.PI * 2,
                rotSpeed
            );
        }
        // High speed sparks
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 180 + Math.random() * 300;
            this.spawn(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                2.5,
                0.3 + Math.random() * 0.2,
                '#ffe066', 'spark'
            );
        }
    }

    spawnNearMiss(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 90 + Math.random() * 150;
            this.spawn(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                4 + Math.random() * 3,
                0.35 + Math.random() * 0.25,
                '#ffd700', 'near_miss'
            );
        }
    }

    update(dt, worldSpeed) {
        for (let i = 0; i < this.pool.length; i++) {
            if (this.pool[i].active) {
                this.pool[i].update(dt, worldSpeed);
            }
        }
    }

    draw(ctx) {
        for (let i = 0; i < this.pool.length; i++) {
            if (this.pool[i].active) {
                this.pool[i].draw(ctx);
            }
        }
    }
}

class SkidmarkSystem {
    constructor() {
        this.marks = []; // Array of { x1, y1, x2, y2, alpha, width }
    }

    addSegment(x1, y1, x2, y2, alpha = 0.5, width = 7) {
        this.marks.push({ x1, y1, x2, y2, alpha, width });
        if (this.marks.length > CONFIG.MAX_SKIDMARKS) {
            this.marks.shift();
        }
    }

    update(worldSpeedDt) {
        for (let i = this.marks.length - 1; i >= 0; i--) {
            const m = this.marks[i];
            m.y1 += worldSpeedDt;
            m.y2 += worldSpeedDt;
            if (m.y1 > CONFIG.CANVAS_HEIGHT + 100 && m.y2 > CONFIG.CANVAS_HEIGHT + 100) {
                this.marks.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        if (this.marks.length === 0) return;
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < this.marks.length; i++) {
            const m = this.marks[i];
            ctx.strokeStyle = `rgba(10, 12, 18, ${m.alpha})`;
            ctx.lineWidth = m.width;
            ctx.beginPath();
            ctx.moveTo(m.x1, m.y1);
            ctx.lineTo(m.x2, m.y2);
            ctx.stroke();
        }
        ctx.restore();
    }
}

/* ============================================================================
   5. DYNAMIC SPEED LINES (WARP / SPEED EFFECT)
   ============================================================================ */
class SpeedLines {
    constructor(count = 35) {
        this.lines = Array.from({ length: count }, () => this.createLine(true));
    }

    createLine(randomY = false) {
        const roadCenter = CONFIG.CANVAS_WIDTH / 2;
        const spread = CONFIG.ROAD_WIDTH * 0.7;
        return {
            x: roadCenter + (Math.random() * spread * 2 - spread),
            y: randomY ? Math.random() * CONFIG.CANVAS_HEIGHT : -120,
            length: 40 + Math.random() * 90,
            speedMultiplier: 1.2 + Math.random() * 0.9,
            width: 1.5 + Math.random() * 2,
            alpha: 0.15 + Math.random() * 0.35
        };
    }

    update(dt, carSpeed, isNitro) {
        const threshold = CONFIG.CAR.MAX_SPEED * 0.45;
        const speedFactor = Math.max(0, (carSpeed - threshold) / (CONFIG.CAR.MAX_SPEED - threshold));

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];
            const dropSpeed = (carSpeed * line.speedMultiplier + (isNitro ? 800 : 0)) * dt;
            line.y += dropSpeed;

            if (line.y > CONFIG.CANVAS_HEIGHT + 150) {
                const refreshed = this.createLine(false);
                line.x = refreshed.x;
                line.y = refreshed.y;
                line.length = refreshed.length * (isNitro ? 1.6 : 1.0);
                line.alpha = refreshed.alpha * (isNitro ? 1.4 : 1.0);
            }
        }
    }

    draw(ctx, carSpeed, isNitro) {
        const threshold = CONFIG.CAR.MAX_SPEED * 0.45;
        if (carSpeed < threshold && !isNitro) return;

        const intensity = Math.min(1, (carSpeed - threshold) / (CONFIG.CAR.MAX_SPEED * 0.55));
        ctx.save();

        for (let i = 0; i < this.lines.length; i++) {
            const l = this.lines[i];
            const lineAlpha = l.alpha * intensity * (isNitro ? 1.5 : 1);
            if (lineAlpha <= 0.02) continue;

            const grad = ctx.createLinearGradient(l.x, l.y, l.x, l.y + l.length);
            if (isNitro) {
                grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
                grad.addColorStop(0.5, `rgba(0, 240, 255, ${lineAlpha})`);
                grad.addColorStop(1, `rgba(255, 255, 255, ${lineAlpha * 1.2})`);
            } else {
                grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                grad.addColorStop(1, `rgba(255, 255, 255, ${lineAlpha})`);
            }

            ctx.strokeStyle = grad;
            ctx.lineWidth = l.width;
            ctx.beginPath();
            ctx.moveTo(l.x, l.y);
            ctx.lineTo(l.x, l.y + l.length);
            ctx.stroke();
        }

        ctx.restore();
    }
}

/* ============================================================================
   6. ROAD & PARALLAX SCENERY ENVIRONMENT
   ============================================================================ */
class RoadEnvironment {
    constructor() {
        this.scrollOffset = 0;
        this.roadLeft = (CONFIG.CANVAS_WIDTH - CONFIG.ROAD_WIDTH) / 2;
        this.roadRight = this.roadLeft + CONFIG.ROAD_WIDTH;
        this.laneWidth = CONFIG.ROAD_WIDTH / CONFIG.ROAD_LANES;

        // Stripe lengths
        this.laneDashLength = 60;
        this.laneGapLength = 50;
        this.curbSegmentLength = 40;

        // Parallax roadside props (trees, street lamps, distance signboards)
        this.props = this.generateRoadsideProps();
    }

    generateRoadsideProps() {
        const props = [];
        const count = 18;
        const spacing = 180;

        for (let i = 0; i < count; i++) {
            const y = -i * spacing;
            // Left roadside item
            props.push({
                side: 'left',
                x: this.roadLeft - CONFIG.SHOULDER_WIDTH - 40 - (Math.random() * 25),
                y: y + (Math.random() * 30),
                type: i % 3 === 0 ? 'lamp' : (i % 3 === 1 ? 'tree' : 'bush'),
                scale: 0.85 + Math.random() * 0.3
            });
            // Right roadside item
            props.push({
                side: 'right',
                x: this.roadRight + CONFIG.SHOULDER_WIDTH + 40 + (Math.random() * 25),
                y: y + (Math.random() * 30),
                type: (i + 1) % 3 === 0 ? 'lamp' : ((i + 1) % 3 === 1 ? 'tree' : 'bush'),
                scale: 0.85 + Math.random() * 0.3
            });
        }
        return props;
    }

    update(dt, carSpeed) {
        const deltaDist = carSpeed * dt;
        this.scrollOffset = (this.scrollOffset + deltaDist) % 10000;

        // Parallax scroll on roadside props
        for (let i = 0; i < this.props.length; i++) {
            const p = this.props[i];
            p.y += deltaDist;
            if (p.y > CONFIG.CANVAS_HEIGHT + 120) {
                p.y -= 18 * 180;
            }
        }
    }

    draw(ctx, theme = 'day_sunny') {
        let grass1 = '#111b15';
        let grass2 = '#0e1712';
        let shoulderColor = '#222830';
        let curbPrimary = '#e62439';
        let curbSecondary = '#f0f3f8';
        let asphaltMid = '#1e232d';
        let laneColor = 'rgba(255, 255, 255, 0.85)';

        if (theme === 'sunset') {
            grass1 = '#261b12';
            grass2 = '#1d130c';
            shoulderColor = '#332420';
            asphaltMid = '#252128';
        } else if (theme === 'night_neon') {
            grass1 = '#070a12';
            grass2 = '#05070d';
            shoulderColor = '#101420';
            curbPrimary = '#00f0ff';
            curbSecondary = '#ff007f';
            asphaltMid = '#121622';
            laneColor = 'rgba(0, 240, 255, 0.75)';
        } else if (theme === 'desert_storm') {
            grass1 = '#3d2b16';
            grass2 = '#2e2010';
            shoulderColor = '#4a361c';
            curbPrimary = '#e0a96d';
            curbSecondary = '#faedcd';
            asphaltMid = '#2b2319';
        } else if (theme === 'rain_storm') {
            grass1 = '#0a1318';
            grass2 = '#070d10';
            shoulderColor = '#141d24';
            asphaltMid = '#10151c';
            curbPrimary = '#d63031';
            curbSecondary = '#dfe6e9';
        } else if (theme === 'cyber_grid') {
            grass1 = '#060914';
            grass2 = '#090e1f';
            shoulderColor = '#0d1326';
            curbPrimary = '#00f0ff';
            curbSecondary = '#a855f7';
            asphaltMid = '#10172a';
            laneColor = 'rgba(0, 240, 255, 0.9)';
        } else if (theme === 'boss_run') {
            grass1 = '#1a070a';
            grass2 = '#120406';
            shoulderColor = '#2b0c10';
            curbPrimary = '#ff1a40';
            curbSecondary = '#3b0a11';
            asphaltMid = '#1c0e12';
            laneColor = 'rgba(255, 60, 80, 0.85)';
        }

        // --- 1. Roadside Outer Terrain / Grass Fields ---
        ctx.fillStyle = grass1;
        ctx.fillRect(0, 0, this.roadLeft, CONFIG.CANVAS_HEIGHT);
        ctx.fillRect(this.roadRight, 0, CONFIG.CANVAS_WIDTH - this.roadRight, CONFIG.CANVAS_HEIGHT);

        // Procedural grass stripes texture
        const grassStripStep = 80;
        const grassOffset = this.scrollOffset % grassStripStep;
        ctx.fillStyle = grass2;
        for (let y = -grassStripStep + grassOffset; y < CONFIG.CANVAS_HEIGHT + grassStripStep; y += grassStripStep) {
            ctx.fillRect(0, y, this.roadLeft - CONFIG.SHOULDER_WIDTH, grassStripStep * 0.5);
            ctx.fillRect(this.roadRight + CONFIG.SHOULDER_WIDTH, y, CONFIG.CANVAS_WIDTH - (this.roadRight + CONFIG.SHOULDER_WIDTH), grassStripStep * 0.5);
        }

        // --- 2. Shoulder Gravel Strips ---
        const shoulderLeft = this.roadLeft - CONFIG.SHOULDER_WIDTH;
        const shoulderRight = this.roadRight;
        ctx.fillStyle = shoulderColor;
        ctx.fillRect(shoulderLeft, 0, CONFIG.SHOULDER_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.fillRect(shoulderRight, 0, CONFIG.SHOULDER_WIDTH, CONFIG.CANVAS_HEIGHT);

        // --- 3. Rumble Curbs (Alternating theme track curbs) ---
        const curbLeft = this.roadLeft - CONFIG.CURB_WIDTH;
        const curbRight = this.roadRight;
        const curbCycle = this.curbSegmentLength * 2;
        const curbOffset = this.scrollOffset % curbCycle;

        for (let y = -curbCycle + curbOffset; y < CONFIG.CANVAS_HEIGHT + curbCycle; y += this.curbSegmentLength) {
            const isAlt = Math.floor((this.scrollOffset + (CONFIG.CANVAS_HEIGHT - y)) / this.curbSegmentLength) % 2 === 0;
            ctx.fillStyle = isAlt ? curbPrimary : curbSecondary;

            // Left Curb
            ctx.fillRect(curbLeft, y, CONFIG.CURB_WIDTH, this.curbSegmentLength);
            // Right Curb
            ctx.fillRect(curbRight, y, CONFIG.CURB_WIDTH, this.curbSegmentLength);
        }

        // Curb 3D Inner Bevel Highlight
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(this.roadLeft - 2, 0, 2, CONFIG.CANVAS_HEIGHT);
        ctx.fillRect(this.roadRight, 0, 2, CONFIG.CANVAS_HEIGHT);

        // --- 4. Main Asphalt Highway ---
        // Subtle asphalt gradient giving depth
        const asphaltGrad = ctx.createLinearGradient(this.roadLeft, 0, this.roadRight, 0);
        asphaltGrad.addColorStop(0, '#13161c');
        asphaltGrad.addColorStop(0.1, '#181b22');
        asphaltGrad.addColorStop(0.5, asphaltMid);
        asphaltGrad.addColorStop(0.9, '#181b22');
        asphaltGrad.addColorStop(1, '#13161c');
        ctx.fillStyle = asphaltGrad;
        ctx.fillRect(this.roadLeft, 0, CONFIG.ROAD_WIDTH, CONFIG.CANVAS_HEIGHT);

        // --- 5. Road Boundaries Solid White Guide Lines ---
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.roadLeft + 2, 0, 4, CONFIG.CANVAS_HEIGHT);
        ctx.fillRect(this.roadRight - 6, 0, 4, CONFIG.CANVAS_HEIGHT);

        // --- 6. Dashed Lane Divider Stripes ---
        const lanePatternLength = this.laneDashLength + this.laneGapLength;
        const laneOffset = this.scrollOffset % lanePatternLength;

        ctx.fillStyle = laneColor;
        for (let lane = 1; lane < CONFIG.ROAD_LANES; lane++) {
            const x = this.roadLeft + lane * this.laneWidth;
            for (let y = -lanePatternLength + laneOffset; y < CONFIG.CANVAS_HEIGHT + lanePatternLength; y += lanePatternLength) {
                ctx.fillRect(x - 2, y, 4, this.laneDashLength);
            }
        }

        // --- 7. Outer Metallic Guardrails with Reflectors ---
        ctx.strokeStyle = '#5a6677';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(shoulderLeft, 0);
        ctx.lineTo(shoulderLeft, CONFIG.CANVAS_HEIGHT);
        ctx.moveTo(shoulderRight + CONFIG.SHOULDER_WIDTH, 0);
        ctx.lineTo(shoulderRight + CONFIG.SHOULDER_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.stroke();

        // Guardrail reflector posts
        const postStep = 90;
        const postOffset = this.scrollOffset % postStep;
        for (let y = -postStep + postOffset; y < CONFIG.CANVAS_HEIGHT + postStep; y += postStep) {
            // Left yellow reflector
            ctx.fillStyle = '#ffb300';
            ctx.fillRect(shoulderLeft - 3, y, 6, 10);
            // Right red reflector
            ctx.fillStyle = '#ff2b44';
            ctx.fillRect(shoulderRight + CONFIG.SHOULDER_WIDTH - 3, y, 6, 10);
        }

        // --- 8. Parallax Roadside Props (Trees, Streetlamps, Bushes) ---
        for (let i = 0; i < this.props.length; i++) {
            const p = this.props[i];
            if (p.y < -80 || p.y > CONFIG.CANVAS_HEIGHT + 80) continue;
            this.drawProp(ctx, p);
        }
    }

    drawProp(ctx, prop) {
        ctx.save();
        ctx.translate(prop.x, prop.y);
        ctx.scale(prop.scale, prop.scale);

        if (prop.type === 'lamp') {
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Lamp post base
            ctx.fillStyle = '#445060';
            ctx.fillRect(-3, -35, 6, 35);

            // Lamp arm extending toward road
            const armDir = prop.side === 'left' ? 1 : -1;
            ctx.strokeStyle = '#5d6f85';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, -35);
            ctx.quadraticCurveTo(armDir * 15, -45, armDir * 28, -38);
            ctx.stroke();

            // Lamp Head Fixture
            ctx.fillStyle = '#00f0ff';
            ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(armDir * 28, -38, 5, 0, Math.PI * 2);
            ctx.fill();

            // Roadside warm light pool on asphalt
            ctx.shadowBlur = 0;
            const lightX = prop.side === 'left' ? armDir * 60 : armDir * 60;
            const lightGrad = ctx.createRadialGradient(lightX, 10, 0, lightX, 10, 90);
            lightGrad.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
            lightGrad.addColorStop(0.6, 'rgba(0, 180, 255, 0.04)');
            lightGrad.addColorStop(1, 'rgba(0, 180, 255, 0)');
            ctx.fillStyle = lightGrad;
            ctx.beginPath();
            ctx.ellipse(lightX, 10, 90, 45, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (prop.type === 'tree') {
            // Tree canopy shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(4, 6, 28, 22, 0, 0, Math.PI * 2);
            ctx.fill();

            // Dark green multi-cluster foliage
            ctx.fillStyle = '#1c3d25';
            ctx.beginPath();
            ctx.arc(-8, -4, 20, 0, Math.PI * 2);
            ctx.arc(10, -8, 22, 0, Math.PI * 2);
            ctx.arc(2, 10, 18, 0, Math.PI * 2);
            ctx.fill();

            // Highlights
            ctx.fillStyle = '#265433';
            ctx.beginPath();
            ctx.arc(-5, -6, 14, 0, Math.PI * 2);
            ctx.arc(6, -10, 15, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Bush
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(2, 4, 16, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1f482d';
            ctx.beginPath();
            ctx.arc(-6, 0, 12, 0, Math.PI * 2);
            ctx.arc(6, -2, 13, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

/* ============================================================================
   7. VEHICLE RENDERER - 10 PROCEDURAL VECTOR MODELS (ZERO EXTERNAL IMAGES)
   ============================================================================ */
class VehicleRenderer {
    static draw(ctx, car, isBraking, steerAngle, isNitro, time = 0, isPodium = false, speed = 0) {
        if (!car) return;
        const w = car.width || 56;
        const h = car.length || 108;
        const hw = w / 2;
        const hh = h / 2;

        ctx.save();

        // 1. Drop Shadow
        this.drawDropShadow(ctx, hw, hh, isPodium);

        // 2. Projected Headlight Cones (On-Track Only)
        if (!isPodium) {
            this.drawHeadlightBeams(ctx, hw, hh, speed, car.id);
        }

        // 3. Render specific car model
        switch (car.id) {
            case 'car_1':
                this.drawRustyHatchback(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium);
                break;
            case 'car_2':
                this.drawCitySedan(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium);
                break;
            case 'car_3':
                this.drawStreetTuner(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium);
                break;
            case 'car_4':
                this.drawClassicMuscle(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium);
                break;
            case 'car_5':
                this.drawOffroadPickup(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium);
                break;
            case 'car_6':
                this.drawPoliceInterceptor(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium);
                break;
            case 'car_7':
                this.drawCyberNeonCoupe(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium);
                break;
            case 'car_8':
                this.drawApexSupercar(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium);
                break;
            case 'car_9':
                this.drawFormula2D(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium);
                break;
            case 'car_10':
                this.drawHyperJet(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium);
                break;
            default:
                this.drawApexSupercar(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium);
                break;
        }

        ctx.restore();
    }

    static drawDropShadow(ctx, hw, hh, isPodium) {
        ctx.fillStyle = isPodium ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.roundRect(-hw - 4, -hh + 6, hw * 2 + 8, hh * 2 + 8, 14);
        ctx.fill();
    }

    static drawHeadlightBeams(ctx, hw, hh, speed, carId) {
        const beamLength = 350 + (speed / 1300) * 120;
        const beamSpread = carId === 'car_5' ? 95 : 75; // 4x4 has wider rally spread

        const beamColor = carId === 'car_1' ? 'rgba(255, 235, 170, 0.5)' : 
                          (carId === 'car_7' ? 'rgba(0, 240, 255, 0.7)' : 'rgba(220, 245, 255, 0.65)');

        // Left Headlight
        const leftBeam = ctx.createRadialGradient(-hw + 8, -hh + 10, 5, -hw - 10, -hh - beamLength * 0.7, beamSpread * 2);
        leftBeam.addColorStop(0, beamColor);
        leftBeam.addColorStop(0.35, 'rgba(0, 200, 255, 0.18)');
        leftBeam.addColorStop(1, 'rgba(0, 200, 255, 0)');

        ctx.fillStyle = leftBeam;
        ctx.beginPath();
        ctx.moveTo(-hw + 8, -hh + 10);
        ctx.lineTo(-hw - beamSpread, -hh - beamLength);
        ctx.lineTo(-hw + 8, -hh - beamLength);
        ctx.closePath();
        ctx.fill();

        // Right Headlight
        const rightBeam = ctx.createRadialGradient(hw - 8, -hh + 10, 5, hw + 10, -hh - beamLength * 0.7, beamSpread * 2);
        rightBeam.addColorStop(0, beamColor);
        rightBeam.addColorStop(0.35, 'rgba(0, 200, 255, 0.18)');
        rightBeam.addColorStop(1, 'rgba(0, 200, 255, 0)');

        ctx.fillStyle = rightBeam;
        ctx.beginPath();
        ctx.moveTo(hw - 8, -hh + 10);
        ctx.lineTo(hw - 8, -hh - beamLength);
        ctx.lineTo(hw + beamSpread, -hh - beamLength);
        ctx.closePath();
        ctx.fill();
    }

    static renderWheel(ctx, x, y, angle, w = 10, l = 22, rimColor = '#4f5b6e', isTreaded = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Black Rubber Tire
        ctx.fillStyle = '#111317';
        ctx.beginPath();
        ctx.roundRect(-w / 2, -l / 2, w, l, 3);
        ctx.fill();

        // Off-road aggressive knobby tread lugs
        if (isTreaded) {
            ctx.fillStyle = '#22252a';
            for (let ty = -l / 2 + 3; ty < l / 2 - 2; ty += 5) {
                ctx.fillRect(-w / 2, ty, 2, 2.5);
                ctx.fillRect(w / 2 - 2, ty, 2, 2.5);
            }
        }

        // Metallic Rim
        ctx.fillStyle = rimColor;
        ctx.fillRect(-1.5, -l / 2 + 3, 3, l - 6);

        ctx.restore();
    }

    // ------------------------------------------------------------------------
    // CAR 1: RUSTY HATCHBACK (STARTER - BALANCED, SLOW)
    // ------------------------------------------------------------------------
    static drawRustyHatchback(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium) {
        // Steerable Wheels
        this.renderWheel(ctx, -hw - 1, -hh + 24, steerAngle, 9, 20, '#3a3a3a');
        this.renderWheel(ctx, hw + 1, -hh + 24, steerAngle, 9, 20, '#3a3a3a');
        this.renderWheel(ctx, -hw - 1, hh - 22, 0, 9, 20, '#3a3a3a');
        this.renderWheel(ctx, hw + 1, hh - 22, 0, 9, 20, '#3a3a3a');

        // Compact Rounded Hatchback Body (Olive-Brown with Rust Patches)
        const bodyGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
        bodyGrad.addColorStop(0, '#544632');
        bodyGrad.addColorStop(0.5, '#6e5d42');
        bodyGrad.addColorStop(1, '#544632');
        ctx.fillStyle = bodyGrad;

        ctx.beginPath();
        ctx.moveTo(-hw + 8, -hh);
        ctx.quadraticCurveTo(0, -hh - 4, hw - 8, -hh);
        ctx.quadraticCurveTo(hw + 2, -hh + 14, hw, -hh + 30);
        ctx.lineTo(hw - 1, hh - 20);
        ctx.quadraticCurveTo(hw, hh, hw - 6, hh);
        ctx.lineTo(-hw + 6, hh);
        ctx.quadraticCurveTo(-hw, hh, -hw + 1, hh - 20);
        ctx.lineTo(-hw, -hh + 30);
        ctx.quadraticCurveTo(-hw - 2, -hh + 14, -hw + 8, -hh);
        ctx.closePath();
        ctx.fill();

        // Rust Spots & Scratch Patches
        ctx.fillStyle = '#823e1d';
        ctx.beginPath();
        ctx.arc(-hw + 10, -hh + 18, 5, 0, Math.PI * 2);
        ctx.arc(hw - 12, hh - 14, 6, 0, Math.PI * 2);
        ctx.arc(-2, -hh + 32, 4, 0, Math.PI * 2);
        ctx.fill();

        // Cabin Windows
        ctx.fillStyle = '#1a2228';
        ctx.beginPath();
        ctx.roundRect(-hw + 7, -hh + 30, (hw - 7) * 2, (hh - 18) * 1.2, 5);
        ctx.fill();

        // Windshield Glass with Glare
        ctx.fillStyle = 'rgba(100, 150, 180, 0.7)';
        ctx.beginPath();
        ctx.moveTo(-hw + 9, -hh + 32);
        ctx.lineTo(hw - 9, -hh + 32);
        ctx.lineTo(hw - 11, -hh + 50);
        ctx.lineTo(-hw + 11, -hh + 50);
        ctx.closePath();
        ctx.fill();

        // Roof Rack with Mounted Spare Tire!
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 2;
        ctx.strokeRect(-hw + 10, -hh + 54, (hw - 10) * 2, 28);
        ctx.beginPath();
        ctx.moveTo(-hw + 10, -hh + 68);
        ctx.lineTo(hw - 10, -hh + 68);
        ctx.stroke();

        // Mounted Spare Wheel on Roof Rack
        ctx.fillStyle = '#1c1e22';
        ctx.beginPath();
        ctx.arc(0, -hh + 68, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8b5a2b';
        ctx.beginPath();
        ctx.arc(0, -hh + 68, 5, 0, Math.PI * 2);
        ctx.fill();

        // Vintage Round Headlights (Warm Incandescent Yellow)
        ctx.fillStyle = '#ffeaa7';
        ctx.shadowColor = '#ffeaa7';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(-hw + 8, -hh + 2, 4, 0, Math.PI * 2);
        ctx.arc(hw - 8, -hh + 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Taillights
        ctx.fillStyle = isBraking ? '#ff1e42' : '#c0392b';
        if (isBraking) { ctx.shadowColor = '#ff1e42'; ctx.shadowBlur = 12; }
        ctx.fillRect(-hw + 5, hh - 3, 8, 3);
        ctx.fillRect(hw - 13, hh - 3, 8, 3);
        ctx.shadowBlur = 0;
    }

    // ------------------------------------------------------------------------
    // CAR 2: CITY SEDAN (HIGH HANDLING, EXECUTIVE 4-DOOR)
    // ------------------------------------------------------------------------
    static drawCitySedan(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium) {
        // Wheels
        this.renderWheel(ctx, -hw - 1, -hh + 26, steerAngle, 9, 22, '#95a5a6');
        this.renderWheel(ctx, hw + 1, -hh + 26, steerAngle, 9, 22, '#95a5a6');
        this.renderWheel(ctx, -hw - 1, hh - 24, 0, 9, 22, '#95a5a6');
        this.renderWheel(ctx, hw + 1, hh - 24, 0, 9, 22, '#95a5a6');

        // Royal Sapphire Metallic Body
        const bodyGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
        bodyGrad.addColorStop(0, '#0d3268');
        bodyGrad.addColorStop(0.2, '#1a529e');
        bodyGrad.addColorStop(0.5, '#226bb8');
        bodyGrad.addColorStop(0.8, '#1a529e');
        bodyGrad.addColorStop(1, '#0d3268');
        ctx.fillStyle = bodyGrad;

        ctx.beginPath();
        ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 10);
        ctx.fill();

        // Chrome Front Grille
        ctx.fillStyle = '#dcdde1';
        ctx.fillRect(-12, -hh - 1, 24, 3);

        // Chrome Window Trim & 4-Door Glass Cabin
        ctx.fillStyle = '#0b1320';
        ctx.beginPath();
        ctx.roundRect(-hw + 7, -hh + 30, (hw - 7) * 2, (hh - 15) * 1.25, 6);
        ctx.fill();

        // Windshield Glass with Crisp Reflection
        const glassGrad = ctx.createLinearGradient(0, -hh + 32, 0, -hh + 54);
        glassGrad.addColorStop(0, 'rgba(120, 190, 240, 0.85)');
        glassGrad.addColorStop(1, 'rgba(20, 45, 70, 0.9)');
        ctx.fillStyle = glassGrad;
        ctx.beginPath();
        ctx.moveTo(-hw + 9, -hh + 32);
        ctx.lineTo(hw - 9, -hh + 32);
        ctx.lineTo(hw - 11, -hh + 54);
        ctx.lineTo(-hw + 11, -hh + 54);
        ctx.closePath();
        ctx.fill();

        // Center B-Pillars for Executive Sedan
        ctx.strokeStyle = '#2f3640';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-hw + 7, -hh + 66);
        ctx.lineTo(hw - 7, -hh + 66);
        ctx.stroke();

        // Rear Glass
        ctx.fillStyle = 'rgba(25, 45, 65, 0.85)';
        ctx.fillRect(-hw + 10, hh - 42, (hw - 10) * 2, 14);

        // Sleek Trunk Lip Spoiler
        ctx.fillStyle = '#0d284f';
        ctx.fillRect(-hw + 6, hh - 4, (hw - 6) * 2, 4);

        // Modern Horizontal LED Headlights
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00a8ff';
        ctx.shadowBlur = 6;
        ctx.fillRect(-hw + 4, -hh + 2, 10, 3);
        ctx.fillRect(hw - 14, -hh + 2, 10, 3);
        ctx.shadowBlur = 0;

        // Taillights
        ctx.fillStyle = isBraking ? '#ff1e42' : '#e84118';
        if (isBraking) { ctx.shadowColor = '#ff1e42'; ctx.shadowBlur = 14; }
        ctx.fillRect(-hw + 5, hh - 3, 12, 3);
        ctx.fillRect(hw - 17, hh - 3, 12, 3);
        ctx.shadowBlur = 0;
    }

    // ------------------------------------------------------------------------
    // CAR 3: STREET TUNER (QUICK ACCELERATION, DRIFT-FRIENDLY JDM)
    // ------------------------------------------------------------------------
    static drawStreetTuner(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium) {
        // Gold Tuner Wheels with slight camber
        this.renderWheel(ctx, -hw - 2, -hh + 26, steerAngle, 10, 22, '#f39c12');
        this.renderWheel(ctx, hw + 2, -hh + 26, steerAngle, 10, 22, '#f39c12');
        this.renderWheel(ctx, -hw - 2, hh - 26, 0, 10, 22, '#f39c12');
        this.renderWheel(ctx, hw + 2, hh - 26, 0, 10, 22, '#f39c12');

        // Sunburst Pearl Gold/Orange Body with Wide Arch Flares
        const bodyGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
        bodyGrad.addColorStop(0, '#cc7000');
        bodyGrad.addColorStop(0.2, '#ff9900');
        bodyGrad.addColorStop(0.5, '#ffb833');
        bodyGrad.addColorStop(0.8, '#ff9900');
        bodyGrad.addColorStop(1, '#cc7000');
        ctx.fillStyle = bodyGrad;

        ctx.beginPath();
        ctx.moveTo(-hw + 8, -hh);
        ctx.lineTo(hw - 8, -hh);
        ctx.quadraticCurveTo(hw + 4, -hh + 24, hw + 2, -hh + 40);
        ctx.lineTo(hw - 1, hh - 40);
        ctx.quadraticCurveTo(hw + 5, hh - 24, hw - 2, hh);
        ctx.lineTo(-hw + 2, hh);
        ctx.quadraticCurveTo(-hw - 5, hh - 24, -hw + 1, hh - 40);
        ctx.lineTo(-hw - 2, -hh + 40);
        ctx.quadraticCurveTo(-hw - 4, -hh + 24, -hw + 8, -hh);
        ctx.closePath();
        ctx.fill();

        // Aggressive Front Intercooler Bumper Mesh
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-14, -hh - 2, 28, 4);
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(-10, -hh - 1, 20, 2);

        // Bold Dual White Racing Stripes with Black Pinstripes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, -hh, 4, hh * 2);
        ctx.fillRect(2, -hh, 4, hh * 2);

        // Dark Tinted Cockpit
        ctx.fillStyle = '#0a0d12';
        ctx.beginPath();
        ctx.roundRect(-hw + 8, -hh + 34, (hw - 8) * 2, (hh - 20) * 1.3, 7);
        ctx.fill();

        // Front Windshield with Banner Sticker ("APEX DRIFT")
        ctx.fillStyle = 'rgba(70, 180, 255, 0.7)';
        ctx.fillRect(-hw + 10, -hh + 36, (hw - 10) * 2, 20);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-hw + 10, -hh + 36, (hw - 10) * 2, 4);

        // Large Aluminum Drift GT Wing Spoiler
        ctx.fillStyle = '#111111';
        // Struts
        ctx.fillRect(-12, hh - 12, 3, 10);
        ctx.fillRect(9, hh - 12, 3, 10);
        // Wing Blade
        ctx.fillStyle = '#1e272e';
        ctx.beginPath();
        ctx.roundRect(-hw - 2, hh - 14, hw * 2 + 4, 7, 2);
        ctx.fill();
        // Red Wing Endplates
        ctx.fillStyle = '#ff9900';
        ctx.fillRect(-hw - 3, hh - 16, 3, 11);
        ctx.fillRect(hw, hh - 16, 3, 11);

        // Big Bore Titanium Exhaust Tip
        ctx.fillStyle = '#3498db';
        ctx.fillRect(hw - 12, hh - 2, 6, 4);

        // Headlights
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.fillRect(-hw + 6, -hh + 2, 8, 4);
        ctx.fillRect(hw - 14, -hh + 2, 8, 4);
        ctx.shadowBlur = 0;

        // Taillights
        ctx.fillStyle = isBraking ? '#ff0033' : '#c0392b';
        if (isBraking) { ctx.shadowColor = '#ff0033'; ctx.shadowBlur = 14; }
        ctx.fillRect(-hw + 6, hh - 4, 10, 3);
        ctx.fillRect(hw - 16, hh - 4, 10, 3);
        ctx.shadowBlur = 0;
    }

    // ------------------------------------------------------------------------
    // CAR 4: CLASSIC MUSCLE (AMERICAN BIG-BLOCK V8, BLOWER SCOOP)
    // ------------------------------------------------------------------------
    static drawClassicMuscle(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium) {
        // Front Standard Wheels
        this.renderWheel(ctx, -hw - 1, -hh + 28, steerAngle, 10, 22, '#7f8c8d');
        this.renderWheel(ctx, hw + 1, -hh + 28, steerAngle, 10, 22, '#7f8c8d');
        // Extra-Wide Fat Drag Radials at Rear
        this.renderWheel(ctx, -hw - 3, hh - 26, 0, 13, 26, '#7f8c8d');
        this.renderWheel(ctx, hw + 3, hh - 26, 0, 13, 26, '#7f8c8d');

        // Crimson Blood Red Muscular Body with Long Hood
        const bodyGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
        bodyGrad.addColorStop(0, '#78080e');
        bodyGrad.addColorStop(0.25, '#b3121b');
        bodyGrad.addColorStop(0.5, '#d61a24');
        bodyGrad.addColorStop(0.75, '#b3121b');
        bodyGrad.addColorStop(1, '#78080e');
        ctx.fillStyle = bodyGrad;

        ctx.beginPath();
        ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 7);
        ctx.fill();

        // Heavy Chrome Bumpers Front and Rear
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(-hw + 2, -hh - 2, (hw - 2) * 2, 3);
        ctx.fillRect(-hw + 2, hh - 1, (hw - 2) * 2, 3);

        // Dual Wide Matte Black Racing Stripes
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(-10, -hh, 7, hh * 2);
        ctx.fillRect(3, -hh, 7, hh * 2);

        // Protruding Chrome Supercharger Blower Scoop through Hood!
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(-9, -hh + 22, 18, 18);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-7, -hh + 24, 14, 14);

        // 3 Red Butterfly Valve Throttle Plates
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(-4, -hh + 31, 2.5, 0, Math.PI * 2);
        ctx.arc(0, -hh + 31, 2.5, 0, Math.PI * 2);
        ctx.arc(4, -hh + 31, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Fastback Cockpit Windows
        ctx.fillStyle = '#0f141c';
        ctx.beginPath();
        ctx.roundRect(-hw + 7, -hh + 48, (hw - 7) * 2, (hh - 24) * 1.1, 5);
        ctx.fill();

        // Windshield
        ctx.fillStyle = 'rgba(120, 180, 220, 0.75)';
        ctx.fillRect(-hw + 9, -hh + 50, (hw - 9) * 2, 18);

        // Quad Round Muscle Headlights
        ctx.fillStyle = '#fff4a3';
        ctx.beginPath();
        ctx.arc(-hw + 6, -hh + 3, 3, 0, Math.PI * 2);
        ctx.arc(-hw + 14, -hh + 3, 3, 0, Math.PI * 2);
        ctx.arc(hw - 14, -hh + 3, 3, 0, Math.PI * 2);
        ctx.arc(hw - 6, -hh + 3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Triple Vertical Taillights (Classic Muscle Style)
        ctx.fillStyle = isBraking ? '#ff0033' : '#c0392b';
        if (isBraking) { ctx.shadowColor = '#ff0033'; ctx.shadowBlur = 14; }
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(-hw + 5 + i * 4, hh - 4, 2.5, 3);
            ctx.fillRect(hw - 15 + i * 4, hh - 4, 2.5, 3);
        }
        ctx.shadowBlur = 0;
    }

    // ------------------------------------------------------------------------
    // CAR 5: OFF-ROAD 4x4 PICKUP (HEAVY ARMOR, BULL BAR, ROOF RALLY LAMPS)
    // ------------------------------------------------------------------------
    static drawOffroadPickup(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium) {
        // Massive Knobby All-Terrain Mud Tires
        this.renderWheel(ctx, -hw - 3, -hh + 28, steerAngle, 14, 26, '#4b4b4b', true);
        this.renderWheel(ctx, hw + 3, -hh + 28, steerAngle, 14, 26, '#4b4b4b', true);
        this.renderWheel(ctx, -hw - 3, hh - 28, 0, 14, 26, '#4b4b4b', true);
        this.renderWheel(ctx, hw + 3, hh - 28, 0, 14, 26, '#4b4b4b', true);

        // Military Sand / Desert Camo Armored Body
        const bodyGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
        bodyGrad.addColorStop(0, '#5f543e');
        bodyGrad.addColorStop(0.3, '#7d705a');
        bodyGrad.addColorStop(0.7, '#8f816a');
        bodyGrad.addColorStop(1, '#5f543e');
        ctx.fillStyle = bodyGrad;

        ctx.beginPath();
        ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 6);
        ctx.fill();

        // Heavy Steel Front Bull Bar with Recovery Winch
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 4;
        ctx.strokeRect(-hw + 6, -hh - 4, (hw - 6) * 2, 5);
        ctx.fillStyle = '#e74c3c'; // Winch drum
        ctx.fillRect(-5, -hh - 3, 10, 4);

        // Cab Windows
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(-hw + 8, -hh + 30, (hw - 8) * 2, 40);

        // Windshield
        ctx.fillStyle = 'rgba(100, 180, 220, 0.7)';
        ctx.fillRect(-hw + 10, -hh + 32, (hw - 10) * 2, 16);

        // Roof-Mounted 4-Pod High-Intensity Rally Lightbar
        ctx.fillStyle = '#fffa65';
        ctx.shadowColor = '#fffa65';
        ctx.shadowBlur = 8;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(-12 + i * 8, -hh + 27, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Open Pickup Cargo Bed with Roll Cage
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(-hw + 7, hh - 42, (hw - 7) * 2, 38);

        // Tubular Roll Cage Rails
        ctx.strokeStyle = '#636e72';
        ctx.lineWidth = 3;
        ctx.strokeRect(-hw + 8, hh - 40, (hw - 8) * 2, 34);

        // Full-Size Spare Tire Secured in Cargo Bed
        ctx.fillStyle = '#111317';
        ctx.beginPath();
        ctx.arc(0, hh - 22, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d63031'; // Tie-down cross strap
        ctx.fillRect(-12, hh - 23, 24, 2);
        ctx.fillRect(-1, hh - 34, 2, 24);

        // Heavy Duty Tailgate & Taillights
        ctx.fillStyle = isBraking ? '#ff0033' : '#c0392b';
        if (isBraking) { ctx.shadowColor = '#ff0033'; ctx.shadowBlur = 14; }
        ctx.fillRect(-hw + 5, hh - 3, 6, 3);
        ctx.fillRect(hw - 11, hh - 3, 6, 3);
        ctx.shadowBlur = 0;
    }

    // ------------------------------------------------------------------------
    // CAR 6: POLICE INTERCEPTOR (FLASHING STROBE SIRENS, PUSH BUMPER)
    // ------------------------------------------------------------------------
    static drawPoliceInterceptor(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium) {
        // Pursuit Wheels
        this.renderWheel(ctx, -hw - 1, -hh + 26, steerAngle, 10, 22, '#2f3640');
        this.renderWheel(ctx, hw + 1, -hh + 26, steerAngle, 10, 22, '#2f3640');
        this.renderWheel(ctx, -hw - 1, hh - 26, 0, 10, 22, '#2f3640');
        this.renderWheel(ctx, hw + 1, hh - 26, 0, 10, 22, '#2f3640');

        // Black & White Enforcer Chassis
        ctx.fillStyle = '#12161f'; // Gloss Black
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 9);
        ctx.fill();

        // White Roof & White Front Doors
        ctx.fillStyle = '#f5f6fa';
        ctx.fillRect(-hw + 4, -hh + 34, (hw - 4) * 2, hh * 1.05);

        // Heavy Steel Front Push Bumper (Bull Bar)
        ctx.fillStyle = '#2f3640';
        ctx.fillRect(-hw + 6, -hh - 4, (hw - 6) * 2, 5);
        ctx.fillStyle = '#111111'; // Rubber push pads
        ctx.fillRect(-10, -hh - 6, 4, 8);
        ctx.fillRect(6, -hh - 6, 4, 8);

        // Gold Police Star Badge & Decal on Roof
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(0, -hh + 60, 5, 0, Math.PI * 2);
        ctx.fill();

        // Cockpit Glass
        ctx.fillStyle = '#0f141d';
        ctx.fillRect(-hw + 8, -hh + 30, (hw - 8) * 2, 16);
        ctx.fillRect(-hw + 8, hh - 34, (hw - 8) * 2, 14);

        // --- ANIMATED RED & BLUE EMERGENCY STROBE LIGHTBAR ---
        const flashRate = time * 9;
        const isRedFlash = Math.sin(flashRate) > 0;
        const isBlueFlash = !isRedFlash;

        // Lightbar Frame
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(-14, -hh + 48, 28, 7);

        // Red Strobe LED (Left)
        ctx.fillStyle = isRedFlash ? '#ff0033' : '#660011';
        if (isRedFlash) {
            ctx.shadowColor = '#ff0033';
            ctx.shadowBlur = 18;
        }
        ctx.fillRect(-13, -hh + 49, 12, 5);
        ctx.shadowBlur = 0;

        // Blue Strobe LED (Right)
        ctx.fillStyle = isBlueFlash ? '#0088ff' : '#002266';
        if (isBlueFlash) {
            ctx.shadowColor = '#00d2ff';
            ctx.shadowBlur = 18;
        }
        ctx.fillRect(1, -hh + 49, 12, 5);
        ctx.shadowBlur = 0;

        // Emergency Light Halo Casting on Road/Podium
        if (!isPodium) {
            ctx.fillStyle = isRedFlash ? 'rgba(255, 0, 50, 0.14)' : 'rgba(0, 140, 255, 0.14)';
            ctx.beginPath();
            ctx.ellipse(0, 0, hw * 2.8, hh * 1.8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Taillights
        ctx.fillStyle = isBraking ? '#ff0033' : '#c0392b';
        if (isBraking) { ctx.shadowColor = '#ff0033'; ctx.shadowBlur = 14; }
        ctx.fillRect(-hw + 5, hh - 3, 10, 3);
        ctx.fillRect(hw - 15, hh - 3, 10, 3);
        ctx.shadowBlur = 0;
    }

    // ------------------------------------------------------------------------
    // CAR 7: CYBER NEON COUPE (SYNTHWAVE, PULSING UNDERGLOW, DUAL NITRO)
    // ------------------------------------------------------------------------
    static drawCyberNeonCoupe(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium) {
        // --- PULSING CYBER NEON UNDERGLOW ON GROUND ---
        const pulse = 0.5 + 0.5 * Math.sin(time * 5);
        const underglowColor = isNitro ? '#00f0ff' : (pulse > 0.5 ? '#ff007f' : '#00f0ff');
        ctx.fillStyle = underglowColor;
        ctx.shadowColor = underglowColor;
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.ellipse(0, 0, hw + 14, hh + 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Futuristic Cyber Wheels
        this.renderWheel(ctx, -hw - 1, -hh + 26, steerAngle, 10, 22, '#00f0ff');
        this.renderWheel(ctx, hw + 1, -hh + 26, steerAngle, 10, 22, '#00f0ff');
        this.renderWheel(ctx, -hw - 1, hh - 26, 0, 10, 22, '#ff007f');
        this.renderWheel(ctx, hw + 1, hh - 26, 0, 10, 22, '#ff007f');

        // Geometric Low-Poly Synthwave Wedge Body
        const bodyGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
        bodyGrad.addColorStop(0, '#0c0918');
        bodyGrad.addColorStop(0.5, '#1b1430');
        bodyGrad.addColorStop(1, '#0c0918');
        ctx.fillStyle = bodyGrad;

        ctx.beginPath();
        ctx.moveTo(-hw + 12, -hh);
        ctx.lineTo(hw - 12, -hh);
        ctx.lineTo(hw + 2, -hh + 28);
        ctx.lineTo(hw, hh - 22);
        ctx.lineTo(hw - 6, hh);
        ctx.lineTo(-hw + 6, hh);
        ctx.lineTo(-hw, hh - 22);
        ctx.lineTo(-hw - 2, -hh + 28);
        ctx.closePath();
        ctx.fill();

        // Neon Cyber Body Contour Trim Lines
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-hw + 10, -hh + 4);
        ctx.lineTo(-hw + 2, -hh + 28);
        ctx.lineTo(-hw + 4, hh - 12);
        ctx.stroke();

        ctx.strokeStyle = '#ff007f';
        ctx.beginPath();
        ctx.moveTo(hw - 10, -hh + 4);
        ctx.lineTo(hw - 2, -hh + 28);
        ctx.lineTo(hw - 4, hh - 12);
        ctx.stroke();

        // Full-Width Continuous Front Laser Lightstrip
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(-hw + 10, -hh - 1, (hw - 10) * 2, 3);
        ctx.shadowBlur = 0;

        // Cockpit Canopy (Dark Glass)
        ctx.fillStyle = '#090812';
        ctx.beginPath();
        ctx.roundRect(-hw + 9, -hh + 32, (hw - 9) * 2, 44, 6);
        ctx.fill();

        // Transparent Rear Engine Hatch Showing DUAL NITRO TANKS!
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-hw + 10, hh - 38, (hw - 10) * 2, 24);

        // Twin Cyan NOS Cylinders with Glow
        ctx.fillStyle = '#00d2ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.fillRect(-9, hh - 34, 6, 16);
        ctx.fillRect(3, hh - 34, 6, 16);
        ctx.shadowBlur = 0;

        // Full-Width Rear Continuous Neon Lightstrip
        ctx.fillStyle = isBraking ? '#ff0055' : '#ff007f';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = isBraking ? 18 : 8;
        ctx.fillRect(-hw + 6, hh - 3, (hw - 6) * 2, 4);
        ctx.shadowBlur = 0;
    }

    // ------------------------------------------------------------------------
    // CAR 8: APEX SUPERCAR (AERODYNAMIC HYPERCAR, ACTIVE WING)
    // ------------------------------------------------------------------------
    static drawApexSupercar(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium) {
        // High Performance Magnesium Wheels
        this.renderWheel(ctx, -hw - 1, -hh + 28, steerAngle, 10, 22, '#48dbfb');
        this.renderWheel(ctx, hw + 1, -hh + 28, steerAngle, 10, 22, '#48dbfb');
        this.renderWheel(ctx, -hw - 1, hh - 28, 0, 10, 22, '#48dbfb');
        this.renderWheel(ctx, hw + 1, hh - 28, 0, 10, 22, '#48dbfb');

        // Electric Azure Carbon Bodywork
        const bodyGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
        bodyGrad.addColorStop(0, '#005b8a');
        bodyGrad.addColorStop(0.2, '#0090d4');
        bodyGrad.addColorStop(0.5, '#00e1ff');
        bodyGrad.addColorStop(0.8, '#0090d4');
        bodyGrad.addColorStop(1, '#005b8a');
        ctx.fillStyle = bodyGrad;

        ctx.beginPath();
        ctx.moveTo(-hw + 10, -hh);
        ctx.quadraticCurveTo(0, -hh - 5, hw - 10, -hh);
        ctx.quadraticCurveTo(hw + 4, -hh + 18, hw, -hh + 38);
        ctx.quadraticCurveTo(hw - 5, 0, hw + 2, hh - 38);
        ctx.quadraticCurveTo(hw + 5, hh - 12, hw - 4, hh);
        ctx.lineTo(-hw + 4, hh);
        ctx.quadraticCurveTo(-hw - 5, hh - 12, -hw - 2, hh - 38);
        ctx.quadraticCurveTo(-hw + 5, 0, -hw, -hh + 38);
        ctx.quadraticCurveTo(-hw - 4, -hh + 18, -hw + 10, -hh);
        ctx.closePath();
        ctx.fill();

        // Carbon Front Canards
        ctx.fillStyle = '#11151c';
        ctx.fillRect(-hw - 3, -hh + 14, 4, 8);
        ctx.fillRect(hw - 1, -hh + 14, 4, 8);

        // Teardrop Cockpit Canopy
        ctx.fillStyle = '#0a0e14';
        ctx.beginPath();
        ctx.roundRect(-hw + 9, -hh + 38, (hw - 9) * 2, hh * 0.9, 8);
        ctx.fill();

        // Windshield Titanium Glare
        const glassGrad = ctx.createLinearGradient(0, -hh + 40, 0, -hh + 70);
        glassGrad.addColorStop(0, 'rgba(80, 200, 255, 0.85)');
        glassGrad.addColorStop(1, 'rgba(10, 20, 30, 0.95)');
        ctx.fillStyle = glassGrad;
        ctx.fillRect(-hw + 11, -hh + 40, (hw - 11) * 2, 24);

        // Dual Projector Headlights
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.fillRect(-hw + 7, -hh + 4, 7, 10);
        ctx.fillRect(hw - 14, -hh + 4, 7, 10);
        ctx.shadowBlur = 0;

        // Active Carbon Wing (Angles up during braking)
        ctx.fillStyle = '#080a0f';
        const wingOffset = isBraking ? -3 : 0;
        ctx.fillRect(-hw + 2, hh - 12 + wingOffset, (hw - 2) * 2, 6);

        // Taillights
        ctx.fillStyle = isBraking ? '#ff1e42' : '#d91432';
        if (isBraking) { ctx.shadowColor = '#ff0033'; ctx.shadowBlur = 18; }
        ctx.fillRect(-hw + 5, hh - 4, (hw - 5) * 2, 4);
        ctx.shadowBlur = 0;
    }

    // ------------------------------------------------------------------------
    // CAR 9: FORMULA 2D OPEN-WHEEL (EXTREME HANDLING, EXPOSED SLICKS)
    // ------------------------------------------------------------------------
    static drawFormula2D(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium) {
        // Exposed Suspension Arms (Front & Rear Double-Wishbones)
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        // Front Wishbones
        ctx.beginPath();
        ctx.moveTo(-hw + 8, -hh + 32); ctx.lineTo(-hw - 8, -hh + 32);
        ctx.moveTo(hw - 8, -hh + 32); ctx.lineTo(hw + 8, -hh + 32);
        // Rear Wishbones
        ctx.moveTo(-hw + 8, hh - 28); ctx.lineTo(-hw - 8, hh - 28);
        ctx.moveTo(hw - 8, hh - 28); ctx.lineTo(hw + 8, hh - 28);
        ctx.stroke();

        // 4 Wide Open-Wheel Slicks Outside the Fuselage
        this.renderWheel(ctx, -hw - 9, -hh + 32, steerAngle, 12, 26, '#e67e22');
        this.renderWheel(ctx, hw + 9, -hh + 32, steerAngle, 12, 26, '#e67e22');
        this.renderWheel(ctx, -hw - 9, hh - 28, 0, 14, 28, '#e67e22');
        this.renderWheel(ctx, hw + 9, hh - 28, 0, 14, 28, '#e67e22');

        // British Racing Green Slender Formula Monocoque Fuselage
        const bodyGrad = ctx.createLinearGradient(-16, 0, 16, 0);
        bodyGrad.addColorStop(0, '#00421e');
        bodyGrad.addColorStop(0.5, '#006b32');
        bodyGrad.addColorStop(1, '#00421e');
        ctx.fillStyle = bodyGrad;

        // Tapered Needle Nose Cone to Cockpit
        ctx.beginPath();
        ctx.moveTo(-6, -hh);
        ctx.lineTo(6, -hh);
        ctx.lineTo(12, -hh + 40);
        ctx.lineTo(16, hh - 18);
        ctx.lineTo(-16, hh - 18);
        ctx.lineTo(-12, -hh + 40);
        ctx.closePath();
        ctx.fill();

        // Gold Center Sponsor Stripe
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-2, -hh, 4, hh * 2 - 18);

        // Wide Front Aerodynamic Wing
        ctx.fillStyle = '#00421e';
        ctx.fillRect(-hw - 4, -hh - 5, (hw + 4) * 2, 7);
        // Red Wing Endplates
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-hw - 5, -hh - 8, 3, 12);
        ctx.fillRect(hw + 2, -hh - 8, 3, 12);

        // Open Cockpit Hole & Visible Driver Helmet
        ctx.fillStyle = '#0a0d10';
        ctx.beginPath();
        ctx.ellipse(0, -hh + 58, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Racing Helmet with Gold Visor
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.arc(0, -hh + 56, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f39c12'; // Gold visor
        ctx.fillRect(-4, -hh + 53, 8, 3);

        // Tall Multi-Element Rear Aero Wing
        ctx.fillStyle = '#111111';
        ctx.fillRect(-hw - 2, hh - 20, (hw + 2) * 2, 8);
        ctx.fillRect(-hw - 2, hh - 10, (hw + 2) * 2, 6);

        // Flashing Red Rain Safety Light on Rear Wing
        const rainLightFlash = Math.sin(time * 12) > 0;
        ctx.fillStyle = rainLightFlash ? '#ff0033' : '#660011';
        if (rainLightFlash) { ctx.shadowColor = '#ff0033'; ctx.shadowBlur = 10; }
        ctx.fillRect(-3, hh - 10, 6, 5);
        ctx.shadowBlur = 0;
    }

    // ------------------------------------------------------------------------
    // CAR 10: HYPER-JET PROTOTYPE (DELTA WING, TWIN PLASMA TURBINES, MAX STATS)
    // ------------------------------------------------------------------------
    static drawHyperJet(ctx, hw, hh, isBraking, steerAngle, isNitro, time, isPodium) {
        // High-Tech Flush Underbody Steerable Actuator Wheels
        this.renderWheel(ctx, -hw + 4, -hh + 28, steerAngle, 9, 20, '#9b59b6');
        this.renderWheel(ctx, hw - 4, -hh + 28, steerAngle, 9, 20, '#9b59b6');
        this.renderWheel(ctx, -hw + 4, hh - 24, 0, 11, 24, '#9b59b6');
        this.renderWheel(ctx, hw - 4, hh - 24, 0, 11, 24, '#9b59b6');

        // Stealth Delta-Wing Carbon Fuselage
        ctx.fillStyle = '#0c0f15';
        ctx.beginPath();
        ctx.moveTo(0, -hh - 8); // Needle nose probe
        ctx.lineTo(8, -hh + 8);
        ctx.lineTo(hw + 4, hh - 18); // Swept delta wingtip right
        ctx.lineTo(hw - 6, hh);
        ctx.lineTo(-hw + 6, hh);
        ctx.lineTo(-hw - 4, hh - 18); // Swept delta wingtip left
        ctx.lineTo(-8, -hh + 8);
        ctx.closePath();
        ctx.fill();

        // Forward Canard Winglets
        ctx.fillStyle = '#1e2430';
        ctx.beginPath();
        ctx.moveTo(-8, -hh + 14); ctx.lineTo(-hw + 2, -hh + 22); ctx.lineTo(-8, -hh + 26);
        ctx.moveTo(8, -hh + 14); ctx.lineTo(hw - 2, -hh + 22); ctx.lineTo(8, -hh + 26);
        ctx.fill();

        // Pulsing Neon Energy Circuitry Veins along Wings
        const energyPulse = 0.6 + 0.4 * Math.sin(time * 6);
        ctx.strokeStyle = `rgba(155, 89, 182, ${energyPulse})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, -hh + 12); ctx.lineTo(-hw + 2, hh - 22);
        ctx.moveTo(0, -hh + 12); ctx.lineTo(hw - 2, hh - 22);
        ctx.stroke();

        // Gold-Iridium Reflective Bubble Canopy
        const canopyGrad = ctx.createLinearGradient(0, -hh + 24, 0, -hh + 64);
        canopyGrad.addColorStop(0, '#f1c40f');
        canopyGrad.addColorStop(0.5, '#9b59b6');
        canopyGrad.addColorStop(1, '#090b10');
        ctx.fillStyle = canopyGrad;
        ctx.beginPath();
        ctx.ellipse(0, -hh + 44, 9, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Twin Aerospace Jet Turbine Engine Nozzles
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-15, hh - 6, 11, 8);
        ctx.fillRect(4, hh - 6, 11, 8);

        // Glowing Violet / Plasma Exhaust Rings
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(-9.5, hh + 2, 4.5, 0, Math.PI * 2);
        ctx.arc(9.5, hh + 2, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Supersonic Nitro Afterburner Flame Jets
        if (isNitro) {
            ctx.fillStyle = '#e056fd';
            ctx.shadowColor = '#be2edd';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(-14, hh + 2); ctx.lineTo(-9.5, hh + 28 + Math.random() * 12); ctx.lineTo(-5, hh + 2);
            ctx.moveTo(5, hh + 2); ctx.lineTo(9.5, hh + 28 + Math.random() * 12); ctx.lineTo(14, hh + 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Taillights
        ctx.fillStyle = isBraking ? '#ff0055' : '#8e44ad';
        if (isBraking) { ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 16; }
        ctx.fillRect(-hw + 8, hh - 2, 8, 3);
        ctx.fillRect(hw - 16, hh - 2, 8, 3);
        ctx.shadowBlur = 0;
    }
}

/* ============================================================================
   8. ENHANCED MULTI-CAR PLAYER CAR
   ============================================================================ */
class PlayerCar {
    constructor() {
        // Active Car Prototype Configuration (defaults to Car 1: Rusty Hatchback)
        this.currentVehicle = CARS_DATABASE[0];

        // Spatial State
        this.x = CONFIG.CANVAS_WIDTH / 2;
        this.y = CONFIG.CANVAS_HEIGHT * 0.76;
        this.width = this.currentVehicle.width;
        this.length = this.currentVehicle.length;

        // Kinematics & Dynamics
        this.speed = 0;            // Forward velocity along track (px/s)
        this.vx = 0;               // Lateral horizontal velocity (px/s)
        this.steerAngle = 0;       // Current front-wheel turn angle (radians)
        this.heading = 0;          // Car body yaw angle relative to track (radians)
        this.angularVelocity = 0;  // Body yaw rotation speed

        // Drift & Grip Metrics
        this.driftRatio = 0;       // 0 = Full grip, 1 = Max sideways slip
        this.isDrifting = false;
        this.driftAngleDegrees = 0;

        // Nitro Booster
        this.nitroAmount = 100;
        this.isNitroActive = false;

        // Track stats & Coin Earning Accumulators
        this.totalDistanceMeters = 0;
        this.topSpeedReached = 0;
        this.distanceCoinMeters = 0;
        this.driftCoinTimer = 0;

        // Visual effects timing
        this.engineTime = 0;
        this.exhaustTimer = 0;
        this.lastLeftTire = null;
        this.lastRightTire = null;

        // Phase 3: Hull Integrity, Oil Slicks & Flashing Invulnerability
        this.health = 100;
        this.maxHealth = 100;
        this.oilSlickTimer = 0;
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;

        // Apply initial config
        this.applyVehicleConfig(this.currentVehicle);
    }

    applyVehicleConfig(car) {
        this.currentVehicle = car;
        this.width = car.width;
        this.length = car.length;
        this.maxBaseSpeed = car.stats.topSpeed;
        this.acceleration = car.stats.acceleration;
        this.handlingMult = car.stats.handling;
        this.armor = car.stats.armor;
        this.maxNitro = car.stats.nitroCapacity;
        this.nitroAmount = Math.min(this.nitroAmount, this.maxNitro);
    }

    triggerDamage(baseDamage = 25) {
        if (this.isInvulnerable) return 0;
        const reduction = 0.10 + (this.armor * 0.45);
        const actualDamage = Math.max(5, Math.round(baseDamage * (1 - reduction)));
        this.health = Math.max(0, this.health - actualDamage);
        this.isInvulnerable = true;
        this.invulnerableTimer = 0.8;
        return actualDamage;
    }

    repair(amount = 30) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    triggerOilSlip(duration = 1.4) {
        this.oilSlickTimer = Math.max(this.oilSlickTimer, duration);
    }

    resetStatus() {
        this.health = this.maxHealth;
        this.oilSlickTimer = 0;
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;
        this.speed = 0;
        this.vx = 0;
        this.steerAngle = 0;
        this.heading = 0;
        this.isDrifting = false;
        this.driftRatio = 0;
        this.nitroAmount = this.maxNitro;
        this.x = CONFIG.CANVAS_WIDTH / 2;
        this.y = CONFIG.CANVAS_HEIGHT * 0.76;
    }

    update(dt, input, roadEnv, particleSystem, skidmarkSystem, gripMult = 1.0) {
        const C = CONFIG.CAR;
        this.engineTime += dt;

        // Invulnerability & Oil timers
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
            if (this.invulnerableTimer <= 0) {
                this.isInvulnerable = false;
            }
        }
        if (this.oilSlickTimer > 0) {
            this.oilSlickTimer -= dt;
        }

        // --- 1. Nitro Boost Input & Tank Depletion ---
        if (input.nitro && this.nitroAmount > 0 && this.speed > 50) {
            this.isNitroActive = true;
            this.nitroAmount = Math.max(0, this.nitroAmount - (C.NITRO_CONSUMPTION * (100 / this.maxNitro)) * dt);
        } else {
            this.isNitroActive = false;
            // Passive recharge
            this.nitroAmount = Math.min(this.maxNitro, this.nitroAmount + C.NITRO_RECHARGE * dt);
        }

        // --- 2. Off-Road / Shoulder Grass Detection ---
        const halfW = this.width * 0.45;
        const leftEdge = this.x - halfW;
        const rightEdge = this.x + halfW;
        const isOffroad = leftEdge < roadEnv.roadLeft - CONFIG.CURB_WIDTH || rightEdge > roadEnv.roadRight + CONFIG.CURB_WIDTH;

        // --- 3. Forward Acceleration, Braking & Friction Dynamics ---
        let currentMaxSpeed = this.isNitroActive ? this.maxBaseSpeed * 1.30 : this.maxBaseSpeed;
        let currentAccel = this.acceleration * (this.isNitroActive ? C.NITRO_ACCEL_MULT : 1.0);

        if (isOffroad) {
            // High armor vehicles (e.g. 4x4 pickup) resist off-road slowdown
            const armorOffroadGrip = C.OFFROAD_SLOWDOWN + (this.armor * 0.28);
            currentMaxSpeed *= armorOffroadGrip;
            currentAccel *= armorOffroadGrip;
        }

        // Longitudinal forces
        if (input.accelerate) {
            const speedRatio = Math.max(0, this.speed / currentMaxSpeed);
            const torqueMultiplier = Math.max(0.35, 1.0 - Math.pow(speedRatio, 1.8) * 0.65);
            this.speed += currentAccel * torqueMultiplier * dt;
        } else if (input.brake) {
            if (this.speed > 25) {
                this.speed -= C.BRAKE_FORCE * dt;
            } else {
                this.speed -= C.REVERSE_ACCEL * dt;
                if (this.speed < C.MAX_REVERSE_SPEED) {
                    this.speed = C.MAX_REVERSE_SPEED;
                }
            }
        } else {
            const dragForce = (this.speed * Math.abs(this.speed)) * C.DRAG * 0.001;
            const rollingDecel = Math.sign(this.speed) * C.ROLLING_RESISTANCE * dt;
            this.speed -= dragForce * dt;
            if (Math.abs(this.speed) > Math.abs(rollingDecel)) {
                this.speed -= rollingDecel;
            } else {
                this.speed = 0;
            }
        }

        if (this.speed > currentMaxSpeed) {
            this.speed = Math.max(currentMaxSpeed, this.speed - 300 * dt);
        }

        // --- 4. Steering, Angular Inertia & Drift Physics ---
        const speedFactor = Math.min(1.0, Math.abs(this.speed) / 280);
        let targetSteer = 0;
        if (input.steerLeft) targetSteer -= C.MAX_STEER_ANGLE;
        if (input.steerRight) targetSteer += C.MAX_STEER_ANGLE;

        const effectiveSteerSpeed = C.STEER_SPEED * this.handlingMult;
        if (targetSteer !== 0) {
            this.steerAngle += (targetSteer - this.steerAngle) * effectiveSteerSpeed * dt;
        } else {
            this.steerAngle += (0 - this.steerAngle) * C.STEER_RETURN_RATE * dt;
        }

        const turnRate = (this.steerAngle * (this.speed / 280)) * speedFactor * this.handlingMult;
        this.heading += (turnRate - this.heading) * 6.5 * dt;

        // Oil slick slip disturbance
        if (this.oilSlickTimer > 0) {
            this.heading += (Math.sin(this.engineTime * 14) * 0.14) * speedFactor * dt;
            this.vx += (Math.cos(this.engineTime * 10) * 220) * dt;
        }

        const targetVx = (Math.sin(this.heading) * this.speed) * 1.05;
        const lateralDiff = Math.abs(targetVx - this.vx);
        const slipVelocity = lateralDiff / Math.max(200, Math.abs(this.speed));

        const baseDriftThreshold = (this.oilSlickTimer > 0) ? 0.05 : (C.DRIFT_THRESHOLD * gripMult);
        const effectiveGrip = C.GRIP_LATERAL * gripMult * (this.oilSlickTimer > 0 ? 0.32 : 1.0);

        if (slipVelocity > baseDriftThreshold && Math.abs(this.speed) > 300) {
            this.isDrifting = true;
            this.driftRatio = Math.min(1.0, (slipVelocity - baseDriftThreshold) * 2.8);
            this.vx += (targetVx - this.vx) * (effectiveGrip * 0.38) * dt;
            this.speed *= (1 - (0.06 * this.driftRatio * dt));
            this.nitroAmount = Math.min(this.maxNitro, this.nitroAmount + C.NITRO_DRIFT_BONUS * dt);

            // Earn Coins for Drifting!
            this.driftCoinTimer += dt;
            if (this.driftCoinTimer >= 0.35) {
                this.driftCoinTimer = 0;
                if (window.gameInstance) window.gameInstance.addCoins(2);
            }
        } else {
            this.isDrifting = false;
            this.driftRatio = Math.max(0, this.driftRatio - 4.0 * dt);
            this.vx += (targetVx - this.vx) * effectiveGrip * dt;
        }

        this.driftAngleDegrees = Math.round(Math.abs(this.heading) * (180 / Math.PI));

        // --- 5. Apply Horizontal Lateral Position ---
        this.x += this.vx * dt;

        const outerMinX = roadEnv.roadLeft - CONFIG.SHOULDER_WIDTH + this.width * 0.5;
        const outerMaxX = roadEnv.roadRight + CONFIG.SHOULDER_WIDTH - this.width * 0.5;

        if (this.x < outerMinX) {
            this.x = outerMinX;
            this.vx = Math.abs(this.vx) * 0.4;
            this.speed *= (0.80 + this.armor * 0.15); // High armor loses less speed
            this.spawnSparks(particleSystem, this.x - halfW, this.y);
        } else if (this.x > outerMaxX) {
            this.x = outerMaxX;
            this.vx = -Math.abs(this.vx) * 0.4;
            this.speed *= (0.80 + this.armor * 0.15);
            this.spawnSparks(particleSystem, this.x + halfW, this.y);
        }

        // --- 6. Distance & Telemetry Recording + Distance Coin Rewards ---
        if (this.speed > 0) {
            const deltaMeters = (this.speed * dt * CONFIG.SPEED_KMH_FACTOR) / 3.6;
            this.totalDistanceMeters += deltaMeters;
            this.distanceCoinMeters += deltaMeters;

            // Earn 1 Coin every 40 meters
            if (this.distanceCoinMeters >= 40) {
                const coinsToAdd = Math.floor(this.distanceCoinMeters / 40);
                this.distanceCoinMeters %= 40;
                if (window.gameInstance) window.gameInstance.addCoins(coinsToAdd);
            }

            const currentKmh = this.speed * CONFIG.SPEED_KMH_FACTOR;
            if (currentKmh > this.topSpeedReached) {
                this.topSpeedReached = currentKmh;
            }
        }

        // --- 7. Particle Effects ---
        this.updateParticles(dt, input, isOffroad, particleSystem, skidmarkSystem);
    }

    spawnSparks(particleSystem, x, y) {
        for (let i = 0; i < 4; i++) {
            particleSystem.spawn(
                x, y + (Math.random() * 30 - 15),
                (Math.random() - 0.5) * 180,
                -Math.random() * 200 - 80,
                2, 0.25, '#ffe066', 'spark'
            );
        }
    }

    updateParticles(dt, input, isOffroad, particleSystem, skidmarkSystem) {
        const rad = this.heading;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const exhaustYOffset = this.length * 0.48;
        const exhaustXOffset = this.currentVehicle.id === 'car_1' ? 8 : 14;

        const leftExhaustX = this.x + (-exhaustXOffset * cos - exhaustYOffset * sin);
        const leftExhaustY = this.y + (-exhaustXOffset * sin + exhaustYOffset * cos);
        const rightExhaustX = this.x + (exhaustXOffset * cos - exhaustYOffset * sin);
        const rightExhaustY = this.y + (exhaustXOffset * sin + exhaustYOffset * cos);

        const tireYOffset = this.length * 0.32;
        const tireXOffset = this.width * 0.42;

        const leftTireX = this.x + (-tireXOffset * cos - tireYOffset * sin);
        const leftTireY = this.y + (-tireXOffset * sin + tireYOffset * cos);
        const rightTireX = this.x + (tireXOffset * cos - tireYOffset * sin);
        const rightTireY = this.y + (tireXOffset * sin + tireYOffset * cos);

        const isHardBraking = input.brake && this.speed > 300;
        if (this.isDrifting || isHardBraking) {
            const skidAlpha = Math.min(0.65, 0.25 + this.driftRatio * 0.4);

            if (this.lastLeftTire) {
                skidmarkSystem.addSegment(this.lastLeftTire.x, this.lastLeftTire.y, leftTireX, leftTireY, skidAlpha, 7);
                skidmarkSystem.addSegment(this.lastRightTire.x, this.lastRightTire.y, rightTireX, rightTireY, skidAlpha, 7);
            }

            if (Math.random() < 0.65) {
                particleSystem.spawn(
                    leftTireX + (Math.random() * 6 - 3), leftTireY,
                    -this.vx * 0.4 + (Math.random() * 40 - 20), -40 + Math.random() * 20,
                    10 + Math.random() * 6, 0.55 + Math.random() * 0.25,
                    'rgba(230, 235, 245, 0.75)', 'smoke'
                );
                particleSystem.spawn(
                    rightTireX + (Math.random() * 6 - 3), rightTireY,
                    -this.vx * 0.4 + (Math.random() * 40 - 20), -40 + Math.random() * 20,
                    10 + Math.random() * 6, 0.55 + Math.random() * 0.25,
                    'rgba(230, 235, 245, 0.75)', 'smoke'
                );
            }
        }

        this.lastLeftTire = { x: leftTireX, y: leftTireY };
        this.lastRightTire = { x: rightTireX, y: rightTireY };

        if (isOffroad && Math.abs(this.speed) > 120) {
            particleSystem.spawn(
                leftTireX, leftTireY,
                (Math.random() - 0.5) * 80, 20 + Math.random() * 40,
                8, 0.4, 'rgba(120, 100, 60, 0.55)', 'dust'
            );
            particleSystem.spawn(
                rightTireX, rightTireY,
                (Math.random() - 0.5) * 80, 20 + Math.random() * 40,
                8, 0.4, 'rgba(120, 100, 60, 0.55)', 'dust'
            );
        }

        if (this.isNitroActive) {
            for (let i = 0; i < 2; i++) {
                const speedSpread = -380 - Math.random() * 260;
                // Core supersonic blue jet flame
                particleSystem.spawn(
                    leftExhaustX + (Math.random() * 4 - 2), leftExhaustY,
                    -sin * speedSpread + (Math.random() * 24 - 12),
                    cos * speedSpread + (Math.random() * 24 - 12),
                    8 + Math.random() * 4, 0.22, '#00f0ff', 'nitro'
                );
                particleSystem.spawn(
                    rightExhaustX + (Math.random() * 4 - 2), rightExhaustY,
                    -sin * speedSpread + (Math.random() * 24 - 12),
                    cos * speedSpread + (Math.random() * 24 - 12),
                    8 + Math.random() * 4, 0.22, '#00f0ff', 'nitro'
                );

                // Licking outer fiery orange flame
                const fireSpread = -260 - Math.random() * 200;
                particleSystem.spawn(
                    leftExhaustX + (Math.random() * 8 - 4), leftExhaustY + 4,
                    -sin * fireSpread + (Math.random() * 40 - 20),
                    cos * fireSpread + (Math.random() * 40 - 20),
                    10 + Math.random() * 5, 0.28, '#ff6600', 'fire'
                );
                particleSystem.spawn(
                    rightExhaustX + (Math.random() * 8 - 4), rightExhaustY + 4,
                    -sin * fireSpread + (Math.random() * 40 - 20),
                    cos * fireSpread + (Math.random() * 40 - 20),
                    10 + Math.random() * 5, 0.28, '#ff6600', 'fire'
                );
            }
        } else if (input.accelerate && this.speed > 80) {
            this.exhaustTimer += dt;
            if (this.exhaustTimer > 0.05) {
                this.exhaustTimer = 0;
                particleSystem.spawn(
                    leftExhaustX, leftExhaustY,
                    -sin * -80 + (Math.random() * 10 - 5),
                    cos * -80 + (Math.random() * 10 - 5),
                    5, 0.35, 'rgba(200, 210, 220, 0.35)', 'smoke'
                );
                particleSystem.spawn(
                    rightExhaustX, rightExhaustY,
                    -sin * -80 + (Math.random() * 10 - 5),
                    cos * -80 + (Math.random() * 10 - 5),
                    5, 0.35, 'rgba(200, 210, 220, 0.35)', 'smoke'
                );
            }
        }
    }

    draw(ctx, isBraking) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.heading);

        // Invulnerability flashing after collision
        if (this.isInvulnerable && Math.floor(Date.now() / 60) % 2 === 0) {
            ctx.globalAlpha = 0.35;
        }

        // Render selected procedural vehicle model
        VehicleRenderer.draw(
            ctx,
            this.currentVehicle,
            isBraking,
            this.steerAngle,
            this.isNitroActive,
            this.engineTime,
            false,
            this.speed
        );

        ctx.restore();
    }
}

/* ============================================================================
   9. PHASE 3: WEATHER & DYNAMIC LIGHTING SYSTEM
   ============================================================================ */
class WeatherSystem {
    constructor() {
        this.rainDrops = Array.from({ length: 95 }, () => ({
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            y: Math.random() * CONFIG.CANVAS_HEIGHT,
            len: 16 + Math.random() * 20,
            speed: 1300 + Math.random() * 600,
            alpha: 0.25 + Math.random() * 0.4
        }));

        this.dustParticles = Array.from({ length: 70 }, () => ({
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            y: Math.random() * CONFIG.CANVAS_HEIGHT,
            size: 2 + Math.random() * 4,
            speedX: -180 - Math.random() * 220,
            speedY: 350 + Math.random() * 350,
            alpha: 0.15 + Math.random() * 0.35
        }));
    }

    reset() {
        for (let r of this.rainDrops) {
            r.x = Math.random() * CONFIG.CANVAS_WIDTH;
            r.y = Math.random() * CONFIG.CANVAS_HEIGHT;
        }
        for (let d of this.dustParticles) {
            d.x = Math.random() * CONFIG.CANVAS_WIDTH;
            d.y = Math.random() * CONFIG.CANVAS_HEIGHT;
        }
    }

    update(dt, carSpeed, theme) {
        if (theme === 'rain_storm') {
            for (let r of this.rainDrops) {
                r.y += (r.speed + carSpeed * 0.6) * dt;
                r.x -= 140 * dt;
                if (r.y > CONFIG.CANVAS_HEIGHT + 30) {
                    r.y = -30;
                    r.x = Math.random() * (CONFIG.CANVAS_WIDTH + 200);
                }
            }
        } else if (theme === 'desert_storm') {
            for (let d of this.dustParticles) {
                d.x += d.speedX * dt;
                d.y += (d.speedY + carSpeed * 0.4) * dt;
                if (d.x < -20 || d.y > CONFIG.CANVAS_HEIGHT + 20) {
                    d.x = CONFIG.CANVAS_WIDTH + Math.random() * 50;
                    d.y = Math.random() * CONFIG.CANVAS_HEIGHT * 0.8;
                }
            }
        }
    }

    draw(ctx, theme, playerCar, streetLamps, speed) {
        // 1. Night Mode Darkness Overlay with Dynamic Headlight Punchout Cone
        if (theme === 'night_neon' || theme === 'boss_run') {
            ctx.save();
            ctx.fillStyle = 'rgba(5, 7, 14, 0.88)';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

            ctx.globalCompositeOperation = 'destination-out';

            // Punch out player headlight projection cone
            const px = playerCar.x;
            const py = playerCar.y;
            const coneLen = 420 + (speed / 1300) * 140;

            const headGrad = ctx.createRadialGradient(px, py - 30, 20, px, py - coneLen * 0.7, 190);
            headGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
            headGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.85)');
            headGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

            ctx.fillStyle = headGrad;
            ctx.beginPath();
            ctx.moveTo(px - 28, py - 30);
            ctx.lineTo(px - 140, py - coneLen);
            ctx.lineTo(px + 140, py - coneLen);
            ctx.lineTo(px + 28, py - 30);
            ctx.closePath();
            ctx.fill();

            // Punch out street lamp light pools
            if (streetLamps) {
                for (let lamp of streetLamps) {
                    if (lamp.y > -80 && lamp.y < CONFIG.CANVAS_HEIGHT + 80) {
                        const lampX = lamp.side === 'left' ? lamp.x + 80 : lamp.x - 80;
                        const lampGrad = ctx.createRadialGradient(lampX, lamp.y, 10, lampX, lamp.y, 130);
                        lampGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
                        lampGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.5)');
                        lampGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
                        ctx.fillStyle = lampGrad;
                        ctx.beginPath();
                        ctx.arc(lampX, lamp.y, 130, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
            ctx.restore();
        }

        // 2. Desert Sandstorm Haze & Drifting Dust
        if (theme === 'desert_storm') {
            ctx.save();
            ctx.fillStyle = 'rgba(210, 140, 50, 0.16)';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

            for (let d of this.dustParticles) {
                ctx.fillStyle = `rgba(230, 170, 80, ${d.alpha})`;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 3. Rain Storm Falling Streaks & Wet Road Tint
        if (theme === 'rain_storm') {
            ctx.save();
            ctx.strokeStyle = 'rgba(180, 220, 255, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let r of this.rainDrops) {
                ctx.moveTo(r.x, r.y);
                ctx.lineTo(r.x - 4, r.y + r.len);
            }
            ctx.stroke();

            ctx.fillStyle = 'rgba(10, 30, 60, 0.12)';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.restore();
        }
    }
}

/* ============================================================================
   10. TRAFFIC VEHICLES & OBSTACLES (PHASE 3)
   ============================================================================ */
class TrafficVehicle {
    constructor(x, y, speed, lane, type, color, isOncoming = false, isRival = false) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.lane = lane;
        this.targetLane = lane;
        this.type = type;
        this.color = color;
        this.isOncoming = isOncoming;
        this.isRival = isRival;

        // Dimensions
        if (type === 'truck') {
            this.width = 62;
            this.length = 126;
        } else if (type === 'suv') {
            this.width = 54;
            this.length = 104;
        } else if (type === 'police' || type === 'rival') {
            this.width = 56;
            this.length = 108;
        } else {
            this.width = 50;
            this.length = 96;
        }

        // Lane Changing & Blinker State
        this.isChangingLane = false;
        this.isBlinking = false;
        this.blinkSide = 'none'; // 'left' or 'right'
        this.blinkTimer = 0;
        this.changeLaneProgress = 0;
        this.startX = x;
        this.targetX = x;
    }

    startLaneChange(newLane, targetX) {
        if (this.isChangingLane || this.isBlinking || this.isOncoming) return;
        this.targetLane = newLane;
        this.targetX = targetX;
        this.blinkSide = newLane < this.lane ? 'left' : 'right';
        this.isBlinking = true;
        this.blinkTimer = 1.1; // Blink for 1.1 seconds before sliding
    }

    update(dt, playerSpeed) {
        // Relative vertical movement:
        // Regular traffic moves forward; relative speed is playerSpeed - this.speed.
        // Oncoming traffic moves towards player; relative speed is playerSpeed + this.speed!
        const relativeSpeed = this.isOncoming ? (playerSpeed + this.speed) : (playerSpeed - this.speed);
        this.y += relativeSpeed * dt;

        // Lane Change Logic with Turn Signals
        if (this.isBlinking) {
            this.blinkTimer -= dt;
            if (this.blinkTimer <= 0) {
                this.isBlinking = false;
                this.isChangingLane = true;
                this.startX = this.x;
                this.changeLaneProgress = 0;
            }
        }

        if (this.isChangingLane) {
            this.changeLaneProgress += dt * 1.5;
            if (this.changeLaneProgress >= 1.0) {
                this.changeLaneProgress = 1.0;
                this.x = this.targetX;
                this.lane = this.targetLane;
                this.isChangingLane = false;
            } else {
                this.x = this.startX + (this.targetX - this.startX) * this.changeLaneProgress;
            }
        }
    }

    draw(ctx, time) {
        const hw = this.width / 2;
        const hh = this.length / 2;

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.isOncoming) {
            ctx.rotate(Math.PI); // Facing towards player
        }

        // Drop Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.roundRect(-hw - 3, -hh + 5, hw * 2 + 6, hh * 2 + 6, 8);
        ctx.fill();

        // Wheels
        ctx.fillStyle = '#111317';
        ctx.fillRect(-hw - 1, -hh + 18, 5, 18);
        ctx.fillRect(hw - 4, -hh + 18, 5, 18);
        ctx.fillRect(-hw - 1, hh - 26, 5, 18);
        ctx.fillRect(hw - 4, hh - 26, 5, 18);

        // Body Shape by Type
        if (this.type === 'truck') {
            this.drawTruck(ctx, hw, hh);
        } else if (this.type === 'taxi') {
            this.drawTaxi(ctx, hw, hh);
        } else if (this.type === 'police') {
            this.drawPolice(ctx, hw, hh, time);
        } else if (this.type === 'rival') {
            this.drawRival(ctx, hw, hh);
        } else {
            this.drawSedan(ctx, hw, hh);
        }

        // Amber Turn Signal Blinkers
        if (this.isBlinking && Math.sin(time * 24) > 0) {
            ctx.fillStyle = '#ff9f1a';
            ctx.shadowColor = '#ff9f1a';
            ctx.shadowBlur = 10;
            if (this.blinkSide === 'left') {
                ctx.beginPath();
                ctx.arc(-hw - 1, -hh + 20, 4, 0, Math.PI * 2);
                ctx.arc(-hw + 3, hh - 6, 4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(hw + 1, -hh + 20, 4, 0, Math.PI * 2);
                ctx.arc(hw - 3, hh - 6, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
        }

        // Oncoming Warning Beacon
        if (this.isOncoming) {
            // Forward headlights blazing towards player
            ctx.fillStyle = '#fff4a3';
            ctx.shadowColor = '#fffa65';
            ctx.shadowBlur = 12;
            ctx.fillRect(-hw + 5, -hh - 1, 9, 4);
            ctx.fillRect(hw - 14, -hh - 1, 9, 4);
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    drawSedan(ctx, hw, hh) {
        // Metallic Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 7);
        ctx.fill();

        // Dark Glass Cockpit
        ctx.fillStyle = '#1a2228';
        ctx.beginPath();
        ctx.roundRect(-hw + 6, -hh + 26, (hw - 6) * 2, hh * 1.15, 5);
        ctx.fill();

        // Windshield
        ctx.fillStyle = 'rgba(120, 180, 220, 0.7)';
        ctx.fillRect(-hw + 8, -hh + 28, (hw - 8) * 2, 16);

        // Taillights
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-hw + 4, hh - 3, 10, 3);
        ctx.fillRect(hw - 14, hh - 3, 10, 3);
    }

    drawTaxi(ctx, hw, hh) {
        // Yellow Cab Body
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 7);
        ctx.fill();

        // Checkered Roof Taxi Sign
        ctx.fillStyle = '#111111';
        ctx.fillRect(-12, -hh + 48, 24, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-10, -hh + 50, 6, 4);
        ctx.fillRect(4, -hh + 50, 6, 4);

        // Windows
        ctx.fillStyle = '#1e272e';
        ctx.beginPath();
        ctx.roundRect(-hw + 6, -hh + 26, (hw - 6) * 2, hh * 1.15, 5);
        ctx.fill();

        // Taillights
        ctx.fillStyle = '#d63031';
        ctx.fillRect(-hw + 4, hh - 3, 10, 3);
        ctx.fillRect(hw - 14, hh - 3, 10, 3);
    }

    drawTruck(ctx, hw, hh) {
        // White Cab Front
        ctx.fillStyle = '#dfe6e9';
        ctx.fillRect(-hw, -hh, hw * 2, 38);

        // Windshield
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(-hw + 6, -hh + 8, (hw - 6) * 2, 16);

        // Large Gray/Corrugated Cargo Box
        ctx.fillStyle = '#b2bec3';
        ctx.fillRect(-hw - 1, -hh + 38, hw * 2 + 2, hh * 2 - 38);

        // Red/White Hazard Bumper Stripes
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-hw, hh - 4, hw * 2, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-16, hh - 4, 8, 4);
        ctx.fillRect(8, hh - 4, 8, 4);
    }

    drawPolice(ctx, hw, hh, time) {
        // Black & White Pursuit Cruiser
        ctx.fillStyle = '#0a0d14';
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 8);
        ctx.fill();

        ctx.fillStyle = '#f5f6fa';
        ctx.fillRect(-hw + 4, -hh + 30, (hw - 4) * 2, hh);

        // Flashing Strobe Lightbar
        const isRed = Math.sin(time * 12) > 0;
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(-12, -hh + 45, 24, 6);

        ctx.fillStyle = isRed ? '#ff0033' : '#660011';
        if (isRed) { ctx.shadowColor = '#ff0033'; ctx.shadowBlur = 14; }
        ctx.fillRect(-11, -hh + 46, 10, 4);
        ctx.shadowBlur = 0;

        ctx.fillStyle = !isRed ? '#0088ff' : '#002266';
        if (!isRed) { ctx.shadowColor = '#00d2ff'; ctx.shadowBlur = 14; }
        ctx.fillRect(1, -hh + 46, 10, 4);
        ctx.shadowBlur = 0;

        // Taillights
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-hw + 4, hh - 3, 10, 3);
        ctx.fillRect(hw - 14, hh - 3, 10, 3);
    }

    drawRival(ctx, hw, hh) {
        // High-Speed Neon Tuner Rival
        ctx.fillStyle = '#8e44ad';
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 9);
        ctx.fill();

        // Neon Green Racing Stripes
        ctx.fillStyle = '#00ff77';
        ctx.fillRect(-3, -hh, 6, hh * 2);

        // Cockpit
        ctx.fillStyle = '#0c0f14';
        ctx.beginPath();
        ctx.roundRect(-hw + 7, -hh + 30, (hw - 7) * 2, hh * 1.1, 6);
        ctx.fill();

        // Rear Wing
        ctx.fillStyle = '#111111';
        ctx.fillRect(-hw - 1, hh - 8, hw * 2 + 2, 5);

        // Taillights
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(-hw + 5, hh - 3, 10, 3);
        ctx.fillRect(hw - 15, hh - 3, 10, 3);
    }
}

class RoadObstacle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'roadblock' or 'oil'
        this.width = type === 'roadblock' ? 82 : 68;
        this.length = type === 'roadblock' ? 32 : 46;
        this.active = true;
    }

    update(dt, playerSpeed) {
        this.y += playerSpeed * dt;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.type === 'roadblock') {
            // Striped Red/White Chevron Barricade
            const hw = this.width / 2;
            const hh = this.length / 2;

            // Barricade Feet Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(-hw, hh - 4, this.width, 6);

            // Barricade Rail
            ctx.fillStyle = '#f5f6fa';
            ctx.fillRect(-hw + 6, -hh, this.width - 12, 16);

            // Diagonal Warning Stripes
            ctx.fillStyle = '#e74c3c';
            for (let sx = -hw + 10; sx < hw - 10; sx += 18) {
                ctx.beginPath();
                ctx.moveTo(sx, -hh);
                ctx.lineTo(sx + 10, -hh);
                ctx.lineTo(sx + 4, -hh + 16);
                ctx.lineTo(sx - 6, -hh + 16);
                ctx.closePath();
                ctx.fill();
            }

            // Heavy Orange Traffic Cones on Sides
            const drawCone = (cx, cy) => {
                ctx.fillStyle = '#e67e22';
                ctx.beginPath();
                ctx.arc(cx, cy, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
                ctx.fill();
            };
            drawCone(-hw + 4, 4);
            drawCone(hw - 4, 4);

        } else if (this.type === 'oil') {
            // Iridescent Oil Slick Puddle
            const oilGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 32);
            oilGrad.addColorStop(0, '#100c1c');
            oilGrad.addColorStop(0.4, '#1b1236');
            oilGrad.addColorStop(0.7, '#00ffcc');
            oilGrad.addColorStop(0.85, '#ff00aa');
            oilGrad.addColorStop(1, 'rgba(10, 10, 18, 0)');

            ctx.fillStyle = oilGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, 34, 23, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class RoadPickup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'coin', 'wrench', 'nitro'
        this.radius = 15;
        this.active = true;
        this.wobble = Math.random() * Math.PI * 2;
    }

    update(dt, playerSpeed) {
        this.y += playerSpeed * dt;
        this.wobble += dt * 5;
    }

    draw(ctx) {
        if (!this.active) return;
        const bob = Math.sin(this.wobble) * 3;

        ctx.save();
        ctx.translate(this.x, this.y + bob);

        if (this.type === 'coin') {
            // Spinning Gold Coin
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Inner Ring
            ctx.strokeStyle = '#b8860b';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Coin Symbol
            ctx.fillStyle = '#b8860b';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 1);

        } else if (this.type === 'wrench') {
            // Green Repair Kit
            ctx.fillStyle = '#00ff77';
            ctx.shadowColor = '#00ff77';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#071018';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔧', 0, 1);

        } else if (this.type === 'nitro') {
            // Cyan NOS Booster Canister
            ctx.fillStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#071018';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', 0, 1);
        }

        ctx.restore();
    }
}

class FinishLine {
    constructor(roadEnv) {
        this.roadEnv = roadEnv;
        this.y = -300;
        this.active = false;
        this.passed = false;
    }

    deploy() {
        this.active = true;
        this.passed = false;
        this.y = -200;
    }

    update(dt, playerSpeed) {
        if (!this.active) return;
        this.y += playerSpeed * dt;
    }

    draw(ctx) {
        if (!this.active) return;

        const left = this.roadEnv.roadLeft;
        const width = CONFIG.ROAD_WIDTH;
        const right = left + width;

        ctx.save();

        // Neon Gantry Support Towers
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.fillRect(left - 12, this.y - 30, 10, 60);
        ctx.fillRect(right + 2, this.y - 30, 10, 60);
        ctx.shadowBlur = 0;

        // Checkered Black & White Finish Banner
        const sqSize = 16;
        for (let row = 0; row < 2; row++) {
            const sqY = this.y + (row * sqSize) - 16;
            for (let x = left; x < right; x += sqSize) {
                const isBlack = (Math.floor(x / sqSize) + row) % 2 === 0;
                ctx.fillStyle = isBlack ? '#111111' : '#ffffff';
                ctx.fillRect(x, sqY, sqSize, sqSize);
            }
        }

        // Gold Overhead Text Ribbon
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(left, this.y - 42, width, 22);

        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★ FINISH LINE ★', left + width / 2, this.y - 31);

        ctx.restore();
    }
}

class TrafficManager {
    constructor(roadEnv) {
        this.roadEnv = roadEnv;
        this.vehicles = [];
        this.obstacles = [];
        this.pickups = [];
        this.finishLine = new FinishLine(roadEnv);

        this.spawnTimer = 0;
        this.pickupTimer = 0;
    }

    reset() {
        this.vehicles = [];
        this.obstacles = [];
        this.pickups = [];
        this.finishLine.active = false;
        this.finishLine.passed = false;
        this.spawnTimer = 0.5;
        this.pickupTimer = 1.0;
    }

    update(dt, playerCar, currentLevel, particleSystem, onCollision) {
        const roadLeft = this.roadEnv.roadLeft;
        const laneW = this.roadEnv.laneWidth;
        const laneCenters = [
            roadLeft + laneW * 0.5,
            roadLeft + laneW * 1.5,
            roadLeft + laneW * 2.5,
            roadLeft + laneW * 3.5
        ];

        // 1. Spawning Timer & FAIR SPAWN ALGORITHM
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = this.getSpawnInterval(currentLevel.trafficDensity);
            this.spawnFairWave(currentLevel, laneCenters);
        }

        // 2. Pickups Spawning Timer (Coins & Powerups)
        this.pickupTimer -= dt;
        if (this.pickupTimer <= 0) {
            this.pickupTimer = 2.5 / (currentLevel.coinSpawnRate || 0.6);
            this.spawnPickup(laneCenters);
        }

        // 3. Update Existing Traffic Vehicles
        for (let i = this.vehicles.length - 1; i >= 0; i--) {
            const v = this.vehicles[i];
            v.update(dt, playerCar.speed);

            // Autonomous Lane Change Decisions
            if (currentLevel.allowLaneChange && !v.isChangingLane && !v.isBlinking && Math.random() < 0.006) {
                const deltaLane = Math.random() < 0.5 ? -1 : 1;
                const nextLane = v.lane + deltaLane;
                if (nextLane >= 0 && nextLane < 4) {
                    const targetX = laneCenters[nextLane];
                    // Check if target lane is clear near this car
                    const isClear = !this.vehicles.some(other => other !== v && Math.abs(other.x - targetX) < laneW * 0.4 && Math.abs(other.y - v.y) < 140);
                    if (isClear) {
                        v.startLaneChange(nextLane, targetX);
                    }
                }
            }

            // Despawn vehicles off-screen (too far below or behind)
            if (v.y > CONFIG.CANVAS_HEIGHT + 200 || v.y < -600) {
                this.vehicles.splice(i, 1);
            }
        }

        // 4. Update Obstacles & Pickups
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            o.update(dt, playerCar.speed);
            if (o.y > CONFIG.CANVAS_HEIGHT + 150) this.obstacles.splice(i, 1);
        }

        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            p.update(dt, playerCar.speed);
            if (p.y > CONFIG.CANVAS_HEIGHT + 150) this.pickups.splice(i, 1);
        }

        // 5. Update Finish Line
        this.finishLine.update(dt, playerCar.speed);

        // 6. Collision System Checks
        this.checkCollisions(playerCar, particleSystem, onCollision);
    }

    getSpawnInterval(density) {
        switch (density) {
            case 'low': return 2.2 + Math.random() * 0.8;
            case 'low_med': return 1.8 + Math.random() * 0.6;
            case 'medium': return 1.4 + Math.random() * 0.5;
            case 'medium_high': return 1.1 + Math.random() * 0.4;
            case 'high': return 0.9 + Math.random() * 0.35;
            case 'very_high': return 0.75 + Math.random() * 0.3;
            case 'extreme': return 0.6 + Math.random() * 0.25;
            default: return 1.5;
        }
    }

    /* ------------------------------------------------------------------------
       FAIR SPAWNING ALGORITHM:
       Guarantees at least 1 lane is NEVER blocked across any wave,
       ensuring an unobstructed escape path always exists for the player.
       ------------------------------------------------------------------------ */
    spawnFairWave(level, laneCenters) {
        // 1. Pick guaranteed free lane
        const openEscapeLane = Math.floor(Math.random() * 4);

        // 2. Candidate lanes to populate
        const candidateLanes = [0, 1, 2, 3].filter(l => l !== openEscapeLane);

        // 3. Filter candidate lanes that have sufficient vertical space
        const spawnY = -160;
        const availableLanes = candidateLanes.filter(laneIdx => {
            const laneX = laneCenters[laneIdx];
            return !this.vehicles.some(v => Math.abs(v.x - laneX) < 40 && Math.abs(v.y - spawnY) < 220);
        });

        if (availableLanes.length === 0) return;

        // Shuffle available lanes
        availableLanes.sort(() => Math.random() - 0.5);

        // Number of elements to spawn in this wave (at most 2 to maintain safe spacing)
        const count = Math.min(availableLanes.length, Math.random() < 0.6 ? 1 : 2);

        for (let i = 0; i < count; i++) {
            const lane = availableLanes[i];
            const x = laneCenters[lane];

            // Decide whether to spawn hazard or traffic vehicle
            const hasHazards = level.hazards && level.hazards.length > 0;
            const spawnHazard = hasHazards && Math.random() < 0.28;

            if (spawnHazard) {
                const hazardType = level.hazards[Math.floor(Math.random() * level.hazards.length)];
                if (hazardType === 'roadblock' || hazardType === 'oil') {
                    this.obstacles.push(new RoadObstacle(x, spawnY, hazardType));
                    continue;
                }
            }

            // Spawn Traffic Vehicle
            const speedMin = level.trafficSpeedRange ? level.trafficSpeedRange[0] : 350;
            const speedMax = level.trafficSpeedRange ? level.trafficSpeedRange[1] : 600;
            const speed = speedMin + Math.random() * (speedMax - speedMin);

            // Vehicle Type Selection
            const types = ['sedan', 'sedan', 'taxi', 'truck', 'suv'];
            if (level.hazards && level.hazards.includes('police_chaser')) types.push('police');
            if (level.hazards && level.hazards.includes('rival')) types.push('rival');
            const type = types[Math.floor(Math.random() * types.length)];

            // Colors
            const colors = ['#c0392b', '#2980b9', '#7f8c8d', '#27ae60', '#ecf0f1', '#e67e22'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            // Oncoming mode: in levels 8-10, leftmost lane (lane 0) occasionally has oncoming wrong-way speeders!
            const isOncoming = level.oncomingTraffic && lane === 0 && Math.random() < 0.45;

            const vehicle = new TrafficVehicle(x, spawnY, speed, lane, type, color, isOncoming, type === 'rival');
            this.vehicles.push(vehicle);
        }
    }

    spawnPickup(laneCenters) {
        const lane = Math.floor(Math.random() * 4);
        const x = laneCenters[lane];
        const spawnY = -120;

        // Coin is common, wrench/nitro are rare
        const roll = Math.random();
        let type = 'coin';
        if (roll < 0.12) {
            type = 'wrench';
        } else if (roll < 0.24) {
            type = 'nitro';
        }

        this.pickups.push(new RoadPickup(x, spawnY, type));
    }

    checkCollisions(playerCar, particleSystem, onCollision) {
        // Forgiving Hitboxes: exactly 82% of visual width/height
        const pHalfW = playerCar.width * 0.41;
        const pHalfL = playerCar.length * 0.41;
        const pLeft = playerCar.x - pHalfW;
        const pRight = playerCar.x + pHalfW;
        const pTop = playerCar.y - pHalfL;
        const pBottom = playerCar.y + pHalfL;

        // 1. Collisions & Near-Misses with Traffic Vehicles
        for (let v of this.vehicles) {
            const vHalfW = v.width * 0.41;
            const vHalfL = v.length * 0.41;
            const vLeft = v.x - vHalfW;
            const vRight = v.x + vHalfW;
            const vTop = v.y - vHalfL;
            const vBottom = v.y + vHalfL;

            if (pRight > vLeft && pLeft < vRight && pBottom > vTop && pTop < vBottom) {
                // Collision!
                const baseDamage = v.isOncoming ? 45 : (v.type === 'truck' ? 35 : 25);
                const actualDamage = playerCar.triggerDamage(baseDamage);

                // Speed reduction & bounce
                playerCar.speed *= (0.45 + playerCar.armor * 0.15);
                v.y -= 30; // Shove traffic forward

                // Spark / debris / explosion particles
                if (playerCar.health <= 0) {
                    particleSystem.spawnExplosion(playerCar.x, playerCar.y, playerCar.currentVehicle.color);
                } else {
                    // Side-swipe spark shower
                    for (let k = 0; k < 8; k++) {
                        particleSystem.spawn(
                            (playerCar.x + v.x) * 0.5,
                            (playerCar.y + v.y) * 0.5,
                            (Math.random() - 0.5) * 220,
                            -Math.random() * 180 - 60,
                            3, 0.35, '#ffe066', 'spark'
                        );
                    }
                }

                if (onCollision) onCollision('traffic', actualDamage);
            } else if (!v.nearMissTriggered && playerCar.speed > 240) {
                // Forgiving Near-Miss Detection: thrill proximity within 55% lateral and 48% longitudinal buffer
                const lateralDist = Math.abs(playerCar.x - v.x);
                const longitudinalDist = Math.abs(playerCar.y - v.y);
                if (lateralDist < (playerCar.width + v.width) * 0.55 && longitudinalDist < (playerCar.length + v.length) * 0.48) {
                    v.nearMissTriggered = true;
                    particleSystem.spawnNearMiss(playerCar.x, playerCar.y - 15);
                    if (window.gameInstance) window.gameInstance.addCoins(10);
                    if (onCollision) onCollision('near_miss', 10);
                }
            }
        }

        // 2. Collisions with Road Obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            if (!o.active) continue;

            const oHalfW = o.width * 0.41;
            const oHalfL = o.length * 0.41;
            const oLeft = o.x - oHalfW;
            const oRight = o.x + oHalfW;
            const oTop = o.y - oHalfL;
            const oBottom = o.y + oHalfL;

            if (pRight > oLeft && pLeft < oRight && pBottom > oTop && pTop < oBottom) {
                if (o.type === 'roadblock') {
                    o.active = false;
                    const dmg = playerCar.triggerDamage(20);
                    playerCar.speed *= 0.6;
                    if (playerCar.health <= 0) {
                        particleSystem.spawnExplosion(o.x, o.y, '#e74c3c');
                    } else {
                        for (let k = 0; k < 8; k++) {
                            particleSystem.spawn(o.x, o.y, (Math.random() - 0.5) * 180, -110, 4, 0.4, '#e74c3c', 'spark');
                        }
                    }
                    if (onCollision) onCollision('roadblock', dmg);
                } else if (o.type === 'oil') {
                    playerCar.triggerOilSlip(1.4);
                    if (onCollision) onCollision('oil', 0);
                }
            }
        }

        // 3. Collecting Pickups
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            if (!p.active) continue;

            const dist = Math.hypot(playerCar.x - p.x, playerCar.y - p.y);
            if (dist < playerCar.width * 0.5 + p.radius) {
                p.active = false;
                if (p.type === 'coin') {
                    if (window.gameInstance) window.gameInstance.addCoins(15);
                    if (onCollision) onCollision('coin', 15);
                } else if (p.type === 'wrench') {
                    playerCar.repair(30);
                    if (onCollision) onCollision('wrench', 30);
                } else if (p.type === 'nitro') {
                    playerCar.nitroAmount = Math.min(playerCar.maxNitro, playerCar.nitroAmount + 50);
                    if (onCollision) onCollision('nitro', 50);
                }
            }
        }

        // 4. Check Finish Line Crossing
        if (this.finishLine.active && !this.finishLine.passed && playerCar.y <= this.finishLine.y + 10) {
            this.finishLine.passed = true;
            if (onCollision) onCollision('finish', 0);
        }
    }

    draw(ctx, time) {
        // Draw Obstacles (below vehicles)
        for (let o of this.obstacles) o.draw(ctx);

        // Draw Pickups
        for (let p of this.pickups) p.draw(ctx);

        // Draw Finish Line
        this.finishLine.draw(ctx);

        // Draw Traffic Vehicles
        for (let v of this.vehicles) v.draw(ctx, time);
    }
}



/* ============================================================================
   9. HUD & TELEMETRY CONTROLLER
   ============================================================================ */
class HUDManager {
    constructor() {
        this.speedValEl = document.getElementById('speed-val');
        this.gearValEl = document.getElementById('gear-val');
        this.nitroBarEl = document.getElementById('nitro-bar');
        this.nitroPercentEl = document.getElementById('nitro-percent');
        this.distValEl = document.getElementById('dist-value');
        this.coinsValEl = document.getElementById('coins-value');
        this.fpsEl = document.getElementById('fps-display');
        this.engineStatusEl = document.getElementById('engine-status');
        this.driftBannerEl = document.getElementById('drift-banner');
        this.driftAngleEl = document.getElementById('drift-angle');

        // Phase 3 HUD Elements
        this.levelNumDisplay = document.getElementById('level-num-display');
        this.levelProgressFill = document.getElementById('level-progress-fill');
        this.playerProgressMarker = document.getElementById('player-progress-marker');
        this.levelTargetRem = document.getElementById('level-target-rem');
        this.healthFill = document.getElementById('health-fill');
        this.healthVal = document.getElementById('health-val');
        this.levelTimerBox = document.getElementById('level-timer-box');
        this.levelTimerVal = document.getElementById('level-timer-val');
    }

    update(car, fps, dt, coins, levelManager) {
        // 1. Digital Speed (KM/H)
        const speedKmh = Math.max(0, Math.round(car.speed * CONFIG.SPEED_KMH_FACTOR));
        if (this.speedValEl) this.speedValEl.textContent = speedKmh;

        // 2. Simulated Transmission Gear
        let gear = 'N';
        if (car.speed < -5) {
            gear = 'R';
        } else if (speedKmh === 0) {
            gear = 'N';
        } else if (speedKmh < 45) {
            gear = '1';
        } else if (speedKmh < 95) {
            gear = '2';
        } else if (speedKmh < 155) {
            gear = '3';
        } else if (speedKmh < 220) {
            gear = '4';
        } else if (speedKmh < 285) {
            gear = '5';
        } else {
            gear = '6';
        }
        if (this.gearValEl) this.gearValEl.textContent = gear;

        // 3. Nitro Bar Fill
        const nitroP = Math.round((car.nitroAmount / car.maxNitro) * 100);
        if (this.nitroBarEl) this.nitroBarEl.style.width = `${nitroP}%`;
        if (this.nitroPercentEl) this.nitroPercentEl.textContent = `${nitroP}%`;

        // 4. Distance Traveled (Kilometers)
        const distKm = (car.totalDistanceMeters / 1000).toFixed(2);
        if (this.distValEl) this.distValEl.textContent = `${distKm} km`;

        // 5. In-Game Coins Display
        if (this.coinsValEl) this.coinsValEl.textContent = `🪙 ${coins.toLocaleString()}`;

        // 6. FPS & Engine Timestep Monitor
        if (this.fpsEl) this.fpsEl.textContent = `${Math.round(fps)} FPS`;
        if (this.engineStatusEl) this.engineStatusEl.textContent = `DT: ${(dt * 1000).toFixed(1)}ms`;

        // 7. Drift Active Banner & Yaw Angle
        if (this.driftBannerEl && this.driftAngleEl) {
            if (car.isDrifting && car.driftAngleDegrees > 6) {
                this.driftBannerEl.classList.remove('hidden');
                this.driftAngleEl.textContent = `${car.driftAngleDegrees}°`;
            } else {
                this.driftBannerEl.classList.add('hidden');
            }
        }

        // 8. Player Health / Hull Integrity Bar
        const hp = Math.max(0, Math.round(car.health));
        if (this.healthFill) {
            this.healthFill.style.width = `${hp}%`;
            if (hp <= 25) {
                this.healthFill.style.background = '#e74c3c';
            } else if (hp <= 55) {
                this.healthFill.style.background = '#f39c12';
            } else {
                this.healthFill.style.background = 'linear-gradient(90deg, #00f0ff, #00ff77)';
            }
        }
        if (this.healthVal) this.healthVal.textContent = `${hp}%`;

        // 9. Level Progression & Mission Timer
        if (levelManager) {
            const currentLvl = levelManager.currentLevel;
            if (this.levelNumDisplay) {
                this.levelNumDisplay.textContent = `LVL ${currentLvl.id}`;
            }

            const currentMeters = levelManager.distanceTraveled;
            const targetMeters = levelManager.targetDistance;
            const percent = Math.min(100, Math.max(0, (currentMeters / targetMeters) * 100));

            if (this.levelProgressFill) {
                this.levelProgressFill.style.width = `${percent}%`;
            }
            if (this.playerProgressMarker) {
                this.playerProgressMarker.style.left = `${percent}%`;
            }

            const remMeters = Math.max(0, Math.round(targetMeters - currentMeters));
            if (this.levelTargetRem) {
                this.levelTargetRem.textContent = `${remMeters.toLocaleString()}m`;
            }

            if (this.levelTimerBox && this.levelTimerVal) {
                if (levelManager.hasTimer) {
                    this.levelTimerBox.classList.remove('hidden');
                    const sec = Math.max(0, Math.ceil(levelManager.timeRemaining));
                    const m = Math.floor(sec / 60);
                    const s = sec % 60;
                    this.levelTimerVal.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    if (sec <= 12) {
                        this.levelTimerBox.classList.add('urgent');
                    } else {
                        this.levelTimerBox.classList.remove('urgent');
                    }
                } else {
                    this.levelTimerBox.classList.add('hidden');
                }
            }
        }
    }
}

/* ============================================================================
   10. PHASE 2: GARAGE & VEHICLE UPGRADE / UNLOCK SYSTEM
   ============================================================================ */
class GarageManager {
    constructor(engine) {
        this.engine = engine;
        this.isOpen = false;
        this.currentIndex = 0;

        // LocalStorage Keys
        this.STORAGE_UNLOCKED = 'apex_unlocked_cars';
        this.STORAGE_SELECTED = 'apex_selected_car';
        this.STORAGE_COINS = 'apex_player_coins';

        // Load Persistent Data (or defaults)
        this.unlockedCars = this.loadUnlockedCars();
        this.selectedCarId = this.loadSelectedCarId();
        this.coins = this.loadCoins();

        // Sync with CARS_DATABASE
        this.syncDatabaseUnlockedState();

        // Find initial index
        const foundIdx = CARS_DATABASE.findIndex(c => c.id === this.selectedCarId);
        this.currentIndex = foundIdx !== -1 ? foundIdx : 0;

        // DOM Element References
        this.screenEl = document.getElementById('garage-screen');
        this.touchControlsEl = document.getElementById('touch-controls');
        this.carNameEl = document.getElementById('car-name');
        this.carDescEl = document.getElementById('car-desc');
        this.carBadgeEl = document.getElementById('car-class-badge');
        this.carCounterEl = document.getElementById('car-index-counter');
        this.garageCoinsEl = document.getElementById('garage-coins-val');

        // Stat Bar Elements
        this.statSpeedBar = document.getElementById('stat-speed');
        this.statSpeedVal = document.getElementById('stat-speed-val');
        this.statAccelBar = document.getElementById('stat-accel');
        this.statAccelVal = document.getElementById('stat-accel-val');
        this.statHandlingBar = document.getElementById('stat-handling');
        this.statHandlingVal = document.getElementById('stat-handling-val');
        this.statArmorBar = document.getElementById('stat-armor');
        this.statArmorVal = document.getElementById('stat-armor-val');
        this.statNitroBar = document.getElementById('stat-nitro');
        this.statNitroVal = document.getElementById('stat-nitro-val');

        // Buttons
        this.actionBtn = document.getElementById('btn-garage-action');
        this.actionLabel = document.getElementById('btn-action-label');
        this.prevBtn = document.getElementById('btn-prev-car');
        this.nextBtn = document.getElementById('btn-next-car');
        this.closeBtn = document.getElementById('btn-close-garage');
        this.raceBtn = document.getElementById('btn-garage-race');
        this.bonusCoinBtn = document.getElementById('btn-add-coins');
        this.topToggleBtn = document.getElementById('btn-garage-toggle');

        // Podium Canvas & Animation State
        this.podiumCanvas = document.getElementById('garageCanvas');
        this.podiumCtx = this.podiumCanvas ? this.podiumCanvas.getContext('2d') : null;
        this.podiumAngle = 0;
        this.podiumAnimId = null;

        // Apply active vehicle to PlayerCar immediately
        const activeCar = CARS_DATABASE.find(c => c.id === this.selectedCarId) || CARS_DATABASE[0];
        if (this.engine.player) {
            this.engine.player.applyVehicleConfig(activeCar);
        }

        this.initListeners();
        this.updateUI();
    }

    loadUnlockedCars() {
        try {
            const data = localStorage.getItem(this.STORAGE_UNLOCKED);
            if (data) {
                const arr = JSON.parse(data);
                if (Array.isArray(arr) && arr.length > 0) {
                    return new Set(arr);
                }
            }
        } catch (_) {}
        return new Set(['car_1']); // Car 1 is starter
    }

    loadSelectedCarId() {
        try {
            const id = localStorage.getItem(this.STORAGE_SELECTED);
            if (id && CARS_DATABASE.some(c => c.id === id)) {
                return id;
            }
        } catch (_) {}
        return 'car_1';
    }

    loadCoins() {
        try {
            const val = localStorage.getItem(this.STORAGE_COINS);
            if (val !== null) {
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed)) return parsed;
            }
        } catch (_) {}
        return 1000; // Starter gift coins to test unlocking immediately
    }

    saveState() {
        try {
            localStorage.setItem(this.STORAGE_UNLOCKED, JSON.stringify([...this.unlockedCars]));
            localStorage.setItem(this.STORAGE_SELECTED, this.selectedCarId);
            localStorage.setItem(this.STORAGE_COINS, this.coins.toString());
        } catch (e) {
            console.warn('Storage save error:', e);
        }
    }

    syncDatabaseUnlockedState() {
        for (const car of CARS_DATABASE) {
            car.unlocked = this.unlockedCars.has(car.id);
        }
    }

    addCoins(amount) {
        this.coins += amount;
        this.saveState();
        if (this.garageCoinsEl) this.garageCoinsEl.textContent = `🪙 ${this.coins.toLocaleString()}`;
        this.updateActionButton();
    }

    initListeners() {
        // Navigation Buttons
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.navigate(-1);
            });
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.navigate(1);
            });
        }

        // Action Button (Buy / Select / Selected)
        if (this.actionBtn) {
            this.actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAction();
            });
        }

        // Close / Race Buttons
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close();
            });
        }

        if (this.raceBtn) {
            this.raceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close();
            });
        }

        // Top Bar Toggle Button
        if (this.topToggleBtn) {
            this.topToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }

        // Testing Bonus Coins Button
        if (this.bonusCoinBtn) {
            this.bonusCoinBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addCoins(500);
            });
        }

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyG') {
                this.toggle();
                e.preventDefault();
                return;
            }

            if (!this.isOpen) return;

            if (e.code === 'Escape') {
                this.close();
                e.preventDefault();
            } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.navigate(-1);
                e.preventDefault();
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.navigate(1);
                e.preventDefault();
            } else if (e.code === 'Space' || e.code === 'Enter') {
                this.handleAction();
                e.preventDefault();
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        if (this.engine.levelManager && this.engine.levelManager.isOpen) {
            this.engine.levelManager.closeModal();
        }
        if (this.screenEl) this.screenEl.classList.remove('hidden');
        if (this.touchControlsEl) this.touchControlsEl.style.display = 'none';

        // Set preview to currently selected car
        const idx = CARS_DATABASE.findIndex(c => c.id === this.selectedCarId);
        if (idx !== -1) this.currentIndex = idx;

        this.updateUI();
        this.startPodiumLoop();
    }

    close() {
        this.isOpen = false;
        if (this.screenEl) this.screenEl.classList.add('hidden');
        if (this.touchControlsEl) this.touchControlsEl.style.display = 'flex';
        this.stopPodiumLoop();

        // Apply chosen car to player
        const activeCar = CARS_DATABASE.find(c => c.id === this.selectedCarId) || CARS_DATABASE[0];
        if (this.engine.player) {
            this.engine.player.applyVehicleConfig(activeCar);
        }
    }

    navigate(direction) {
        this.currentIndex = (this.currentIndex + direction + CARS_DATABASE.length) % CARS_DATABASE.length;
        this.updateUI();
    }

    handleAction() {
        const car = CARS_DATABASE[this.currentIndex];
        if (!car) return;

        if (car.id === this.selectedCarId) {
            // Already selected -> Jump straight into the race!
            this.close();
            return;
        }

        if (this.unlockedCars.has(car.id)) {
            // Unlocked -> Select as active car
            this.selectedCarId = car.id;
            this.saveState();
            this.updateUI();
            if (this.engine.player) {
                this.engine.player.applyVehicleConfig(car);
            }
        } else if (this.coins >= car.price) {
            // Locked & Sufficient Coins -> Unlock and auto-select!
            this.coins -= car.price;
            this.unlockedCars.add(car.id);
            car.unlocked = true;
            this.selectedCarId = car.id;
            this.saveState();
            this.updateUI();
            if (this.engine.player) {
                this.engine.player.applyVehicleConfig(car);
            }
            if (navigator.vibrate) {
                try { navigator.vibrate([30, 50, 30]); } catch (_) {}
            }
        }
    }

    updateUI() {
        const car = CARS_DATABASE[this.currentIndex];
        if (!car) return;

        // Vehicle Metadata
        if (this.carBadgeEl) this.carBadgeEl.textContent = car.tag;
        if (this.carNameEl) this.carNameEl.textContent = car.name;
        if (this.carDescEl) this.carDescEl.textContent = car.desc;
        if (this.carCounterEl) this.carCounterEl.textContent = `${this.currentIndex + 1} / ${CARS_DATABASE.length}`;
        if (this.garageCoinsEl) this.garageCoinsEl.textContent = `🪙 ${this.coins.toLocaleString()}`;

        // 5 Stat Bars
        if (this.statSpeedBar) this.statSpeedBar.style.width = `${car.bars.speed}%`;
        if (this.statSpeedVal) this.statSpeedVal.textContent = car.displayStats.speed;

        if (this.statAccelBar) this.statAccelBar.style.width = `${car.bars.accel}%`;
        if (this.statAccelVal) this.statAccelVal.textContent = car.displayStats.accel;

        if (this.statHandlingBar) this.statHandlingBar.style.width = `${car.bars.handling}%`;
        if (this.statHandlingVal) this.statHandlingVal.textContent = car.displayStats.handling;

        if (this.statArmorBar) this.statArmorBar.style.width = `${car.bars.armor}%`;
        if (this.statArmorVal) this.statArmorVal.textContent = car.displayStats.armor;

        if (this.statNitroBar) this.statNitroBar.style.width = `${car.bars.nitro}%`;
        if (this.statNitroVal) this.statNitroVal.textContent = car.displayStats.nitro;

        // Action Button State
        this.updateActionButton();
    }

    updateActionButton() {
        const car = CARS_DATABASE[this.currentIndex];
        if (!this.actionBtn || !car) return;

        // Reset classes
        this.actionBtn.className = 'garage-main-btn';

        if (car.id === this.selectedCarId) {
            this.actionBtn.classList.add('btn-selected');
            if (this.actionLabel) this.actionLabel.textContent = 'ACTIVE CAR ✓';
        } else if (this.unlockedCars.has(car.id)) {
            this.actionBtn.classList.add('btn-ready');
            if (this.actionLabel) this.actionLabel.textContent = 'SELECT VEHICLE';
        } else if (this.coins >= car.price) {
            this.actionBtn.classList.add('btn-buy');
            if (this.actionLabel) this.actionLabel.textContent = `UNLOCK (🪙 ${car.price.toLocaleString()})`;
        } else {
            this.actionBtn.classList.add('btn-locked');
            if (this.actionLabel) this.actionLabel.textContent = `LOCKED (🪙 ${car.price.toLocaleString()})`;
        }
    }

    startPodiumLoop() {
        if (this.podiumAnimId) cancelAnimationFrame(this.podiumAnimId);

        let lastT = performance.now();
        const renderLoop = (now) => {
            if (!this.isOpen) return;

            const dt = (now - lastT) / 1000;
            lastT = now;

            // Rotate Turntable
            this.podiumAngle = (this.podiumAngle + dt * 0.75) % (Math.PI * 2);

            this.drawPodium(now / 1000);
            this.podiumAnimId = requestAnimationFrame(renderLoop);
        };

        this.podiumAnimId = requestAnimationFrame(renderLoop);
    }

    stopPodiumLoop() {
        if (this.podiumAnimId) {
            cancelAnimationFrame(this.podiumAnimId);
            this.podiumAnimId = null;
        }
    }

    drawPodium(time) {
        const ctx = this.podiumCtx;
        if (!ctx || !this.podiumCanvas) return;

        const cw = this.podiumCanvas.width;
        const ch = this.podiumCanvas.height;
        const cx = cw / 2;
        const cy = ch / 2 + 10;

        ctx.clearRect(0, 0, cw, ch);

        // --- 1. Neon Circular Showroom Turntable Base ---
        const rx = 160;
        const ry = 70;

        // Elliptical Floor Glow
        const floorGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, rx);
        floorGrad.addColorStop(0, 'rgba(0, 240, 255, 0.22)');
        floorGrad.addColorStop(0.65, 'rgba(0, 100, 180, 0.08)');
        floorGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = floorGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 1.2, ry * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Metallic Turntable Surface
        const platGrad = ctx.createRadialGradient(cx, cy - 5, 0, cx, cy, rx);
        platGrad.addColorStop(0, '#1c2638');
        platGrad.addColorStop(0.85, '#101724');
        platGrad.addColorStop(1, '#070a10');
        ctx.fillStyle = platGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rotating Radial Turntable Spokes
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const spokeAngle = this.podiumAngle + (i * Math.PI) / 4;
            const sx = Math.cos(spokeAngle) * rx * 0.95;
            const sy = Math.sin(spokeAngle) * ry * 0.95;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(sx, sy);
            ctx.stroke();
        }
        ctx.restore();

        // Outer Glowing Neon Ring
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // --- 2. Render Selected 2D Vector Car on Rotating Turntable ---
        const car = CARS_DATABASE[this.currentIndex];
        if (car) {
            ctx.save();
            ctx.translate(cx, cy - 12);
            ctx.rotate(this.podiumAngle);

            // High-detail procedural vehicle drawing on rotating podium
            VehicleRenderer.draw(ctx, car, false, 0, false, time, true, 0);

            ctx.restore();
        }
    }
}

/* ============================================================================
   11. PHASE 3: LEVEL PROGRESSION & MISSION MANAGER
   ============================================================================ */
class LevelManager {
    constructor(engine) {
        this.engine = engine;
        this.levels = LEVELS_CONFIG;

        // Persistent storage keys
        this.STORAGE_UNLOCKED_LEVEL = 'apex_unlocked_level';
        this.STORAGE_LEVEL_STARS = 'apex_level_stars';

        this.unlockedLevel = this.loadUnlockedLevel();
        this.levelStars = this.loadLevelStars();

        this.currentLevelIndex = 0;
        this.currentLevel = this.levels[0];

        // Active Level Run State
        this.distanceTraveled = 0;
        this.targetDistance = this.currentLevel.targetDist;
        this.hasTimer = this.currentLevel.timeLimit > 0;
        this.timeRemaining = this.currentLevel.timeLimit;
        this.isLevelActive = true;
        this.isCompleted = false;
        this.isFailed = false;
        this.levelTimeElapsed = 0;
        this.isOpen = false;

        // DOM elements
        this.selectScreenEl = document.getElementById('level-select-screen');
        this.gridContainerEl = document.getElementById('level-grid-container');
        this.btnToggleEl = document.getElementById('btn-level-select-toggle');
        this.btnCloseEl = document.getElementById('btn-close-levels');

        // Victory modal elements
        this.completeModalEl = document.getElementById('level-complete-modal');
        this.completeTitleEl = document.getElementById('complete-level-title');
        this.completeDescEl = document.getElementById('complete-stars-desc');
        this.star1El = document.getElementById('star-1');
        this.star2El = document.getElementById('star-2');
        this.star3El = document.getElementById('star-3');
        this.sumDistEl = document.getElementById('summary-distance');
        this.sumSpeedEl = document.getElementById('summary-speed');
        this.sumCoinsEl = document.getElementById('summary-coins');
        this.sumTimeEl = document.getElementById('summary-time');
        this.btnReplayEl = document.getElementById('btn-replay-level');
        this.btnGarageFromWinEl = document.getElementById('btn-garage-from-win');
        this.btnMenuFromWin = document.getElementById('btn-menu-from-win');
        this.btnNextLevelEl = document.getElementById('btn-next-level');

        // Game Over modal elements
        this.gameOverModalEl = document.getElementById('game-over-modal');
        this.gameOverTitleEl = document.getElementById('game-over-title');
        this.gameOverDescEl = document.getElementById('game-over-desc');
        this.btnRetryEl = document.getElementById('btn-retry-level');
        this.btnGarageFromFailEl = document.getElementById('btn-garage-from-fail');
        this.btnMenuFromFail = document.getElementById('btn-menu-from-fail');

        this.initDOM();
        this.renderLevelGrid();
    }

    loadUnlockedLevel() {
        try {
            const val = parseInt(localStorage.getItem(this.STORAGE_UNLOCKED_LEVEL) || '1', 10);
            return isNaN(val) ? 1 : Math.max(1, Math.min(10, val));
        } catch (e) {
            return 1;
        }
    }

    loadLevelStars() {
        try {
            const raw = localStorage.getItem(this.STORAGE_LEVEL_STARS);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    saveProgression() {
        try {
            localStorage.setItem(this.STORAGE_UNLOCKED_LEVEL, this.unlockedLevel.toString());
            localStorage.setItem(this.STORAGE_LEVEL_STARS, JSON.stringify(this.levelStars));
        } catch (e) {}
    }

    initDOM() {
        // Toggle Level Selection Modal
        if (this.btnToggleEl) {
            this.btnToggleEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleModal();
            });
        }
        if (this.btnCloseEl) {
            this.btnCloseEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeModal();
            });
        }

        // Keyboard Shortcut 'L'
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyL') {
                if (!this.engine.garage || !this.engine.garage.isOpen) {
                    this.toggleModal();
                }
            }
        });

        // Replay Level
        if (this.btnReplayEl) {
            this.btnReplayEl.addEventListener('click', () => {
                this.closeCompleteModal();
                this.restartCurrentLevel();
            });
        }

        // Retry Level from Game Over
        if (this.btnRetryEl) {
            this.btnRetryEl.addEventListener('click', () => {
                this.closeGameOverModal();
                this.restartCurrentLevel();
            });
        }

        // Next Level Button
        if (this.btnNextLevelEl) {
            this.btnNextLevelEl.addEventListener('click', () => {
                this.closeCompleteModal();
                if (this.currentLevelIndex < this.levels.length - 1) {
                    this.selectLevel(this.currentLevelIndex + 1);
                } else {
                    this.restartCurrentLevel();
                }
            });
        }

        // Garage navigation from modals
        if (this.btnGarageFromWinEl) {
            this.btnGarageFromWinEl.addEventListener('click', () => {
                this.closeCompleteModal();
                if (this.engine.garage) this.engine.garage.open();
            });
        }
        if (this.btnGarageFromFailEl) {
            this.btnGarageFromFailEl.addEventListener('click', () => {
                this.closeGameOverModal();
                if (this.engine.garage) this.engine.garage.open();
            });
        }

        // Main Menu navigation from modals
        if (this.btnMenuFromWin) {
            this.btnMenuFromWin.addEventListener('click', () => {
                this.closeCompleteModal();
                this.engine.showMainMenu();
            });
        }
        if (this.btnMenuFromFail) {
            this.btnMenuFromFail.addEventListener('click', () => {
                this.closeGameOverModal();
                this.engine.showMainMenu();
            });
        }
    }

    toggleModal() {
        if (this.isOpen) {
            this.closeModal();
        } else {
            this.openModal();
        }
    }

    openModal() {
        this.isOpen = true;
        if (this.engine.garage && this.engine.garage.isOpen) {
            this.engine.garage.close();
        }
        this.renderLevelGrid();
        if (this.selectScreenEl) this.selectScreenEl.classList.remove('hidden');
    }

    closeModal() {
        this.isOpen = false;
        if (this.selectScreenEl) this.selectScreenEl.classList.add('hidden');
    }

    closeCompleteModal() {
        if (this.completeModalEl) this.completeModalEl.classList.add('hidden');
    }

    closeGameOverModal() {
        if (this.gameOverModalEl) this.gameOverModalEl.classList.add('hidden');
    }

    renderLevelGrid() {
        if (!this.gridContainerEl) return;
        this.gridContainerEl.innerHTML = '';

        this.levels.forEach((lvl, idx) => {
            const isUnlocked = lvl.id <= this.unlockedLevel;
            const isCurrent = idx === this.currentLevelIndex;
            const starsEarned = this.levelStars[lvl.id] || 0;

            const card = document.createElement('div');
            card.className = `level-card ${isCurrent ? 'active-track' : ''} ${!isUnlocked ? 'locked' : ''}`;

            // Top row
            const topRow = document.createElement('div');
            topRow.className = 'level-card-top';

            const numPill = document.createElement('span');
            numPill.className = 'level-num-pill';
            numPill.textContent = `LVL ${lvl.id}`;

            const starsBox = document.createElement('div');
            starsBox.className = 'level-stars-mini';
            for (let s = 1; s <= 3; s++) {
                const starSpan = document.createElement('span');
                starSpan.textContent = '★';
                if (s <= starsEarned) starSpan.className = 'star-on';
                starsBox.appendChild(starSpan);
            }

            topRow.appendChild(numPill);
            topRow.appendChild(starsBox);

            // Name & theme
            const nameEl = document.createElement('div');
            nameEl.className = 'level-card-name';
            nameEl.textContent = lvl.title;

            const themeEl = document.createElement('div');
            themeEl.className = 'level-card-theme';
            themeEl.textContent = lvl.subtitle;

            // Bottom row
            const botRow = document.createElement('div');
            botRow.className = 'level-card-bottom';

            const distBadge = document.createElement('span');
            distBadge.className = 'level-dist-badge';
            distBadge.textContent = `${lvl.targetDist.toLocaleString()}m`;

            const statusTag = document.createElement('span');
            statusTag.className = 'level-status-tag';
            if (!isUnlocked) {
                statusTag.textContent = 'LOCKED 🔒';
            } else if (isCurrent) {
                statusTag.textContent = 'PLAYING';
            } else {
                statusTag.textContent = 'SELECT';
            }

            botRow.appendChild(distBadge);
            botRow.appendChild(statusTag);

            card.appendChild(topRow);
            card.appendChild(nameEl);
            card.appendChild(themeEl);
            card.appendChild(botRow);

            if (isUnlocked) {
                card.addEventListener('click', () => {
                    this.selectLevel(idx);
                    this.closeModal();
                });
            }

            this.gridContainerEl.appendChild(card);
        });
    }

    selectLevel(index) {
        this.currentLevelIndex = index;
        this.currentLevel = this.levels[index];
        this.restartCurrentLevel();
        this.renderLevelGrid();
        if (this.engine.gameState === 'MENU') {
            this.engine.startRace();
        }
    }

    restartCurrentLevel() {
        this.distanceTraveled = 0;
        this.targetDistance = this.currentLevel.targetDist;
        this.hasTimer = this.currentLevel.timeLimit > 0;
        this.timeRemaining = this.currentLevel.timeLimit;
        this.levelTimeElapsed = 0;
        this.isCompleted = false;
        this.isFailed = false;
        this.isLevelActive = true;

        if (this.engine) {
            this.engine.resetLevel(this.currentLevel);
        }
    }

    update(dt, playerCar) {
        if (!this.isLevelActive || this.isCompleted || this.isFailed) return;

        this.levelTimeElapsed += dt;

        // Accumulate distance
        if (playerCar.speed > 0) {
            const deltaM = (playerCar.speed * dt * CONFIG.SPEED_KMH_FACTOR) / 3.6;
            this.distanceTraveled += deltaM;
        }

        // Countdown timer
        if (this.hasTimer) {
            this.timeRemaining -= dt;
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.failLevel('Time Expired! You ran out of time before reaching the finish line.');
                return;
            }
        }

        // Hull integrity check
        if (playerCar.health <= 0) {
            this.failLevel('Vehicle Wrecked! Your hull integrity was depleted in collision.');
            return;
        }

        // Deploy finish line when nearing target distance
        const traffic = this.engine?.traffic;
        if (traffic && !traffic.finishLine.active && !traffic.finishLine.passed) {
            if (this.distanceTraveled >= this.targetDistance - 260) {
                traffic.finishLine.spawn(-150);
            }
        }

        // Check level completion
        if (traffic?.finishLine.passed || this.distanceTraveled >= this.targetDistance) {
            this.completeLevel(playerCar);
        }
    }

    completeLevel(playerCar) {
        if (this.isCompleted || this.isFailed) return;
        this.isCompleted = true;
        this.isLevelActive = false;

        // Calculate 3-star rating
        // Star 1: Cleared level
        // Star 2: Finish with at least 50% health
        // Star 3: Finish with at least 70% health AND within generous time (or > 80% health if no timer)
        let stars = 1;
        const hpPercent = (playerCar.health / playerCar.maxHealth) * 100;

        if (hpPercent >= 50) {
            stars = 2;
        }

        if (this.hasTimer) {
            if (hpPercent >= 70 && this.timeRemaining > 8) {
                stars = 3;
            }
        } else {
            if (hpPercent >= 80) {
                stars = 3;
            }
        }

        // Save star rating
        const prevStars = this.levelStars[this.currentLevel.id] || 0;
        this.levelStars[this.currentLevel.id] = Math.max(prevStars, stars);

        // Unlock next level
        if (this.currentLevel.id >= this.unlockedLevel && this.currentLevel.id < 10) {
            this.unlockedLevel = this.currentLevel.id + 1;
        }
        this.saveProgression();

        // Award Coins
        const rewardCoins = 100 + (this.currentLevel.id * 35) + (stars * 40);
        this.engine.addCoins(rewardCoins);

        // Audio
        this.engine.sound.playWin();

        // Populate Victory Modal
        if (this.completeTitleEl) {
            this.completeTitleEl.textContent = `${this.currentLevel.title.toUpperCase()} COMPLETE`;
        }

        // Stars description
        if (this.completeDescEl) {
            if (stars === 3) {
                this.completeDescEl.textContent = 'Dominant Victory! Flawless driving and razor-sharp speed!';
            } else if (stars === 2) {
                this.completeDescEl.textContent = 'Great Run! Solid vehicle preservation and pace!';
            } else {
                this.completeDescEl.textContent = 'Track Cleared! You survived to race another day.';
            }
        }

        // Stars visual
        [this.star1El, this.star2El, this.star3El].forEach((starEl, idx) => {
            if (starEl) {
                if (idx < stars) {
                    starEl.classList.add('star-active');
                } else {
                    starEl.classList.remove('star-active');
                }
            }
        });

        // Summary values
        if (this.sumDistEl) this.sumDistEl.textContent = `${this.targetDistance.toLocaleString()} m`;
        if (this.sumSpeedEl) this.sumSpeedEl.textContent = `${Math.round(playerCar.topSpeedReached || (playerCar.speed * CONFIG.SPEED_KMH_FACTOR))} km/h`;
        if (this.sumCoinsEl) this.sumCoinsEl.textContent = `+${rewardCoins} 🪙`;

        const totalSec = Math.floor(this.levelTimeElapsed);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        if (this.sumTimeEl) this.sumTimeEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        // Next level button text/visibility
        if (this.btnNextLevelEl) {
            if (this.currentLevelIndex >= this.levels.length - 1) {
                this.btnNextLevelEl.textContent = 'ALL LEVELS CLEARED! 🏆';
            } else {
                this.btnNextLevelEl.textContent = 'NEXT LEVEL ➔';
            }
        }

        if (this.completeModalEl) this.completeModalEl.classList.remove('hidden');
        this.renderLevelGrid();
    }

    failLevel(reason) {
        if (this.isFailed || this.isCompleted) return;
        this.isFailed = true;
        this.isLevelActive = false;

        this.engine.sound.playCrash();

        if (this.gameOverTitleEl) this.gameOverTitleEl.textContent = 'MISSION FAILED';
        if (this.gameOverDescEl) this.gameOverDescEl.textContent = reason;

        if (this.gameOverModalEl) this.gameOverModalEl.classList.remove('hidden');
    }
}

/* ============================================================================
   12. CORE ENGINE & DETERMINISTIC GAME LOOP
   ============================================================================ */
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // Game Flow State: 'MENU' (default), 'PLAYING', 'PAUSED'
        this.gameState = 'MENU';

        // Subsystems
        this.input = new InputManager();
        this.sound = new SoundEngine();
        this.hud = new HUDManager();
        this.particles = new ParticleSystem();
        this.skidmarks = new SkidmarkSystem();
        this.speedLines = new SpeedLines();
        this.roadEnv = new RoadEnvironment();
        this.player = new PlayerCar();

        // Phase 3: Traffic & Hazard AI, Weather System & Level Progression Manager
        this.weather = new WeatherSystem();
        this.traffic = new TrafficManager(this.roadEnv);
        this.levelManager = new LevelManager(this);

        // Phase 2: Vehicle Garage & Vault Manager
        this.garage = new GarageManager(this);

        // UI Flow Elements (Phase 4)
        this.mainMenuEl = document.getElementById('main-menu-screen');
        this.btnMainStart = document.getElementById('btn-main-start');
        this.btnMainLevels = document.getElementById('btn-main-levels');
        this.btnMainGarage = document.getElementById('btn-main-garage');
        this.btnMainHelp = document.getElementById('btn-main-help');
        this.menuCarNameEl = document.getElementById('menu-car-name');
        this.menuCoinsValEl = document.getElementById('menu-coins-val');
        this.menuUnlockedValEl = document.getElementById('menu-unlocked-val');

        this.pauseModalEl = document.getElementById('pause-modal');
        this.btnPauseToggle = document.getElementById('btn-pause');
        this.btnPauseResume = document.getElementById('btn-pause-resume');
        this.btnPauseRestart = document.getElementById('btn-pause-restart');
        this.btnPauseLevels = document.getElementById('btn-pause-levels');
        this.btnPauseGarage = document.getElementById('btn-pause-garage');
        this.btnPauseMenu = document.getElementById('btn-pause-menu');

        this.helpModalEl = document.getElementById('help-modal');
        this.btnCloseHelp = document.getElementById('btn-close-help');

        this.nearMissBannerEl = document.getElementById('near-miss-banner');
        this.nearMissTimer = null;

        // Loop Timers & Deterministic Accumulator
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.fps = 60;
        this.frameCount = 0;
        this.fpsTimer = 0;

        // Screen Shake during High-Velocity Nitro or Off-road impacts
        this.shakeTime = 0;
        this.shakeMagnitude = 0;

        this.initEventListeners();
        this.initUIFlowListeners();
        this.resizeCanvas();
        this.showMainMenu();
        this.startLoop();
    }

    showMainMenu() {
        this.gameState = 'MENU';
        if (this.mainMenuEl) this.mainMenuEl.classList.remove('hidden');
        if (this.pauseModalEl) this.pauseModalEl.classList.add('hidden');
        if (this.helpModalEl) this.helpModalEl.classList.add('hidden');
        if (this.garage && this.garage.isOpen) this.garage.close();
        if (this.levelManager) {
            this.levelManager.closeModal();
            this.levelManager.closeCompleteModal();
            this.levelManager.closeGameOverModal();
        }
        const touchUI = document.getElementById('touch-controls');
        if (touchUI) touchUI.style.display = 'none';

        this.updateMainMenuUI();
    }

    updateMainMenuUI() {
        if (this.menuCarNameEl && this.player?.currentVehicle) {
            this.menuCarNameEl.textContent = this.player.currentVehicle.name.toUpperCase();
        }
        if (this.menuCoinsValEl && this.garage) {
            this.menuCoinsValEl.textContent = `🪙 ${this.garage.coins.toLocaleString()} COINS`;
        }
        if (this.menuUnlockedValEl && this.levelManager) {
            this.menuUnlockedValEl.textContent = `${this.levelManager.unlockedLevel}/10 TRACKS`;
        }
    }

    startRace() {
        this.sound.init();
        this.sound.resume();
        this.sound.playButtonClick();
        this.gameState = 'PLAYING';
        if (this.mainMenuEl) this.mainMenuEl.classList.add('hidden');
        if (this.pauseModalEl) this.pauseModalEl.classList.add('hidden');
        if (this.helpModalEl) this.helpModalEl.classList.add('hidden');
        const touchUI = document.getElementById('touch-controls');
        if (touchUI) touchUI.style.display = 'flex';
    }

    togglePause() {
        if (this.gameState === 'MENU') return;
        if (this.gameState === 'PAUSED') {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    pauseGame() {
        if (this.gameState !== 'PLAYING') return;
        this.gameState = 'PAUSED';
        this.sound.playButtonClick();
        if (this.pauseModalEl) this.pauseModalEl.classList.remove('hidden');
    }

    resumeGame() {
        if (this.gameState !== 'PAUSED') return;
        this.gameState = 'PLAYING';
        this.sound.playButtonClick();
        if (this.pauseModalEl) this.pauseModalEl.classList.add('hidden');
    }

    triggerNearMissBanner() {
        this.sound.playNearMiss();
        if (!this.nearMissBannerEl) return;
        this.nearMissBannerEl.classList.remove('hidden');
        if (this.nearMissTimer) clearTimeout(this.nearMissTimer);
        this.nearMissTimer = setTimeout(() => {
            if (this.nearMissBannerEl) this.nearMissBannerEl.classList.add('hidden');
        }, 650);
    }

    handleHardwareBack() {
        // Android hardware back button handler
        if (this.helpModalEl && !this.helpModalEl.classList.contains('hidden')) {
            this.helpModalEl.classList.add('hidden');
            return;
        }
        if (this.garage && this.garage.isOpen) {
            this.garage.close();
            if (this.gameState === 'MENU') this.showMainMenu();
            return;
        }
        if (this.levelManager && this.levelManager.isOpen) {
            this.levelManager.closeModal();
            if (this.gameState === 'MENU') this.showMainMenu();
            return;
        }
        if (this.gameState === 'PLAYING') {
            this.togglePause();
            return;
        }
        if (this.gameState === 'PAUSED') {
            this.resumeGame();
            return;
        }
    }

    initUIFlowListeners() {
        // Main Menu Buttons
        if (this.btnMainStart) {
            this.btnMainStart.addEventListener('click', () => this.startRace());
        }
        if (this.btnMainLevels) {
            this.btnMainLevels.addEventListener('click', () => {
                this.sound.playButtonClick();
                this.levelManager.openModal();
            });
        }
        if (this.btnMainGarage) {
            this.btnMainGarage.addEventListener('click', () => {
                this.sound.playButtonClick();
                this.garage.open();
            });
        }
        if (this.btnMainHelp) {
            this.btnMainHelp.addEventListener('click', () => {
                this.sound.playButtonClick();
                if (this.helpModalEl) this.helpModalEl.classList.remove('hidden');
            });
        }
        if (this.btnCloseHelp) {
            this.btnCloseHelp.addEventListener('click', () => {
                this.sound.playButtonClick();
                if (this.helpModalEl) this.helpModalEl.classList.add('hidden');
            });
        }

        // Pause Menu Buttons
        if (this.btnPauseToggle) {
            this.btnPauseToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePause();
            });
        }
        if (this.btnPauseResume) {
            this.btnPauseResume.addEventListener('click', () => this.resumeGame());
        }
        if (this.btnPauseRestart) {
            this.btnPauseRestart.addEventListener('click', () => {
                this.resumeGame();
                this.levelManager.restartCurrentLevel();
            });
        }
        if (this.btnPauseLevels) {
            this.btnPauseLevels.addEventListener('click', () => {
                this.sound.playButtonClick();
                if (this.pauseModalEl) this.pauseModalEl.classList.add('hidden');
                this.levelManager.openModal();
            });
        }
        if (this.btnPauseGarage) {
            this.btnPauseGarage.addEventListener('click', () => {
                this.sound.playButtonClick();
                if (this.pauseModalEl) this.pauseModalEl.classList.add('hidden');
                this.garage.open();
            });
        }
        if (this.btnPauseMenu) {
            this.btnPauseMenu.addEventListener('click', () => {
                this.sound.playButtonClick();
                this.showMainMenu();
            });
        }

        // Keyboard Shortcut 'P' or 'Escape' for Pause
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.gameState === 'PLAYING' || this.gameState === 'PAUSED') {
                    this.togglePause();
                    e.preventDefault();
                }
            }
        });

        // Capacitor Android Native Integration (Back Button, Status Bar, Screen Orientation)
        if (window.Capacitor && window.Capacitor.Plugins) {
            const { App, StatusBar, ScreenOrientation } = window.Capacitor.Plugins;
            if (App) {
                App.addListener('backButton', () => {
                    this.handleHardwareBack();
                });
            }
            if (StatusBar) {
                try {
                    StatusBar.hide().catch(() => {});
                } catch (err) {
                    console.warn('[Capacitor] StatusBar.hide failed:', err);
                }
            }
            if (ScreenOrientation) {
                try {
                    ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
                } catch (err) {
                    console.warn('[Capacitor] ScreenOrientation.lock failed:', err);
                }
            }
        }
    }

    resetLevel(level) {
        if (this.traffic) this.traffic.reset();
        if (this.weather) this.weather.reset();
        if (this.player) this.player.resetStatus();
        if (this.particles) this.particles.pool.forEach(p => p.active = false);
        if (this.skidmarks) this.skidmarks.marks = [];
        this.shakeTime = 0;
    }

    handleCollision(type, val) {
        if (type === 'traffic') {
            this.triggerShake(0.28, 8.5);
            this.sound.playCrash();
        } else if (type === 'near_miss') {
            this.triggerNearMissBanner();
        } else if (type === 'roadblock') {
            this.triggerShake(0.20, 6.0);
            this.sound.playCrash();
        } else if (type === 'coin') {
            this.sound.playCoin();
        } else if (type === 'wrench') {
            this.sound.playRepair();
        } else if (type === 'nitro') {
            this.sound.playNitroPickup();
        } else if (type === 'finish') {
            if (this.levelManager) this.levelManager.completeLevel(this.player);
        }
    }

    addCoins(amount) {
        if (this.garage) {
            this.garage.addCoins(amount);
            this.updateMainMenuUI();
        }
    }

    initEventListeners() {
        // Window Resize
        window.addEventListener('resize', () => this.resizeCanvas());

        // Fullscreen Toggle
        const fsBtn = document.getElementById('btn-fullscreen');
        if (fsBtn) {
            fsBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            });
        }

        // Sound Mute Toggle
        const audioBtn = document.getElementById('btn-audio');
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                this.sound.init();
                const muted = this.sound.toggleMute();
                audioBtn.style.opacity = muted ? '0.4' : '1.0';
            });
        }

        // Initialize Audio Context on any user gesture
        const unlockAudio = () => {
            this.sound.init();
            this.sound.resume();
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
        };
        window.addEventListener('click', unlockAudio);
        window.addEventListener('keydown', unlockAudio);
        window.addEventListener('touchstart', unlockAudio, { passive: true });

        // Handle page visibility change (pause audio / reset accumulator on resume)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.sound.engineGain) this.sound.engineGain.gain.setValueAtTime(0, this.sound.ctx?.currentTime || 0);
            } else {
                this.lastTime = performance.now();
                this.accumulator = 0;
            }
        });
    }

    resizeCanvas() {
        // Internal logical resolution stays strictly 720x1280
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;
    }

    triggerShake(duration, magnitude) {
        this.shakeTime = duration;
        this.shakeMagnitude = magnitude;
    }

    startLoop() {
        const loop = (currentTime) => {
            requestAnimationFrame(loop);

            // Compute elapsed frame time
            let frameTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;

            // Clamp frame time to prevent spiraling after tab suspension
            if (frameTime > CONFIG.MAX_FRAME_TIME) {
                frameTime = CONFIG.MAX_FRAME_TIME;
            }

            // FPS Diagnostic Tracker
            this.frameCount++;
            this.fpsTimer += frameTime;
            if (this.fpsTimer >= 0.5) {
                this.fps = this.frameCount / this.fpsTimer;
                this.frameCount = 0;
                this.fpsTimer = 0;
            }

            // --- Deterministic Fixed-Step Physics Accumulator ---
            this.accumulator += frameTime;
            while (this.accumulator >= CONFIG.FIXED_DT) {
                this.fixedUpdate(CONFIG.FIXED_DT);
                this.accumulator -= CONFIG.FIXED_DT;
            }

            // Render Frame with Inter-frame camera shake and dynamic effects
            this.render(frameTime);
        };

        requestAnimationFrame(loop);
    }

    fixedUpdate(dt) {
        // If in Menu, keep player idling and scenery rolling in background
        if (this.gameState === 'MENU') {
            this.player.speed = 180;
            this.roadEnv.update(dt, this.player.speed);
            this.particles.update(dt, this.player.speed);
            this.sound.update(0, false, 0, false);
            return;
        }

        // If paused or modals active, pause physics
        const isModalActive = (this.gameState === 'PAUSED') ||
                             (this.garage && this.garage.isOpen) ||
                             (this.levelManager && (this.levelManager.isOpen || this.levelManager.isCompleted || this.levelManager.isFailed));

        if (isModalActive) {
            this.sound.update(0, false, 0, false);
            return;
        }

        const currentLvl = this.levelManager.currentLevel;

        // Update Level Timer & Distance Logic
        this.levelManager.update(dt, this.player);

        // Update Player Car Physics with Level Grip
        this.player.update(dt, this.input, this.roadEnv, this.particles, this.skidmarks, currentLvl.gripMult);

        // Update Road & Parallax Scenery Scrolling
        this.roadEnv.update(dt, this.player.speed);

        // Update Traffic Vehicles, Road Obstacles & Pickups (Fair Spawn)
        this.traffic.update(dt, this.player, currentLvl, this.particles, (type, val) => this.handleCollision(type, val));

        // Update Dynamic Weather System
        this.weather.update(dt, this.player.speed, currentLvl.theme);

        // Update Skidmarks downward movement
        this.skidmarks.update(this.player.speed * dt);

        // Update Dynamic Speed Lines
        this.speedLines.update(dt, this.player.speed, this.player.isNitroActive);

        // Update Particle System
        this.particles.update(dt, this.player.speed);

        // Camera Shake calculation
        if (this.player.isNitroActive) {
            this.triggerShake(0.05, 3.5);
        } else if (this.player.isDrifting && this.player.speed > 500) {
            this.triggerShake(0.04, 2.0);
        }

        // Sound Synthesis Update
        const speedRatio = Math.max(0, this.player.speed / this.player.maxBaseSpeed);
        this.sound.update(speedRatio, this.player.isDrifting, this.player.driftRatio, this.player.isNitroActive);
    }

    render(dt) {
        const ctx = this.ctx;
        const currentLvl = this.levelManager ? this.levelManager.currentLevel : LEVELS_CONFIG[0];

        ctx.save();

        // Screen Shake offset
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            const ox = (Math.random() * 2 - 1) * this.shakeMagnitude;
            const oy = (Math.random() * 2 - 1) * this.shakeMagnitude;
            ctx.translate(ox, oy);
        }

        // Clear canvas with deep dark baseline
        ctx.fillStyle = '#090c12';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // 1. Road & Parallax Roadside Environment with Active Level Theme
        this.roadEnv.draw(ctx, currentLvl.theme);

        // 2. Persistent Tire Skidmarks on Road
        this.skidmarks.draw(ctx);

        // 3. Particles Behind Car (Smoke, Dust, Sparks)
        this.particles.draw(ctx);

        // 4. Traffic Vehicles, Road Obstacles, Pickups & Finish Line (only when playing or paused)
        if (this.gameState !== 'MENU') {
            this.traffic.draw(ctx, this.player.engineTime);
        }

        // 5. Player Car
        this.player.draw(ctx, this.input.brake);

        // 6. Dynamic Weather System Overlays (Night headlight punchout, sandstorm, rain)
        this.weather.draw(ctx, currentLvl.theme, this.player, this.roadEnv.props, this.player.speed);

        // 7. Dynamic Speed / Nitro Warp Wind Lines
        if (this.gameState !== 'MENU') {
            this.speedLines.draw(ctx, this.player.speed, this.player.isNitroActive);
        }

        ctx.restore();

        // 8. HUD Telemetry Overlay Update (passing player coins & level manager)
        const currentCoins = this.garage ? this.garage.coins : 0;
        this.hud.update(this.player, this.fps, CONFIG.FIXED_DT, currentCoins, this.levelManager);
    }
}

// Instantiate Engine when DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new GameEngine();
});

