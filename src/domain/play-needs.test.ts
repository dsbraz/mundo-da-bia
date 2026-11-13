import { describe, expect, it } from 'vitest';
import { initialAlbum } from './houses';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { initialWorld } from './world';
import { phaseAt } from './clock';
import { enjoy, mood, needsOf } from './needs';
import { tastes } from './tastes';
import { selfCare } from './autonomy';
import type { Neighborhood, NeighborhoodItem } from './neighborhood-types';
import type { ActorId, Item, Needs, World } from './types';

const startTown = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
const needs = (patch: Partial<Needs>): Needs => ({ fome: 20, sono: 0, tedio: 0, alegria: 0, ...patch });
const withNeeds = <T extends { actors: World['actors'] }>(place: T, id: ActorId, patch: Partial<Needs>): T =>
  ({ ...place, actors: place.actors.map(a => a.id === id ? { ...a, needs: needs(patch) } : a) });
const who = (town: { actors: World['actors'] }, id: ActorId) => town.actors.find(a => a.id === id)!;
const onStreet = (town: Neighborhood): Neighborhood =>
  ({ ...town, location: { kind: 'street' }, actors: town.actors.map(a => ({ ...a, location: { kind: 'street' as const } })) });

describe('o que satisfaz, por personalidade (W3L-13)', () => {
  it('cada um tem uma brincadeira favorita: Bia corda, Luna amarelinha, Léo regar, Rui e os gatos bola', () => {
    expect(Object.fromEntries(Object.entries(tastes).map(([id, t]) => [id, t.game])))
      .toEqual({ bia: 'corda', luna: 'amarelinha', leo: 'regar', rui: 'bola', mimi: 'bola', nino: 'bola', pipoca: 'bola' });
  });
  it('o balanço tira 40 de tédio de quem não o tem como favorito e 70 do Rui com a bola, com alegria', () => {
    const town = withNeeds(withNeeds(onStreet(startTown()), 'bia', { tedio: 90 }), 'rui', { tedio: 90 });
    const swung = neighborhoodAction(town, { type: 'outdoor', actor: 'bia', target: 'swing' });
    expect(needsOf(who(swung, 'bia'))).toEqual(needs({ tedio: 50 }));
    const ball = neighborhoodAction(town, { type: 'enjoy', actor: 'rui', game: 'bola' });
    expect(needsOf(who(ball, 'rui'))).toEqual(needs({ tedio: 20, alegria: 60_000 }));
    expect(needsOf(who(neighborhoodAction(town, { type: 'enjoy', actor: 'bia', game: 'bola' }), 'bia')).tedio).toBe(50);
    expect(needsOf(who(neighborhoodAction(town, { type: 'enjoy', actor: 'bia', game: 'corda' }), 'bia'))).toEqual(needs({ tedio: 20, alegria: 60_000 }));
  });
  it('sentar no banco não é brincar; brincar sozinho só mexe em quem brinca', () => {
    const town = withNeeds(onStreet(startTown()), 'bia', { tedio: 90 });
    expect(needsOf(who(neighborhoodAction(town, { type: 'outdoor', actor: 'bia', target: 'bench' }), 'bia')).tedio).toBe(90);
    const played = enjoy(town, { type: 'enjoy', actor: 'bia', game: 'piano' });
    expect(played.actors.filter(a => a.id !== 'bia')).toEqual(town.actors.filter(a => a.id !== 'bia'));
  });
});

