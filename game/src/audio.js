// OJEK! King of the Streets — procedural audio: engine, horn, siren, cash, punches,
// rain, and three radio stations. Everything is synthesized with WebAudio;
// there are no audio files. Audio starts only after the first gesture.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

const STATIONS = [
  { name: 'Dangdut 88', desc: 'Dangdut beats from the depot radio.', tempo: 128, bass: [45, 45, 48, 43], lead: [69, 72, 76, 74, 72, 69, 67, 64], wave: 'triangle' },
  { name: 'City Pop', desc: 'Easy pop for the midday cruise.', tempo: 100, bass: [48, 52, 55, 50], lead: [72, 76, 79, 76, 74, 72, 71, 69], wave: 'sine' },
  { name: 'Street Rock', desc: 'Loud guitars for the night shift.', tempo: 140, bass: [40, 40, 43, 45], lead: [64, 67, 69, 67, 64, 62, 60, 62], wave: 'sawtooth' },
];

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOscA = null;
  let engineOscB = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let rainNode = null;
  let rainGain = null;
  let radioTimer = null;
  let radioStep = 0;
  let muted = false;
  let stationIndex = 0;
  let radioOn = true;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') void ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    return ctx;
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ensure()) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, cutoff) {
    if (!ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter).connect(g).connect(master);
    src.start();
  }

  function startEngine() {
    if (!ensure() || engineOscA) return;
    engineOscA = ctx.createOscillator();
    engineOscB = ctx.createOscillator();
    engineOscA.type = 'sawtooth';
    engineOscB.type = 'square';
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;
    engineOscA.connect(engineFilter);
    engineOscB.connect(engineFilter);
    engineFilter.connect(engineGain).connect(master);
    engineOscA.start();
    engineOscB.start();
  }

  function setEngine(speedKmh, maxKmh, throttle) {
    if (!engineOscA) return;
    const ratio = Math.max(0, Math.min(1, speedKmh / Math.max(1, maxKmh)));
    const base = 42 + ratio * 130 + (throttle ? 10 : 0);
    engineOscA.frequency.value = base;
    engineOscB.frequency.value = base * 1.5 + 3;
    engineFilter.frequency.value = 320 + ratio * 900;
    engineGain.gain.value = 0.05 + ratio * 0.09 + (throttle ? 0.02 : 0);
  }

  function stopEngine() {
    if (!engineOscA) return;
    try { engineOscA.stop(); engineOscB.stop(); } catch { /* already stopped */ }
    engineOscA = null;
    engineOscB = null;
    engineGain = null;
  }

  function setSiren(on) {
    if (on && !sirenOsc) {
      if (!ensure()) return;
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0.05;
      sirenOsc.connect(sirenGain).connect(master);
      sirenOsc.start();
      let high = true;
      sirenOsc._flip = window.setInterval(() => {
        if (!sirenOsc) return;
        high = !high;
        sirenOsc.frequency.setTargetAtTime(high ? 880 : 620, ctx.currentTime, 0.05);
      }, 380);
    } else if (!on && sirenOsc) {
      window.clearInterval(sirenOsc._flip);
      try { sirenOsc.stop(); } catch { /* already stopped */ }
      sirenOsc = null;
      sirenGain = null;
    }
  }

  function setRain(level) {
    if (level <= 0) {
      if (rainNode) { try { rainNode.stop(); } catch { /* stopped */ } rainNode = null; }
      return;
    }
    if (!ensure()) return;
    if (!rainNode) {
      const len = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i += 1) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
      rainNode = ctx.createBufferSource();
      rainNode.buffer = buffer;
      rainNode.loop = true;
      rainGain = ctx.createGain();
      rainGain.gain.value = 0;
      rainNode.connect(rainGain).connect(master);
      rainNode.start();
    }
    rainGain.gain.setTargetAtTime(level * 0.12, ctx.currentTime, 0.4);
  }

  function playRadioStep() {
    if (!radioOn || !ensure()) return;
    const station = STATIONS[stationIndex];
    const step = radioStep % 16;
    const bassNote = station.bass[Math.floor(step / 4) % station.bass.length];
    const leadNote = station.lead[step % station.lead.length];
    if (step % 4 === 0) blip(NOTE(bassNote), 0.32, 'triangle', 0.16);
    if (step % 2 === 0) blip(NOTE(leadNote), 0.18, station.wave, 0.06);
    if (step % 4 === 2) noiseBurst(0.05, 0.05, 6000);
    radioStep += 1;
  }

  function startRadio() {
    if (radioTimer || !ensure()) return;
    const stepMs = 60000 / STATIONS[stationIndex].tempo / 4;
    radioTimer = window.setInterval(playRadioStep, stepMs);
  }

  return {
    unlock() { ensure(); startEngine(); startRadio(); },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.55; },
    isMuted() { return muted; },
    startEngine,
    setEngine,
    stopEngine,
    setSiren,
    setRain,
    nextStation() {
      stationIndex = (stationIndex + 1) % STATIONS.length;
      if (radioTimer) {
        window.clearInterval(radioTimer);
        radioTimer = null;
        startRadio();
      }
      return STATIONS[stationIndex].name;
    },
    station() { return STATIONS[stationIndex].name; },
    stationIndex() { return stationIndex; },
    stations() { return STATIONS.map((s) => ({ name: s.name, desc: s.desc })); },
    setStation(i) {
      if (i < 0 || i >= STATIONS.length || i === stationIndex) return STATIONS[stationIndex].name;
      stationIndex = i;
      if (radioTimer) {
        window.clearInterval(radioTimer);
        radioTimer = null;
        startRadio();
      }
      return STATIONS[stationIndex].name;
    },
    setRadioOn(on) { radioOn = on; },
    isRadioOn() { return radioOn; },
    click() { blip(660, 0.07, 'sine', 0.12); },
    horn() { blip(392, 0.25, 'square', 0.1); blip(330, 0.25, 'square', 0.1); },
    cash() { blip(880, 0.1, 'sine', 0.14); blip(1174, 0.1, 'sine', 0.14, 0.09); blip(1568, 0.16, 'sine', 0.12, 0.18); },
    punch() { noiseBurst(0.09, 0.3, 900); blip(90, 0.12, 'sine', 0.3); },
    hurt() { blip(160, 0.18, 'sawtooth', 0.18); },
    crash() { noiseBurst(0.3, 0.4, 500); blip(70, 0.25, 'sine', 0.35); },
    pickup() { blip(523, 0.09, 'sine', 0.14); blip(784, 0.14, 'sine', 0.14, 0.08); },
    fail() { blip(220, 0.25, 'sawtooth', 0.12); blip(165, 0.35, 'sawtooth', 0.12, 0.2); },
    levelUp() { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.14, 'triangle', 0.14, i * 0.1)); },
    sirenBurst() { blip(880, 0.12, 'triangle', 0.08); blip(620, 0.12, 'triangle', 0.08, 0.12); },
  };
}
