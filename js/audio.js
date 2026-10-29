/**
 * COSMIC DODGE - PROCEDURAL WEB AUDIO SYNTHESIZER
 * 100% self-contained audio engine using Web Audio API.
 * Zero external audio files required. Compliant with browser autoplay policies.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;

    this.soundEnabled = true;
    this.musicEnabled = true;

    // Music scheduler state
    this.bgmInterval = null;
    this.bgmStep = 0;
    this.isPlayingBgm = false;
  }

  /**
   * Initializes or resumes the AudioContext after a user gesture.
   */
  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.soundEnabled ? 0.8 : 0.0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // BGM gain
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.musicEnabled ? 0.35 : 0.0, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = !!enabled;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.soundEnabled ? 0.8 : 0.0, this.ctx.currentTime, 0.05);
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = !!enabled;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(this.musicEnabled ? 0.35 : 0.0, this.ctx.currentTime, 0.05);
    }
    if (this.musicEnabled && !this.isPlayingBgm) {
      this.startBgm();
    } else if (!this.musicEnabled && this.isPlayingBgm) {
      this.stopBgm();
    }
  }

  // --- PROCEDURAL SFX ---

  /**
   * Star collection chime. Scales frequency up based on active combo multiplier!
   */
  playStarPickup(combo = 1) {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const baseFreq = 587.33 * Math.min(1.8, 1 + (combo - 1) * 0.15); // D5 base note

    // Two rapid high chime notes (pentatonic leap)
    [0, 0.06].forEach((delay, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      
      const freq = i === 0 ? baseFreq : baseFreq * 1.5; // D -> A
      osc.frequency.setValueAtTime(freq, t + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, t + delay + 0.12);

      gain.gain.setValueAtTime(0.001, t + delay);
      gain.gain.linearRampToValueAtTime(0.28, t + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + delay);
      osc.stop(t + delay + 0.2);
    });
  }

  /**
   * Near miss swish: satisfying high airy whistle / whoosh.
   */
  playNearMiss() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.08);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Player damaged: punchy crunchy noise burst + downward bass sweep.
   */
  playHit() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Downward saw sweep
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);

    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.26);

    // 2. White noise burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.2);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.2);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(t);
  }

  /**
   * Shield activated: ascending celestial harmonic sweep.
   */
  playShieldOn() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(960, t + 0.3);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  /**
   * Shield absorbed a hit: crisp energy dispersion pop.
   */
  playShieldBreak() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.18);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * General power-up collected (Boost, SlowMo, Heart)
   */
  playPowerup(type) {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = type === 'heart' ? [440, 554, 659, 880] : [392, 523, 659, 784]; // Happy major arpeggio
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.01, t + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.25, t + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.22);
    });
  }

  /**
   * Enemy firing energy plasma orb: arcade zap
   */
  playLaserShot() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.15);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Warning siren / alarm cue before high hazard surge or laser beam
   */
  playWarning() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.setValueAtTime(880, t + 0.08);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Level completed fanfare!
   */
  playLevelComplete() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const melody = [
      { note: 523.25, time: 0, dur: 0.12 },     // C5
      { note: 659.25, time: 0.12, dur: 0.12 },  // E5
      { note: 783.99, time: 0.24, dur: 0.12 },  // G5
      { note: 1046.50, time: 0.38, dur: 0.35 }, // C6
    ];

    melody.forEach(item => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.note, t + item.time);

      gain.gain.setValueAtTime(0.01, t + item.time);
      gain.gain.linearRampToValueAtTime(0.3, t + item.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + item.time + item.dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + item.time);
      osc.stop(t + item.time + item.dur + 0.05);
    });
  }

  /**
   * Game Over descending melancholy chime
   */
  playGameOver() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 415, 392, 349]; // A -> G# -> G -> F
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.18);

      gain.gain.setValueAtTime(0.01, t + idx * 0.18);
      gain.gain.linearRampToValueAtTime(0.22, t + idx * 0.18 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.18 + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + idx * 0.18);
      osc.stop(t + idx * 0.18 + 0.35);
    });
  }

  /**
   * Countdown tick (3, 2, 1) and GO!
   */
  playCountdown(isGo = false) {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isGo ? 'triangle' : 'sine';
    const freq = isGo ? 987.77 : 493.88; // B5 for GO, B4 for ticks
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(isGo ? 0.35 : 0.2, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.3 : 0.12));

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + (isGo ? 0.35 : 0.15));
  }

  /**
   * UI Click sound
   */
  playButtonClick() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // --- PROCEDURAL BACKGROUND SYNTH-WAVE MUSIC ---
  
  startBgm() {
    if (!this.musicEnabled || this.isPlayingBgm) return;
    this.initContext();
    if (!this.ctx) return;

    this.isPlayingBgm = true;
    this.bgmStep = 0;

    // Upbeat space-synth chord progression in A minor / C major:
    // Pattern: 16th note arpeggios + warm pulsing bassline
    const bassNotes = [110, 110, 130.81, 130.81, 146.83, 146.83, 123.47, 123.47]; // A2, C3, D3, B2
    const arpNotes = [
      [220, 261.63, 329.63, 440], // Am: A3, C4, E4, A4
      [261.63, 329.63, 392.00, 523.25], // C: C4, E4, G4, C5
      [293.66, 349.23, 440, 587.33], // Dm: D4, F4, A4, D5
      [246.94, 293.66, 392.00, 493.88] // G: B3, D4, G4, B4
    ];

    const stepDuration = 0.18; // ~133 BPM 8th notes

    this.bgmInterval = setInterval(() => {
      if (!this.isPlayingBgm || !this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;
      const bar = Math.floor(this.bgmStep / 8) % 4;
      const stepInBar = this.bgmStep % 8;

      // 1. Bassline note on beats 0 and 4
      if (stepInBar === 0 || stepInBar === 4) {
        const bassFreq = bassNotes[(bar * 2 + (stepInBar === 4 ? 1 : 0)) % bassNotes.length];
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        const bassFilter = this.ctx.createBiquadFilter();

        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassFreq, t);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(350, t);

        bassGain.gain.setValueAtTime(0.2, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 2);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.bgmGain);

        bassOsc.start(t);
        bassOsc.stop(t + stepDuration * 2.1);
      }

      // 2. Gentle Arpeggio Synth Note
      const currentChord = arpNotes[bar];
      const arpNote = currentChord[this.bgmStep % currentChord.length];
      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();

      leadOsc.type = 'sine';
      leadOsc.frequency.setValueAtTime(arpNote, t);

      leadGain.gain.setValueAtTime(0.001, t);
      leadGain.gain.linearRampToValueAtTime(0.08, t + 0.02);
      leadGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.9);

      leadOsc.connect(leadGain);
      leadGain.connect(this.bgmGain);

      leadOsc.start(t);
      leadOsc.stop(t + stepDuration);

      this.bgmStep++;
    }, stepDuration * 1000);
  }

  stopBgm() {
    this.isPlayingBgm = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const sound = new SoundEngine();