/** Plays `minutes` in 30 s ticks with the clock's phase, everyone in view and, with `idle`, everyone still (nobody eats or plays). */
function firstSad(idle: boolean) {
  let town = startTown(); const first: Partial<Record<ActorId, number>> = {};
  for (let at = 0; at < 16 * 60; at += 30) {
    town = neighborhoodAction(town, { type: 'live', elapsed: 30_000, phase: phaseAt(at * 1000, 'calmo'), idle: idle ? town.actors.map(a => a.id) : [] });
    for (const a of town.actors) if (first[a.id] === undefined && mood(a) === 'triste') first[a.id] = at + 30;
  }
  return first;
}
describe('o tédio de quem fica parado (W3L-13)', () => {
  it('cresce 5 por minuto (Rui 7): parado o dia inteiro, ninguém fica triste antes de 14 min (ajuste do lote 3)', () => {
    const minute = neighborhoodAction(startTown(), { type: 'live', elapsed: 60_000, phase: 'manha', idle: ['bia', 'rui'] });
    expect([needsOf(who(minute, 'bia')).tedio, needsOf(who(minute, 'rui')).tedio].map(v => Math.round(v * 100) / 100)).toEqual([5, 7]);
    const still = firstSad(true), busy = firstSad(false);
    expect(busy).toEqual({ bia: 870, luna: 870, leo: 840, rui: 870, mimi: 840, nino: 840, pipoca: 840 });
    // Standing still brings boredom to `precisa` at 14 min (Rui at 10 min, but he forgets to eat): never a second need before 14 min.
    expect(still).toEqual({ bia: 840, luna: 840, leo: 840, rui: 840, mimi: 840, nino: 840, pipoca: 840 });
  });
});

const dish = (patch: Partial<NeighborhoodItem> = {}): Item => ({ id: '9:prato', kind: 'prato', recipe: 'ovo-mexido', room: 'sala', x: 600, y: 520, holder: null, spot: 'floor', ...patch }) as Item;
describe('autonomias da Bia e da Luna (W3L-13)', () => {
  const hungry = (patch: Partial<NeighborhoodItem> = {}) => withNeeds({ ...initialWorld(), items: [...initialWorld().items, dish(patch)] }, 'bia', { fome: 45 });
  it('"faz sozinha": com fome (pede) e um prato no cômodo, a Bia não selecionada vai comer sentada', () => {
    expect(selfCare(hungry(), 'luna')).toEqual({ type: 'eat', actor: 'bia', item: '9:prato' });
    expect(selfCare(hungry({ spot: 'table' }), 'luna')).toEqual({ type: 'eat', actor: 'bia', item: '9:prato' });
  });
  it('não faz sozinha se está selecionada, sem fome, dormindo, se o prato está na mão de alguém, noutro cômodo ou se não há assento', () => {
    expect(selfCare(hungry(), 'bia')).toBeNull();
    expect(selfCare(withNeeds(hungry(), 'bia', { fome: 39 }), 'luna')).toBeNull();
    expect(selfCare({ ...hungry(), actors: hungry().actors.map(a => a.id === 'bia' ? { ...a, resting: true } : a) }, 'luna')).toBeNull();
    expect(selfCare(hungry({ holder: 'leo' }), 'luna')).toBeNull();
    expect(selfCare(hungry({ room: 'quarto' }), 'luna')).toBeNull();
    const bare = hungry(); bare.layout = { ...bare.layout, pieces: bare.layout.pieces.filter(p => !['sofa', 'armchair', 'chair'].includes(p.kind)) };
    expect(selfCare(bare, 'luna')).toBeNull();
  });
  const sadMimi = (world = initialWorld()) => withNeeds(world, 'mimi', { fome: 80, sono: 80 });
  it('"cuida": se alguém no cômodo está triste, a Luna não selecionada vai abraçar', () => {
    expect(selfCare(sadMimi(), 'bia')).toEqual({ type: 'hug', actor: 'luna', other: 'mimi' });
  });
  it('a Luna não cuida se está selecionada, dormindo, se ninguém está triste ou se a tristeza é noutro cômodo (o sono pode levar a outro ato, W3L-19)', () => {
    expect(selfCare(sadMimi(), 'luna')?.type).not.toBe('hug');
    expect(selfCare(initialWorld(), 'bia')).toBeNull();
    const away = sadMimi(); away.actors = away.actors.map(a => a.id === 'mimi' ? { ...a, room: 'quarto' } : a);
    expect(selfCare(away, 'bia')?.type).not.toBe('hug');
    const asleep = sadMimi(); asleep.actors = asleep.actors.map(a => a.id === 'luna' ? { ...a, resting: true } : a);
    expect(selfCare(asleep, 'bia')?.type).not.toBe('hug');
    expect(selfCare(withNeeds(initialWorld(), 'luna', { fome: 80, sono: 80 }), 'bia')?.type).not.toBe('hug');
  });
  it('a fome da Bia vem antes do cuidado da Luna', () => {
    expect(selfCare(sadMimi(hungry()), 'rui')?.type).toBe('eat');
  });
});
