import { expect, it } from 'vitest';
import { initialAlbum } from './houses';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { initialWorld } from './world';
import { phaseAt } from './clock';
import { bandOf, mood, needsOf } from './needs';
import type { Neighborhood, Resident } from './neighborhood-types';
import type { ActorId } from './types';

const startTown = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
const who = (town: Neighborhood, id: ActorId) => town.actors.find(a => a.id === id)!;
const withActor = (town: Neighborhood, id: ActorId, patch: Partial<Resident>): Neighborhood =>
  ({ ...town, actors: town.actors.map(a => a.id === id ? { ...a, ...patch } : a) });
/** Plays `seconds` of session in 30 s ticks, each with the day phase at its start (as the app's clock does); `each` sees the end of every tick. */
function play(town: Neighborhood, seconds: number, idle: readonly ActorId[] = [], each?: (town: Neighborhood, at: number) => void) {
  let current = town;
  for (let at = 0; at < seconds; at += 30) {
    current = neighborhoodAction(current, { type: 'live', elapsed: 30_000, phase: phaseAt(at * 1000, 'calmo'), idle });
    each?.(current, at + 30);
  }
  return current;
}
/** The seconds of the day (end of each tick) at which `id` shows the sad face. */
function sadTimes(town: Neighborhood, id: ActorId, idle: readonly ActorId[] = []) {
  const sad: number[] = [];
  const end = play(town, 16 * 60, idle, (current, at) => { if (mood(who(current, id)) === 'triste') sad.push(at); });
  return { sad, end };
}
const span = (from: number, to: number) => Array.from({ length: (to - from) / 30 + 1 }, (_, n) => from + n * 30);

it('o dia de 16 min só com a Bia (§3.1): Luna e Léo, sem comer, ficam tristes só no fim do dia, pela fome e pelo sono', () => {
  const town = startTown();
  const luna = sadTimes(town, 'luna'), leo = sadTimes(town, 'leo');
  // Luna: hunger in `precisa` at 8:30, sleep at 14:30 (the night's +12/min) — sad from 14:30 to the end, the last 1.5 min.
  expect(luna.sad).toEqual(span(870, 960));
  // Léo (sleep ×1.1) yawns first: his sleep reaches `precisa` at 14:00, so his sad face takes the day's last 2 min.
  expect(leo.sad).toEqual(span(840, 960));
  expect(bandOf(who(luna.end, 'luna'), 'fome')).toBe('precisa');
  expect(bandOf(who(luna.end, 'luna'), 'tedio')).toBe('bem');
});

it('a fome chega a precisa às 8 min 30 s e o sono da Luna às 14 min 30 s', () => {
  const marks: Record<string, number> = {};
  play(startTown(), 16 * 60, [], (current, at) => {
    for (const need of ['fome', 'sono'] as const) if (!marks[need] && bandOf(who(current, 'luna'), need) === 'precisa') marks[need] = at;
  });
  expect(marks).toEqual({ fome: 510, sono: 870 });
});

it('quem fica parado sem brincar também se entedia, mas a tristeza não vem antes de 14 min (W3L-13, ajuste do lote 3)', () => {
  expect(sadTimes(startTown(), 'luna', ['luna']).sad[0]).toBe(840);
});

const everyone: readonly ActorId[] = ['bia', 'luna', 'leo', 'rui', 'mimi', 'nino', 'pipoca'];
it('ninguém fica triste antes de 14 min, parado ou não, sem comer nem dormir: Léo e os gatos também (ajuste do lote 3)', () => {
  const first = (idle: boolean) => Object.fromEntries(everyone.map(id => [id, sadTimes(startTown(), id, idle ? [id] : []).sad[0]]));
  expect(first(true)).toEqual({ bia: 840, luna: 840, leo: 840, rui: 840, mimi: 840, nino: 840, pipoca: 840 });
  expect(first(false)).toEqual({ bia: 870, luna: 870, leo: 840, rui: 870, mimi: 840, nino: 840, pipoca: 840 });
});

