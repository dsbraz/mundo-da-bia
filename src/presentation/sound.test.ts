import { afterEach, expect, it, vi } from 'vitest';
import { createSound, eventCue, timbres } from './sound';
afterEach(() => vi.unstubAllGlobals());

class FakeAudio {
  static made = 0;
  currentTime = 0; destination = {}; state = 'suspended';
  oscillators: { type: string; freq: number[] }[] = [];
  peaks: number[] = [];
  constructor() { FakeAudio.made++; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createOscillator() {
    const o = { type: 'sine', freq: [] as number[], onended: null as unknown,
      frequency: { setValueAtTime: (v: number) => { o.freq.push(v); }, exponentialRampToValueAtTime: (v: number) => { o.freq.push(v); } },
      connect() {}, disconnect() {}, start() {}, stop() {} };
    this.oscillators.push(o); return o;
  }
  createGain() {
    return { gain: { setValueAtTime: (v: number) => { this.peaks.push(v); }, linearRampToValueAtTime: (v: number) => { this.peaks.push(v); }, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
  }
}
function setup(enabled = true) {
  const listeners: Record<string, ((e: Event) => void)[]> = {};
  const target = { addEventListener: (type: string, fn: (e: Event) => void) => { (listeners[type] ??= []).push(fn); } };
  const attrs: Record<string, string> = {};
  const button = { listeners, setAttribute: (k: string, v: string) => { attrs[k] = v; }, textContent: '',
    addEventListener: (type: string, fn: (e: Event) => void) => { (listeners[`button:${type}`] ??= []).push(fn); } };
  const remember = vi.fn(); let audio: FakeAudio | undefined;
  const sound = createSound({ button: button as unknown as HTMLButtonElement, enabled, remember, unlock: target as unknown as EventTarget,
    audio: () => (audio = new FakeAudio()) as unknown as AudioContext });
  const fire = (type: string, event: Partial<Event> = {}) => listeners[type]?.forEach(fn => fn(event as Event));
  return { sound, fire, attrs, remember, audio: () => audio };
}

it('cada evento tem seu timbre e vestir, pegar e comer soam diferentes', () => {
  expect(eventCue('dressed', false)).toBe('dress');
  expect(eventCue('picked', false)).toBe('pick');
  expect(eventCue('fed', false)).toBe('eat');
  expect(eventCue('fed', true)).toBe('meow');
  expect(eventCue('room', false)).toBe('door');
  expect(eventCue('moved', false)).toBeNull();
  const shape = (cue: keyof typeof timbres) => JSON.stringify(timbres[cue].map(n => [n.wave, n.from, n.to]));
  const shapes = new Set(['dress', 'pick', 'eat', 'refuse', 'door', 'meow', 'purr', 'pop', 'poke'].map(c => shape(c as keyof typeof timbres)));
  expect(shapes.size).toBe(9);
});

it('o som começa ligado e o AudioContext nasce no primeiro pointerdown', () => {
  const { sound, fire, attrs, audio } = setup();
  expect(attrs['aria-pressed']).toBe('true');
  sound.cue('pop'); expect(audio()).toBeUndefined();
  fire('pointerdown');
  expect(audio()?.state).toBe('running');
  sound.cue('eat');
  expect(audio()!.oscillators.length).toBe(timbres.eat.length);
  expect(Math.max(...audio()!.peaks)).toBeLessThanOrEqual(.06);
  fire('pointerdown'); expect(FakeAudio.made).toBe(1);
});

it('o toque num botão faz um pop curto', () => {
  const { fire, audio } = setup();
  fire('pointerdown');
  fire('click', { target: { closest: () => ({}) } as unknown as EventTarget });
  expect(audio()!.oscillators.length).toBe(timbres.pop.length);
  fire('click', { target: { closest: () => null } as unknown as EventTarget });
  expect(audio()!.oscillators.length).toBe(timbres.pop.length);
});

it('desligar silencia, lembra a escolha e religar volta a tocar', () => {
  const { sound, fire, attrs, remember, audio } = setup();
  fire('pointerdown');
  fire('button:click');
  expect(remember).toHaveBeenLastCalledWith(false);
  expect(attrs['aria-pressed']).toBe('false');
  sound.events([{ type: 'dressed', actor: 'bia' }], () => false);
  expect(audio()!.oscillators).toHaveLength(0);
  fire('button:click');
  expect(remember).toHaveBeenLastCalledWith(true);
  sound.events([{ type: 'dressed', actor: 'bia' }], () => false);
  expect(audio()!.oscillators.length).toBeGreaterThanOrEqual(timbres.dress.length);
});

it('desligado desde o início não cria contexto até a criança ligar', () => {
  const { fire, audio, attrs } = setup(false);
  expect(attrs['aria-pressed']).toBe('false');
  fire('pointerdown'); expect(audio()).toBeUndefined();
  fire('button:click'); expect(audio()).toBeDefined();
});

it('miado para gatos e nada para eventos sem timbre', () => {
  const { sound, fire, audio } = setup();
  fire('pointerdown');
  sound.events([{ type: 'moved', actor: 'mimi' }], () => true);
  expect(audio()!.oscillators).toHaveLength(0);
  sound.events([{ type: 'fed', actor: 'mimi' }], id => id === 'mimi');
  expect(audio()!.oscillators).toHaveLength(timbres.meow.length);
});
