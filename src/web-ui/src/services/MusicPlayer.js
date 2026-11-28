// Background lofi, made in code (Web Audio): no audio files. Three original
// loops with swung dusty drums, soft electric piano, a round bass, vinyl
// crackle and, on one of them, an arpeggio that rushes by like a car.
// Browsers only allow sound after a click or key press, so it waits for that.

const VOLUME = { off: 0, low: 0.45, normal: 1 };

// chords as MIDI notes, one per bar; bass = root of each
export const TRACKS = [
  { name: 'Pit lane at dusk', bpm: 78, swing: 0.16, arp: false,
    chords: [[50, 53, 57, 60, 64], [43, 53, 57, 59, 64], [48, 52, 55, 59, 62], [45, 52, 55, 60, 64]] },
  { name: 'Long straight', bpm: 88, swing: 0.12, arp: true,
    chords: [[45, 52, 55, 59, 60], [41, 52, 55, 57, 60], [48, 52, 55, 59, 64], [43, 50, 53, 59, 62]] },
  { name: 'Rain on the radar', bpm: 70, swing: 0.18, arp: false,
    chords: [[52, 55, 59, 62, 66], [48, 55, 59, 64, 67], [45, 55, 60, 64, 67], [47, 54, 57, 62, 66]] },
];
export const BARS_PER_TRACK = 32;
const STEPS = 16; // sixteenth notes in a bar

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function noiseBuffer(ctx, seconds, shape) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = shape(i / data.length);
  return buf;
}

/** The band: everything plays into `out`. Works on live and offline contexts. */
export function makeBand(ctx, out) {
  // warm "tape": roll off the top end of the whole mix
  const tape = ctx.createBiquadFilter();
  tape.type = 'lowpass';
  tape.frequency.value = 3800;
  tape.connect(out);
  const noise = noiseBuffer(ctx, 1, () => Math.random() * 2 - 1);

  const env = (t, peak, attack, length, to = tape) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    g.connect(to);
    return g;
  };
  const note = (type, freq, t, length, peak, attack = 0.02, detune = 0) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(env(t, peak, attack, length));
    o.start(t);
    o.stop(t + length + 0.05);
  };
  const hit = (t, length, peak, type, freq) => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    s.connect(f);
    f.connect(env(t, peak, 0.002, length));
    s.start(t, Math.random() * 0.5);
    s.stop(t + length + 0.02);
  };
  const kick = (t) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    o.connect(env(t, 0.5, 0.004, 0.28));
    o.start(t);
    o.stop(t + 0.3);
  };

  // vinyl: a quiet looping bed of sparse clicks
  const vinyl = ctx.createBufferSource();
  vinyl.buffer = noiseBuffer(ctx, 3, () => (Math.random() < 0.0004 ? Math.random() * 2 - 1 : (Math.random() - 0.5) * 0.015));
  vinyl.loop = true;
  const vinylGain = ctx.createGain();
  vinylGain.gain.value = 0.12;
  vinyl.connect(vinylGain);
  vinylGain.connect(tape);
  vinyl.start();

  return {
    /** Schedule sixteenth `step` of bar `bar` of track `track` at time t. */
    play(track, bar, step, t) {
      const beat = 60 / track.bpm;
      const chord = track.chords[bar % track.chords.length];
      if (step === 0 || step === 10) {
        // electric piano: each note a soft sine pair, strummed slightly
        chord.slice(1).forEach((m, i) => {
          const at = t + i * 0.018;
          const length = step === 0 ? beat * 3.4 : beat * 1.3;
          note('sine', hz(m), at, length, step === 0 ? 0.075 : 0.045, 0.015, -5);
          note('triangle', hz(m), at, length * 0.7, 0.022, 0.015, 6);
        });
      }
      if (step === 0) note('sine', hz(chord[0] - 12), t, beat * 1.8, 0.24, 0.03);
      if (step === 11) note('sine', hz(chord[0] - 12), t, beat * 0.9, 0.16, 0.03);
      if (step === 0 || step === 7 || (step === 10 && bar % 2)) kick(t);
      if (step === 4 || step === 12) hit(t, 0.18, 0.16, 'bandpass', 1700);
      if (step % 2 === 0) hit(t, 0.05, step % 4 === 2 ? 0.06 : 0.035, 'highpass', 7000);
      if (track.arp && bar % 8 >= 4 && step % 2 === 1) {
        note('square', hz(chord[1 + ((step >> 1) % 4)] + 12), t, beat * 0.4, 0.012);
      }
      // every eight bars, something passes by on the straight
      if (bar % 8 === 7 && step === 8) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(210, t);
        o.frequency.exponentialRampToValueAtTime(95, t + beat * 2);
        o.connect(env(t, 0.014, beat * 0.9, beat * 2));
        o.start(t);
        o.stop(t + beat * 2 + 0.05);
      }
    },
  };
}

/** Time of a step inside its bar, with the off-beat sixteenths swung late. */
export const stepTime = (track, step) => {
  const sixteenth = 60 / track.bpm / 4;
  return step * sixteenth + (step % 2 ? sixteenth * track.swing : 0);
};

let ctx = null;
let master = null;
let band = null;
let timer = null;
let level = 'normal';
let unlocked = false;
let index = Math.floor(Math.random() * TRACKS.length);
let bar = 0;
let barStart = 0;
let step = 0;
let played = 0;

function schedule() {
  // look a little ahead so timer jitter never causes gaps
  while (barStart + stepTime(TRACKS[index], step) < ctx.currentTime + 0.6) {
    const track = TRACKS[index];
    const at = barStart + stepTime(track, step);
    if (at >= ctx.currentTime) {
      band.play(track, bar, step, at);
      played += 1;
    }
    step += 1;
    if (step === STEPS) {
      step = 0;
      barStart += (60 / track.bpm) * 4;
      bar += 1;
      if (bar === BARS_PER_TRACK) {
        bar = 0;
        index = (index + 1) % TRACKS.length;
      }
    }
  }
}

function apply() {
  if (!unlocked) return;
  try {
    if (!VOLUME[level]) {
      clearInterval(timer);
      timer = null;
      ctx?.suspend();
      return;
    }
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.connect(ctx.destination);
      band = makeBand(ctx, master);
    }
    master.gain.value = VOLUME[level];
    ctx.resume();
    if (!timer) {
      barStart = Math.max(barStart, ctx.currentTime + 0.1);
      timer = setInterval(schedule, 150);
    }
  } catch { /* no audio device: the game plays on in silence */ }
}

export const setMusicLevel = (next) => {
  level = next in VOLUME ? next : 'normal';
  apply();
};

if (typeof window !== 'undefined') {
  const unlock = () => {
    unlocked = true;
    apply();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  // read-only test hook
  window.__zetraceMusic = () => ({ level, state: ctx?.state ?? 'none', track: TRACKS[index].name, played });
}