/** The ticks (end of each) at which `id`'s top need in `precisa` is boredom and she is not sad: the bored face (expression.ts). She
 *  stands still all day and eats a dish (hunger to 0) at the end of the ticks in `meals`. */
function boredTimes(town: Neighborhood, id: ActorId, meals: readonly number[] = []) {
  const bored: number[] = [];
  let current = town;
  for (let at = 30; at <= 16 * 60; at += 30) {
    current = neighborhoodAction(current, { type: 'live', elapsed: 30_000, phase: phaseAt((at - 30) * 1000, 'calmo'), idle: [id] });
    const now = needsOf(who(current, id)), top = (['fome', 'sono', 'tedio'] as const).filter(n => bandOf(who(current, id), n) === 'precisa').sort((a, b) => now[b] - now[a])[0];
    if (top === 'tedio' && mood(who(current, id)) !== 'triste') bored.push(at);
    if (meals.includes(at)) current = withActor(current, id, { needs: { ...now, fome: 0 } });
  }
  return bored;
}
it('o rosto de tédio aparece no jogo normal: o Rui parado, de 10 a 14 min; quem comeu, aos 14 min (ajuste do lote 3)', () => {
  expect(boredTimes(startTown(), 'rui')).toEqual(span(600, 810));
  expect(boredTimes(startTown(), 'bia', [300, 600])).toEqual([840]);
});

it('dormir tira o sono e encerra a tristeza: na cama −25/min, no sofá −12/min; ninguém se entedia dormindo', () => {
  const night = play(startTown(), 16 * 60);
  expect(mood(who(night, 'luna'))).toBe('triste');
  const inside = who(night, 'luna').location as Extract<Resident['location'], { kind: 'interior' }>;
  let rest = withActor(withActor(night, 'luna', { resting: true, seat: '8.0', room: 'quarto', location: { ...inside, room: 'quarto' } }), 'leo', { resting: true, seat: '2.0' });
  const sleepy = needsOf(who(rest, 'leo')).sono;
  rest = neighborhoodAction(rest, { type: 'live', elapsed: 60_000, phase: 'noite', idle: ['luna', 'leo'] });
  expect(needsOf(who(rest, 'luna')).sono).toBe(needsOf(who(night, 'luna')).sono - 25);
  expect(needsOf(who(rest, 'leo')).sono).toBe(sleepy - 12);
  expect(needsOf(who(rest, 'luna')).tedio).toBe(0);
  expect(mood(who(rest, 'luna'))).not.toBe('triste');
  for (let n = 0; n < 5; n++) rest = neighborhoodAction(rest, { type: 'live', elapsed: 60_000, phase: 'noite' });
  expect(needsOf(who(rest, 'luna')).sono).toBe(0);
});

it('a cama conta pela peça do assento no cômodo onde a pessoa está: na rua, noutro cômodo ou sem assento é −12/min', () => {
  const night = play(startTown(), 16 * 60), inside = who(night, 'luna').location as Extract<Resident['location'], { kind: 'interior' }>;
  const drop = (patch: Partial<Resident>) => {
    const town = withActor(night, 'luna', { resting: true, ...patch });
    return needsOf(who(town, 'luna')).sono - needsOf(who(neighborhoodAction(town, { type: 'live', elapsed: 60_000, phase: 'noite' }), 'luna')).sono;
  };
  expect(drop({ seat: '8.0', room: 'quarto', location: { ...inside, room: 'quarto' } })).toBe(25);
  expect(drop({ seat: '8.0', room: 'sala', location: { ...inside, room: 'sala' } })).toBe(12);
  expect(drop({ seat: '8.0', room: 'quarto', location: { kind: 'street' } as Resident['location'] })).toBe(12);
  expect(drop({ seat: null, room: 'quarto', location: { ...inside, room: 'quarto' } })).toBe(12);
});
