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
  const end = play(town, 32 * 60, idle, (current, at) => { if (mood(who(current, id)) === 'triste') sad.push(at); });
  return { sad, end };
}
const span = (from: number, to: number) => Array.from({ length: (to - from) / 30 + 1 }, (_, n) => from + n * 30);

it('o dia de 32 min só com a Bia (§3.1, lote 8E): Luna e Léo, sem comer, ficam tristes só no fim do dia, pela fome e pelo sono', () => {
  const town = startTown();
  const luna = sadTimes(town, 'luna'), leo = sadTimes(town, 'leo');
  // Luna: hunger (breakfast at 27, +1.5/min) and sleep (the night's +8/min from dusk at 20) both reach `precisa` at 29:00, the night's
  // last minute: sad on that tick only, as the dawn eases her sleep.
  expect(luna.sad).toEqual([1740]);
  // Léo (sleep ×1.1, breakfast at 32): hungry from 25:30, sleepy too from 28:00, until the dawn eases it.
  expect(leo.sad).toEqual(span(1680, 1830));
  expect(bandOf(who(luna.end, 'luna'), 'fome')).toBe('precisa');
  expect(bandOf(who(luna.end, 'luna'), 'tedio')).toBe('bem');
});

it('a fome da Luna, sem comer o dia todo, só chega a precisa aos 29 min, com o sono (no fim da noite)', () => {
  const marks: Record<string, number> = {};
  play(startTown(), 32 * 60, [], (current, at) => {
    for (const need of ['fome', 'sono'] as const) if (!marks[need] && bandOf(who(current, 'luna'), need) === 'precisa') marks[need] = at;
  });
  expect(marks).toEqual({ fome: 1740, sono: 1740 });
});

it('quem fica parado sem brincar também se entedia, mas a tristeza só vem no fim da noite, aos 29 min (W3L-13, lote 8E)', () => {
  expect(sadTimes(startTown(), 'luna', ['luna']).sad[0]).toBe(1740);
});

const everyone: readonly ActorId[] = ['bia', 'luna', 'leo', 'rui', 'mimi', 'nino', 'pipoca'];
it('ninguém fica triste antes de 25 min, parado ou não, sem comer nem dormir: Léo e os gatos também (lote 8E)', () => {
  const first = (idle: boolean) => Object.fromEntries(everyone.map(id => [id, sadTimes(startTown(), id, idle ? [id] : []).sad[0]]));
  expect(first(true)).toEqual({ bia: 1620, luna: 1740, leo: 1530, rui: 1740, mimi: 1560, nino: 1560, pipoca: 1560 });
  // Busy, the cats and Rui (hunger ×0.6) only have sleep in `precisa` by the day's end: never sad on the first day.
  expect(first(false)).toEqual({ bia: 1740, luna: 1740, leo: 1680, rui: undefined, mimi: undefined, nino: undefined, pipoca: undefined });
});

/** The ticks (end of each) at which `id`'s top need in `precisa` is boredom and she is not sad: the bored face (expression.ts). She
 *  stands still all day and eats a dish (hunger to 0) at the end of the ticks in `meals`. */
function boredTimes(town: Neighborhood, id: ActorId, meals: readonly number[] = []) {
  const bored: number[] = [];
  let current = town;
  for (let at = 30; at <= 32 * 60; at += 30) {
    current = neighborhoodAction(current, { type: 'live', elapsed: 30_000, phase: phaseAt((at - 30) * 1000, 'calmo'), idle: [id] });
    const now = needsOf(who(current, id)), top = (['fome', 'sono', 'tedio'] as const).filter(n => bandOf(who(current, id), n) === 'precisa').sort((a, b) => now[b] - now[a])[0];
    if (top === 'tedio' && mood(who(current, id)) !== 'triste') bored.push(at);
    if (meals.includes(at)) current = withActor(current, id, { needs: { ...now, fome: 0 } });
  }
  return bored;
}
it('o rosto de tédio aparece no jogo normal: o Rui parado, dos 17 min ao fim do dia; quem comeu, dos 23 min 30 s (lote 8E)', () => {
  // Both are sad (bored and sleepy) on the night's last tick, at 29:00, and the dawn eases their sleep.
  expect(boredTimes(startTown(), 'rui')).toEqual(span(1020, 1920).filter(at => at !== 1740));
  expect(boredTimes(startTown(), 'bia', [600, 1200])).toEqual(span(1410, 1920).filter(at => at !== 1740));
});

it('dormir tira o sono e encerra a tristeza: na cama −25/min, no sofá −12/min; ninguém se entedia dormindo', () => {
  // At 26 min of a day without meals or bed: sleep in `precisa`, and Luna hungry too.
  const night = withActor(play(startTown(), 26 * 60), 'luna', { needs: { fome: 80, sono: 72, tedio: 0, alegria: 0 } });
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
  const night = play(startTown(), 26 * 60), inside = who(night, 'luna').location as Extract<Resident['location'], { kind: 'interior' }>;
  const drop = (patch: Partial<Resident>) => {
    const town = withActor(night, 'luna', { resting: true, ...patch });
    return needsOf(who(town, 'luna')).sono - needsOf(who(neighborhoodAction(town, { type: 'live', elapsed: 60_000, phase: 'noite' }), 'luna')).sono;
  };
  expect(drop({ seat: '8.0', room: 'quarto', location: { ...inside, room: 'quarto' } })).toBe(25);
  expect(drop({ seat: '8.0', room: 'sala', location: { ...inside, room: 'sala' } })).toBe(12);
  expect(drop({ seat: '8.0', room: 'quarto', location: { kind: 'street' } as Resident['location'] })).toBe(12);
  expect(drop({ seat: null, room: 'quarto', location: { ...inside, room: 'quarto' } })).toBe(12);
});

it('lote 8E: uma noite dormida dura o dia seguinte inteiro; uma noite em claro passa até o meio da manhã', () => {
  const slept = withActor(play(startTown(), 29 * 60), 'luna', { needs: { fome: 0, sono: 0, tedio: 0, alegria: 0 } });
  const marks: number[] = [];
  play(slept, 26 * 60, [], (current, at) => { if (bandOf(who(current, 'luna'), 'sono') !== 'bem') marks.push(at); });
  // Slept (the day starts again in the morning): her sleep only asks again 5 min after the next dusk, 25 min into the day.
  expect(marks[0]).toBe(1500);
  // Awake all night: in the morning her sleep eases off (−5/min), back to `bem` 3 min 30 s into the day.
  const awake = play(startTown(), 32 * 60), easing: number[] = [];
  play(awake, 20 * 60, [], (current, at) => { if (bandOf(who(current, 'luna'), 'sono') !== 'bem') easing.push(at); });
  expect(easing.at(-1)).toBe(180);
});
it('#40: a noite de estrelas (12 min) em claro pesa como uma noite comum: o sono volta a bem 3 min 30 s depois da manhã', () => {
  const stars = (town: Neighborhood, from: number, seconds: number, each?: (town: Neighborhood, at: number) => void) => {
    let current = town;
    for (let at = from; at < from + seconds; at += 30) {
      current = neighborhoodAction(current, { type: 'live', elapsed: 30_000, phase: phaseAt(at * 1000, 'estrelas'), event: 'estrelas' });
      each?.(current, at + 30 - from);
    }
    return current;
  };
  const awake = stars(startTown(), 0, 38 * 60), easing: number[] = [];
  stars(awake, 38 * 60, 20 * 60, (current, at) => { if (bandOf(who(current, 'luna'), 'sono') !== 'bem') easing.push(at); });
  expect(easing.at(-1)).toBe(180);
});
