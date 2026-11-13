import type { ActorId, PieceKind, PresentationEvent } from '../domain/types';

export type Cue = 'dress' | 'pick' | 'drop' | 'refuse' | 'door' | 'eat' | 'meow' | 'purr' | 'pop' | 'cheer' | 'poke' | 'splash' | 'whirr' | 'rustle' | 'page' | 'clink' | 'beep';
export interface Note { wave: OscillatorType; from: number; to: number; start: number; length: number }
const note = (wave: OscillatorType, from: number, to: number, start = 0, length = .14): Note => ({ wave, from, to, start, length });
// Each cue has its own contour and wave so it is recognizable with eyes closed.
export const timbres: Record<Cue, Note[]> = {
  dress: [note('triangle', 660, 990, 0, .1), note('triangle', 880, 1320, .09, .16)],
  pick: [note('sine', 520, 780, 0, .08)],
  drop: [note('sine', 500, 320, 0, .1)],
  refuse: [note('sine', 330, 300, 0, .12), note('sine', 300, 270, .13, .12)],
  door: [note('triangle', 880, 860, 0, .22), note('triangle', 700, 690, .2, .3)],
  eat: [note('square', 240, 200, 0, .05), note('square', 260, 210, .1, .05), note('square', 250, 205, .2, .05)],
  meow: [note('sawtooth', 600, 900, 0, .12), note('sawtooth', 900, 520, .12, .22)],
  purr: [note('sawtooth', 55, 50, 0, .18), note('sawtooth', 52, 48, .2, .18), note('sawtooth', 55, 50, .4, .18)],
  pop: [note('sine', 900, 1300, 0, .05)],
  poke: [note('triangle', 400, 800, 0, .09), note('triangle', 600, 1100, .1, .09)],
  cheer: [note('triangle', 523, 523, 0, .1), note('triangle', 659, 659, .1, .1), note('triangle', 784, 784, .2, .16)],
  splash: [note('sine', 1200, 700, 0, .06), note('sine', 1400, 800, .07, .06), note('sine', 1100, 650, .14, .07)],
  whirr: [note('sawtooth', 140, 220, 0, .25), note('sawtooth', 220, 180, .25, .2)],
  rustle: [note('triangle', 1800, 1500, 0, .04), note('triangle', 1700, 1400, .06, .04)],
  page: [note('triangle', 700, 1000, 0, .07), note('triangle', 600, 400, .09, .05)],
  clink: [note('sine', 1568, 1568, 0, .08), note('sine', 2093, 2093, .1, .1)],
  beep: [note('square', 1245, 1245, 0, .07), note('square', 1245, 1245, .2, .07)],
};
const pieceCues: Partial<Record<PieceKind, Cue>> = { toilet: 'splash', sink: 'splash', washer: 'whirr', planter: 'rustle', bookcase: 'page', 'picnic-table': 'clink' };
/** The sound of a piece switched on (its own for the everyday pieces); a piece switched off or without its own sound pops. */
export function pieceCue(kind: PieceKind | undefined): Cue { return (kind && pieceCues[kind]) ?? 'pop'; }
const volume = .05;
const eventCues: Partial<Record<PresentationEvent['type'], Cue>> = { dressed: 'dress', picked: 'pick', dropped: 'drop', fed: 'eat', room: 'door', summoned: 'cheer', show: 'cheer', furniture: 'pop', cooked: 'clink', ate: 'eat', sniffed: 'meow' };
export function eventCue(type: PresentationEvent['type'], cat: boolean): Cue | null {
  if (type === 'rested') return cat ? 'purr' : null;
  const cue = eventCues[type] ?? null;
  return cat && (cue === 'eat' || cue === 'dress') ? 'meow' : cue;
}

interface SoundOptions { button: HTMLButtonElement; enabled: boolean; remember: (on: boolean) => void; unlock: EventTarget; audio?: () => AudioContext }
export function createSound(options: SoundOptions) {
  const { button } = options;
  let context: AudioContext | undefined;
  let enabled = options.enabled;
  const make = options.audio ?? (() => new AudioContext());
  function wake() { if (!enabled) return; context ??= make(); void context.resume().catch(() => {}); }
  function render() {
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Som ligado' : 'Som desligado');
    button.textContent = 'Som';
  }
  /** `pitch` is the character's voice: the same contour, every frequency multiplied. */
  function cue(name: Cue, pitch = 1) {
    if (!enabled || !context) return;
    const now = context.currentTime;
    timbres[name].forEach(n => play(context!, { ...n, from: n.from * pitch, to: n.to * pitch }, now));
  }
  options.unlock.addEventListener('pointerdown', wake, { capture: true });
  options.unlock.addEventListener('click', event => {
    const target = event.target as Element | null;
    if (target?.closest?.('button:not(#sound-toggle)')) cue('pop');
  });
  button.addEventListener('click', () => { enabled = !enabled; options.remember(enabled); render(); wake(); cue('pop'); });
  render();
  return {
    cue,
    /** `switchedOn` gives the kind of a used piece that is now on (undefined when it went off). */
    events(events: PresentationEvent[], isCat: (id: ActorId) => boolean, switchedOn: (id: number) => PieceKind | undefined = () => undefined) {
      const event = events[0]; if (!event) return;
      const name = event.piece === undefined ? eventCue(event.type, !!event.actor && isCat(event.actor)) : pieceCue(switchedOn(event.piece));
      if (name) cue(name);
    },
  };
}
function play(context: AudioContext, n: Note, now: number) {
  const oscillator = context.createOscillator(), gain = context.createGain(), start = now + n.start, end = start + n.length;
  oscillator.type = n.wave;
  oscillator.frequency.setValueAtTime(n.from, start);
  oscillator.frequency.exponentialRampToValueAtTime(n.to, end);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.linearRampToValueAtTime(n.wave === 'sine' || n.wave === 'triangle' ? volume : volume * .5, start + .015);
  gain.gain.exponentialRampToValueAtTime(.0001, end);
  oscillator.connect(gain); gain.connect(context.destination);
  oscillator.start(start); oscillator.stop(end + .02);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
