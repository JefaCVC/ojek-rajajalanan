// Sound, all synthesized with Web Audio: no audio files, no network. The engine
// is a sawtooth whose pitch follows the bike's speed; rain is filtered noise;
// the siren alternates two tones while police are near. Music stays quiet next
// to effects, and the whole bus can be muted. Audio starts on the first user
// gesture, as browsers require.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let rainSource = null;
  let rainGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 400;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'square';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      started = true;
      return true;
    } catch (error) {
      return false;
    }
  }

  function blip(frequency, duration, type, volume) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function noiseBurst(duration, volume) {
    if (!ctx || muted) return;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume || 0.2;
    source.connect(gain);
    gain.connect(master);
    source.start();
  }

  return {
    /** Must be called from a user gesture (the start button). */
    start() { return ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master && ctx) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    setMuted(value) {
      muted = value;
      if (master && ctx) master.gain.value = muted ? 0 : 0.5;
    },
    /** The engine pitch and volume follow the bike's speed and throttle. */
    updateEngine(speed, topSpeed, onBike, running) {
      if (!ctx || !engineOsc) return;
      if (!onBike || !running) {
        engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        return;
      }
      const ratio = Math.min(1, Math.abs(speed) / topSpeed);
      engineOsc.frequency.setTargetAtTime(55 + ratio * 160, ctx.currentTime, 0.05);
      engineGain.gain.setTargetAtTime(0.04 + ratio * 0.08, ctx.currentTime, 0.1);
    },
    updateSiren(near, time) {
      if (!ctx || !sirenOsc) return;
      if (!near) {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
        return;
      }
      sirenOsc.frequency.setTargetAtTime(Math.sin(time * 6) > 0 ? 950 : 700, ctx.currentTime, 0.05);
      sirenGain.gain.setTargetAtTime(0.03, ctx.currentTime, 0.2);
    },
    updateRain(raining) {
      if (!ctx) return;
      if (raining && !rainSource) {
        const length = ctx.sampleRate * 3;
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
        rainSource = ctx.createBufferSource();
        rainSource.buffer = buffer;
        rainSource.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        rainGain = ctx.createGain();
        rainGain.gain.value = 0.05;
        rainSource.connect(filter);
        filter.connect(rainGain);
        rainGain.connect(master);
        rainSource.start();
      } else if (!raining && rainSource) {
        try { rainSource.stop(); } catch (error) { /* already stopped */ }
        rainSource = null;
        rainGain = null;
      }
    },
    click() { blip(660, 0.08, 'sine', 0.1); },
    pickup() { blip(520, 0.12, 'sine', 0.15); setTimeout(() => blip(780, 0.15, 'sine', 0.15), 90); },
    cash() { blip(880, 0.1, 'triangle', 0.18); setTimeout(() => blip(1170, 0.18, 'triangle', 0.18), 100); },
    thud() { noiseBurst(0.18, 0.3); blip(90, 0.15, 'sine', 0.25); },
    punch() { noiseBurst(0.08, 0.2); },
    horn() { blip(440, 0.18, 'square', 0.08); },
    levelUp() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.2, 'triangle', 0.15), i * 110)); },
    busted() { blip(220, 0.3, 'sawtooth', 0.12); setTimeout(() => blip(180, 0.4, 'sawtooth', 0.12), 200); },
  };
}
