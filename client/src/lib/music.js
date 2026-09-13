/**
 * The castle's ambience, synthesised rather than streamed.
 *
 * There is no audio file here on purpose. The obvious track for this app is
 * the film score, which is not ours to ship, and a stock substitute would be
 * both a licence to verify and a few hundred kilobytes to download. This is a
 * Web Audio graph: a celesta-ish music box picking through a minor pentatonic
 * over a slow string pad, with a generated reverb. It weighs nothing, never
 * loops audibly because the note choice is random within a scale, and can be
 * shaped to taste in code.
 *
 * It is off until asked for. Browsers block audio without a gesture anyway,
 * and unrequested sound on page load is hostile.
 */

// A minor pentatonic — the safe scale. Every pair of notes in it is
// consonant, so a random walk cannot produce a wrong note.
const SCALE = [0, 3, 5, 7, 10];
const ROOT = 220; // A3

const semitone = (n) => ROOT * Math.pow(2, n / 12);

/** A short exponential-decay reverb, built rather than fetched. */
function makeReverb(ctx, seconds = 3.2) {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      // White noise under a decay curve is a serviceable hall.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = buffer;
  return convolver;
}

export function createMusic() {
  let ctx = null;
  let master = null;
  let padGain = null;
  let timer = 0;
  let padVoices = [];
  let running = false;

  /** One struck bell: a sine with a fast attack and a long tail. */
  const strike = (freq, when, velocity = 0.5) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // A touch of triangle in the partial gives it a wooden edge rather than a
    // pure test tone.
    osc.type = 'triangle';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(velocity, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 2.6);

    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + 2.8);
  };

  /** The sustained bed underneath: three detuned saws through a soft filter. */
  const startPad = () => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    filter.Q.value = 0.6;

    padGain = ctx.createGain();
    padGain.gain.value = 0.055;

    // A slow sweep on the cutoff keeps the pad from sitting perfectly still.
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 0.035;
    lfoDepth.gain.value = 180;
    lfo.connect(lfoDepth);
    lfoDepth.connect(filter.frequency);
    lfo.start();

    padVoices = [0, 3, 7].map((n, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = semitone(n) / 2;
      osc.detune.value = (i - 1) * 6;
      osc.connect(filter);
      osc.start();
      return osc;
    });
    padVoices.push(lfo);

    filter.connect(padGain);
    padGain.connect(master);
  };

  /** Schedules the next note at an irregular interval, so it never marches. */
  const schedule = () => {
    if (!running) return;
    const octave = Math.random() < 0.32 ? 12 : Math.random() < 0.5 ? 0 : 24;
    const note = SCALE[Math.floor(Math.random() * SCALE.length)] + octave;
    strike(semitone(note), ctx.currentTime + 0.02, 0.18 + Math.random() * 0.16);

    // Occasionally a second note a third above, for a little harmony.
    if (Math.random() < 0.3) {
      const second = SCALE[Math.floor(Math.random() * SCALE.length)] + octave + 12;
      strike(semitone(second), ctx.currentTime + 0.14, 0.1);
    }

    timer = window.setTimeout(schedule, 1400 + Math.random() * 2600);
  };

  const start = async () => {
    if (running) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;

    if (!ctx) {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0;

      const reverb = makeReverb(ctx);
      const wet = ctx.createGain();
      wet.gain.value = 0.5;
      master.connect(reverb);
      reverb.connect(wet);
      wet.connect(ctx.destination);
      master.connect(ctx.destination);
    }

    // Created before a gesture on some browsers, so resume explicitly.
    if (ctx.state === 'suspended') await ctx.resume();

    running = true;
    if (!padVoices.length) startPad();

    // Fade in over four seconds; arriving at full volume instantly is a jolt.
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 4);

    schedule();
  };

  const stop = () => {
    if (!running || !ctx) return;
    running = false;
    window.clearTimeout(timer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
  };

  /** Quietens without tearing down, for a tab nobody is listening to. */
  const duck = (down) => {
    if (!ctx || !running) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(down ? 0 : 0.5, ctx.currentTime + 0.6);
  };

  return { start, stop, duck, get running() { return running; } };
}
