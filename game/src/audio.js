// MIDNIGHT VAULT — synthesized sound, no audio files.
// One clear job: every sound in the game is built with the Web Audio API —
// footsteps, coin clinks, camera beeps, the alert sting, safe-cracking ticks,
// the lockdown siren and the getaway jingle. Nothing is loaded from disk.

export function createAudio() {
  return { ctx: null, muted: false, master: null };
}

function ensure(audio) {
  if (audio.ctx) return audio.ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  audio.ctx = new Ctor();
  audio.master = audio.ctx.createGain();
  audio.master.gain.value = 0.35;
  audio.master.connect(audio.ctx.destination);
  return audio.ctx;
}

function tone(audio, freq, dur, type, vol, slideTo) {
  const ctx = ensure(audio);
  if (!ctx || audio.muted) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
  gain.gain.setValueAtTime(vol || 0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function noise(audio, dur, vol, filterFreq) {
  const ctx = ensure(audio);
  if (!ctx || audio.muted) return;
  const now = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq || 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol || 0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  src.start(now);
}

// Play one named event. The simulation hands these over; the audio layer
// decides what each one sounds like.
export function playEvent(audio, name) {
  if (audio.muted) return;
  switch (name) {
    case 'step':
      tone(audio, 90, 0.07, 'sine', 0.12, 60);
      break;
    case 'stepSoft':
      tone(audio, 70, 0.05, 'sine', 0.05, 50);
      break;
    case 'coin':
      tone(audio, 1900, 0.12, 'triangle', 0.18, 2400);
      setTimeout(() => tone(audio, 2400, 0.1, 'triangle', 0.12, 1900), 90);
      break;
    case 'pickup':
      tone(audio, 660, 0.09, 'sine', 0.18);
      setTimeout(() => tone(audio, 990, 0.12, 'sine', 0.18), 80);
      break;
    case 'loot':
      tone(audio, 523, 0.12, 'triangle', 0.2);
      setTimeout(() => tone(audio, 659, 0.12, 'triangle', 0.2), 90);
      setTimeout(() => tone(audio, 784, 0.2, 'triangle', 0.22), 180);
      break;
    case 'crackTick':
      tone(audio, 1400, 0.03, 'square', 0.08);
      break;
    case 'crackStart':
      tone(audio, 300, 0.15, 'sawtooth', 0.08, 500);
      break;
    case 'crackStop':
      tone(audio, 500, 0.1, 'sawtooth', 0.08, 250);
      break;
    case 'locked':
      tone(audio, 180, 0.15, 'square', 0.15, 120);
      break;
    case 'suspicious':
      tone(audio, 440, 0.18, 'sine', 0.16, 620);
      break;
    case 'alert':
      // alert sting: two harsh rising notes
      tone(audio, 220, 0.22, 'sawtooth', 0.22, 440);
      setTimeout(() => tone(audio, 330, 0.3, 'sawtooth', 0.22, 660), 160);
      noise(audio, 0.25, 0.1, 3000);
      break;
    case 'camBeep':
      tone(audio, 1150, 0.07, 'square', 0.09);
      break;
    case 'camSpot':
      tone(audio, 980, 0.15, 'square', 0.14, 1300);
      break;
    case 'noiseHeard':
      tone(audio, 520, 0.1, 'sine', 0.1, 700);
      break;
    case 'emp':
      noise(audio, 0.5, 0.25, 4000);
      tone(audio, 1200, 0.4, 'sawtooth', 0.12, 100);
      break;
    case 'smoke':
      noise(audio, 0.6, 0.2, 800);
      break;
    case 'lockdown':
      tone(audio, 520, 0.5, 'sawtooth', 0.18, 780);
      setTimeout(() => tone(audio, 520, 0.5, 'sawtooth', 0.18, 780), 550);
      break;
    case 'caught':
      tone(audio, 392, 0.3, 'sawtooth', 0.22, 196);
      setTimeout(() => tone(audio, 196, 0.7, 'sawtooth', 0.22, 98), 280);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(audio, f, 0.25, 'triangle', 0.2), i * 110));
      break;
    default:
      break;
  }
}

export function setMuted(audio, muted) {
  audio.muted = muted;
  if (audio.master) audio.master.gain.value = muted ? 0 : 0.35;
}

export function resumeAudio(audio) {
  const ctx = ensure(audio);
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
