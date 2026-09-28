/**
 * 8-Bit NES 2A03 Sound Synthesizer via Web Audio API
 * Accurately replicates the 1984 NES Pinball sound effects, melodies, and jingles.
 */

class NESAudioEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.35;
        this.muted = false;
        this.isAudioStarted = false;
        this.musicInterval = null;
    }

    init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            this.ctx = new AudioCtx();
            this.isAudioStarted = true;
        }
    }

    ensureContext() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // NES Pulse channel
    playPulse(freq, duration, type = 'square', decay = true, sweepTo = null, gainVal = 0.3) {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (sweepTo) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), now + duration);
        }

        gain.gain.setValueAtTime(gainVal * this.masterVolume, now);
        if (decay) {
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        } else {
            gain.gain.setValueAtTime(gainVal * this.masterVolume, now + duration * 0.8);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        }

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    // NES Triangle channel
    playTriangle(freq, duration, decay = true, sweepTo = null, gainVal = 0.4) {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        if (sweepTo) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), now + duration);
        }

        gain.gain.setValueAtTime(gainVal * this.masterVolume, now);
        if (decay) {
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        }

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    // NES Noise channel
    playNoise(duration, filterFreq = 1200, gainVal = 0.25) {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        let lastVal = 0;
        for (let i = 0; i < bufferSize; i++) {
            if (i % 4 === 0) lastVal = Math.random() * 2 - 1;
            data[i] = lastVal;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(gainVal * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + duration);
    }

    // --- GAME SFX ---

    playFlipper() {
        this.playPulse(480, 0.035, 'square', true, 220, 0.28);
        this.playNoise(0.025, 1000, 0.15);
    }

    playBumper(combo = 0) {
        const freqs = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
        const f = freqs[combo % freqs.length];
        this.playPulse(f, 0.08, 'square', true, f * 1.3, 0.35);
        this.playNoise(0.03, 3000, 0.15);
    }

    playSlingshot() {
        this.playPulse(520, 0.05, 'square', true, 900, 0.3);
        this.playNoise(0.04, 1500, 0.2);
    }

    playTargetHit() {
        this.playPulse(330, 0.07, 'square', true, 165, 0.3);
        this.playNoise(0.04, 800, 0.2);
    }

    playEggHatch() {
        // High playful chirp
        this.playPulse(880, 0.06, 'square', true, 1400, 0.3);
        setTimeout(() => this.playPulse(1400, 0.08, 'square', true, 1800, 0.3), 70);
    }

    playCardFlip() {
        this.playPulse(740, 0.06, 'square', true, 1100, 0.25);
    }

    playCardMatch() {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((f, i) => {
            setTimeout(() => this.playPulse(f, 0.1, 'square', true, null, 0.3), i * 60);
        });
    }

    playPlungerRatchet(pct) {
        const freq = 140 + pct * 220;
        this.playTriangle(freq, 0.03, true, null, 0.2);
    }

    playPlungerRelease() {
        this.playTriangle(140, 0.25, true, 600, 0.5);
        this.playNoise(0.2, 800, 0.35);
    }

    playHoleEnter() {
        const tones = [900, 700, 500, 350, 220, 140];
        tones.forEach((t, i) => {
            setTimeout(() => this.playPulse(t, 0.05, 'square', true, null, 0.25), i * 40);
        });
    }

    playHoleShoot() {
        this.playNoise(0.18, 1600, 0.45);
        this.playTriangle(180, 0.2, true, 1000, 0.5);
    }

    playSealBounce() {
        this.playPulse(650, 0.07, 'square', true, 1300, 0.32);
    }

    playTilt() {
        this.playNoise(0.4, 350, 0.5);
        this.playPulse(110, 0.4, 'sawtooth', true, 60, 0.4);
    }

    playDrain() {
        const notes = [440, 392, 349.23, 293.66, 220];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playPulse(freq, 0.14, 'square', true, freq * 0.85, 0.35);
            }, idx * 110);
        });
    }

    // --- SCENE C (MARIO TRIBUTE) SFX ---

    playPaddleHit(speedRatio = 1) {
        const f = 440 * speedRatio;
        this.playPulse(f, 0.08, 'square', true, f * 1.6, 0.35);
    }

    playTileBreak() {
        this.playNoise(0.08, 2200, 0.3);
        this.playPulse(950, 0.07, 'square', true, 350, 0.25);
    }

    playRescueFanfare() {
        const melody = [
            { f: 523.25, d: 0.12 },
            { f: 659.25, d: 0.12 },
            { f: 783.99, d: 0.12 },
            { f: 1046.5, d: 0.25 },
            { f: 880.0,  d: 0.12 },
            { f: 1046.5, d: 0.45 }
        ];
        let delay = 0;
        melody.forEach(note => {
            setTimeout(() => {
                this.playPulse(note.f, note.d, 'square', false, null, 0.35);
                this.playTriangle(note.f / 2, note.d, false, null, 0.35);
            }, delay);
            delay += note.d * 1000 + 30;
        });
    }

    playGameStart() {
        const notes = [
            { f: 261.63, d: 0.08 },
            { f: 329.63, d: 0.08 },
            { f: 392.00, d: 0.08 },
            { f: 523.25, d: 0.16 },
            { f: 392.00, d: 0.08 },
            { f: 523.25, d: 0.30 }
        ];
        let delay = 0;
        notes.forEach(n => {
            setTimeout(() => {
                this.playPulse(n.f, n.d, 'square', false, null, 0.3);
            }, delay);
            delay += n.d * 1000 + 20;
        });
    }

    startMinigameMusic() {
        this.stopMusic();
        if (this.muted) return;
        this.ensureContext();

        const bassNotes = [130.81, 130.81, 164.81, 196.00, 174.61, 164.81, 146.83, 130.81];
        const leadNotes = [523.25, 0, 659.25, 523.25, 783.99, 0, 659.25, 0];
        let step = 0;

        this.musicInterval = setInterval(() => {
            if (this.muted) return;
            const b = bassNotes[step % bassNotes.length];
            const l = leadNotes[step % leadNotes.length];
            if (b > 0) this.playTriangle(b, 0.12, true, null, 0.28);
            if (l > 0) this.playPulse(l, 0.1, 'square', true, null, 0.18);
            if (step % 2 === 1) this.playNoise(0.04, 3000, 0.08);
            step++;
        }, 140);
    }

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }
}

const audio = new NESAudioEngine();
