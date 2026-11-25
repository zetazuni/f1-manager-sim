// Tiny synth sounds made in code (no audio files).
// One shared AudioContext: browsers cap how many can exist, so creating one
// per click (the old behaviour) eventually made every sound fail.

let ctx = null;
let enabled = true;

export const setSoundEnabled = (on) => {
  enabled = !!on;
};

function audio() {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone({ freq = 440, type = 'square', gain = 0.08, duration = 0.1, slideTo = null, delay = 0 }) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const playClickSound = () => tone({ freq: 660, duration: 0.06, gain: 0.05 });

/** One of the five start lights coming on. */
export const playLightBeep = () => tone({ freq: 520, type: 'sine', duration: 0.18, gain: 0.12 });

/** Lights out: a rising engine-ish sweep. */
export const playLightsOut = () => {
  tone({ freq: 110, type: 'sawtooth', duration: 0.9, gain: 0.07, slideTo: 420 });
  tone({ freq: 880, type: 'sine', duration: 0.25, gain: 0.1 });
};

/** Short double blip for radio messages and pit calls. */
export const playRadio = () => {
  tone({ freq: 1200, type: 'sine', duration: 0.05, gain: 0.04 });
  tone({ freq: 900, type: 'sine', duration: 0.05, gain: 0.04, delay: 0.07 });
};
