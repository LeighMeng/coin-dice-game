// audio.js

class AudioManager {
    constructor() {
        this.ctx = null;
        this.bgmEnabled = true;
        this.sfxEnabled = true;
        this.bgmInterval = null;
        this.tempo = 95; // BPM
        this.stepTime = 60 / this.tempo / 2; // 8th note duration (approx 0.31s)
        this.currentStep = 0;
        this.nextNoteTime = 0;
        
        // Gains
        this.masterGainSFX = null;
        this.masterGainBGM = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        
        this.ctx = new AudioContextClass();
        
        // Master gain controls
        this.masterGainSFX = this.ctx.createGain();
        this.masterGainBGM = this.ctx.createGain();
        
        this.masterGainSFX.connect(this.ctx.destination);
        this.masterGainBGM.connect(this.ctx.destination);
        
        // Set initial volumes
        this.masterGainSFX.gain.value = this.sfxEnabled ? 0.45 : 0;
        this.masterGainBGM.gain.value = this.bgmEnabled ? 0.20 : 0;
    }

    resumeContext() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // --- SFX Generators ---

    playClick() {
        if (!this.sfxEnabled) return;
        this.resumeContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGainSFX);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        
        osc.start(now);
        osc.stop(now + 0.07);
    }

    playCoinFlip() {
        if (!this.sfxEnabled) return;
        this.resumeContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Ringing metallic tone frequencies (bell-like partials)
        const freqs = [880, 1200, 1760];
        freqs.forEach((f, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGainSFX);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);
            osc.frequency.linearRampToValueAtTime(f + 25, now + 0.4);
            
            const maxVolume = index === 0 ? 0.15 : 0.04;
            gain.gain.setValueAtTime(maxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            
            osc.start(now);
            osc.stop(now + 0.45);
        });
    }

    playDiceRoll() {
        if (!this.sfxEnabled) return;
        this.resumeContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const duration = 0.55;
        const steps = 6;
        
        for (let i = 0; i < steps; i++) {
            const time = now + (i * (duration / steps)) + Math.random() * 0.04;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGainSFX);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(120 + Math.random() * 100, time);
            
            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            
            osc.start(time);
            osc.stop(time + 0.06);
        }
    }

    playClash() {
        if (!this.sfxEnabled) return;
        this.resumeContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // 1. Low frequency rumble
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGainSFX);
        
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(180, now);
        bassOsc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
        
        bassGain.gain.setValueAtTime(0.4, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        bassOsc.start(now);
        bassOsc.stop(now + 0.26);

        // 2. Mid/High frequency crunch
        const midOsc = this.ctx.createOscillator();
        const midGain = this.ctx.createGain();
        midOsc.connect(midGain);
        midGain.connect(this.masterGainSFX);
        
        midOsc.type = 'sawtooth';
        midOsc.frequency.setValueAtTime(320, now);
        midOsc.frequency.linearRampToValueAtTime(120, now + 0.15);
        
        midGain.gain.setValueAtTime(0.08, now);
        midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        
        midOsc.start(now);
        midOsc.stop(now + 0.17);
    }

    playHeal() {
        if (!this.sfxEnabled) return;
        this.resumeContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6 (Arpeggio)
        
        notes.forEach((freq, idx) => {
            const time = now + idx * 0.07;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGainSFX);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            
            gain.gain.setValueAtTime(0.07, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
            
            osc.start(time);
            osc.stop(time + 0.25);
        });
    }

    playGameOver() {
        if (!this.sfxEnabled) return;
        this.resumeContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [293.66, 277.18, 261.63, 220.00]; // D4, C#4, C4, A3 (Sad descending)
        
        notes.forEach((freq, idx) => {
            const time = now + idx * 0.24;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGainSFX);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.linearRampToValueAtTime(freq - 20, time + 0.35);
            
            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);
            
            osc.start(time);
            osc.stop(time + 0.40);
        });
    }

    playGameWin() {
        if (!this.sfxEnabled) return;
        this.resumeContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major scale arpeggio
        
        notes.forEach((freq, idx) => {
            const time = now + idx * 0.08;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGainSFX);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            
            gain.gain.setValueAtTime(0.10, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
            
            osc.start(time);
            osc.stop(time + 0.40);
        });
    }

    // --- BGM Sequencer Logic ---

    playBgmStep(time) {
        if (!this.bgmEnabled) return;

        const stepInPattern = this.currentStep % 16;
        
        // 1. Bass Line (Roots A2, F2, C2, G2)
        if (stepInPattern === 0 || stepInPattern === 8) {
            let bassFreq = 110.00; // A2
            if (stepInPattern === 8) {
                // Alternating bass root notes for harmonic progression
                const rootOptions = [82.41, 98.00, 87.31]; // E2, G2, F2
                bassFreq = rootOptions[Math.floor(Math.random() * rootOptions.length)];
            }
            this.synthBassNote(bassFreq, time);
        }
        
        // 2. Ambient Melody (A minor pentatonic scale)
        // Keep it sparse by playing notes on even steps or randomly (approx 65% chance)
        if (stepInPattern % 2 === 0 || Math.random() < 0.3) {
            const scale = [329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00]; // E4, G4, A4, C5, D5, E5, G5, A5
            const noteFreq = scale[Math.floor(Math.random() * scale.length)];
            this.synthMelodyNote(noteFreq, time);
        }
    }

    synthBassNote(freq, time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGainBGM);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, time);
        
        gain.gain.setValueAtTime(0.14, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 1.1);
        
        osc.start(time);
        osc.stop(time + 1.25);
    }

    synthMelodyNote(freq, time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const delay = this.ctx.createDelay();
        const feedback = this.ctx.createGain();
        
        osc.connect(filter);
        filter.connect(gain);
        
        // Dry signal
        gain.connect(this.masterGainBGM);
        
        // Wet signal (Delay with Feedback loop for cosmic space effect)
        gain.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        feedback.connect(this.masterGainBGM);
        
        delay.delayTime.setValueAtTime(0.24, time);
        feedback.gain.setValueAtTime(0.28, time); // Echo tail decay rate
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, time);
        
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
        
        osc.start(time);
        osc.stop(time + 0.45);
    }

    startBgm() {
        this.resumeContext();
        if (!this.ctx) return;
        if (this.bgmInterval) return; // Already running

        this.nextNoteTime = this.ctx.currentTime + 0.05;
        this.bgmInterval = setInterval(() => {
            if (!this.bgmEnabled) return;
            
            const scheduleAheadTime = 0.16; // Schedule notes 160ms ahead
            while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
                this.playBgmStep(this.nextNoteTime);
                this.nextNoteTime += this.stepTime;
                this.currentStep++;
            }
        }, 50);
    }

    stopBgm() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }

    // --- Control Toggles ---

    toggleBgm(enabled) {
        this.bgmEnabled = enabled;
        this.resumeContext();
        if (!this.ctx) return;

        if (this.bgmEnabled) {
            this.masterGainBGM.gain.value = 0.20;
            this.startBgm();
        } else {
            this.masterGainBGM.gain.value = 0;
        }
    }

    toggleSfx(enabled) {
        this.sfxEnabled = enabled;
        this.resumeContext();
        if (!this.ctx) return;

        if (this.sfxEnabled) {
            this.masterGainSFX.gain.value = 0.45;
        } else {
            this.masterGainSFX.gain.value = 0;
        }
    }
}

export const audio = new AudioManager();
