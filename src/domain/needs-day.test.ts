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
  // Léo (sleep ×1.2) yawns first: his sleep reaches `precisa` at 13:30, so his sad face starts 2.5 min before the day ends.
  expect(leo.sad).toEqual(span(810, 960));
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

it('pela tabela literal, quem fica parado sem brincar também se entedia: a tristeza vem às 12 min', () => {
  expect(sadTimes(startTown(), 'luna', ['luna']).sad[0]).toBe(720);
});

it('dormir tira o sono e encerra a tristeza: na cama −25/min, no sofá −12/min; ninguém se entedia dormindo', () => {
  const night = play(startTown(), 16 * 60);
  expect(mood(who(night, 'luna'))).toBe('triste');
  let rest = withActor(withActor(night, 'luna', { resting: true, seat: 'bed' }), 'leo', { resting: true, seat: 'sofa-left' });
  const sleepy = needsOf(who(rest, 'leo')).sono;
  rest = neighborhoodAction(rest, { type: 'live', elapsed: 60_000, phase: 'noite', idle: ['luna', 'leo'] });
  expect(needsOf(who(rest, 'luna')).sono).toBe(needsOf(who(night, 'luna')).sono - 25);
  expect(needsOf(who(rest, 'leo')).sono).toBe(sleepy - 12);
  expect(needsOf(who(rest, 'luna')).tedio).toBe(0);
  expect(mood(who(rest, 'luna'))).not.toBe('triste');
  for (let n = 0; n < 5; n++) rest = neighborhoodAction(rest, { type: 'live', elapsed: 60_000, phase: 'noite' });
  expect(needsOf(who(rest, 'luna')).sono).toBe(0);
});
