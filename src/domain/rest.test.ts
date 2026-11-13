import { describe, expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { restSeat } from './care';
import { seatPoint } from './seats';
import { initialAlbum } from './houses';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { needsOf } from './needs';
import type { ActorId, Piece, World } from './types';
import type { Neighborhood, Resident } from './neighborhood-types';

const who = (world: World, id: ActorId) => world.actors.find(a => a.id === id)!;
/** The living room with only `kinds` among its seats (the sofa and the rest kept or removed). */
function sala(keep: (piece: Piece) => boolean): World {
  const world = initialWorld();
  return { ...world, layout: { ...world.layout, pieces: world.layout.pieces.filter(p => p.room !== 'sala' || keep(p)) },
    actors: world.actors.map(a => ({ ...a, seat: null, y: 530 })) };
}
const bedroom = (world: World): World => transition(transition(world, { type: 'room', room: 'quarto' }).state, { type: 'summon' }).state;
const rest = (world: World, id: ActorId) => transition(world, { type: 'rest', actor: id });

describe('dormir só em cama ou sofá (W3L-15)', () => {
  it('rest sem cama nem sofá livre devolve missing:bed (a cama, para a seta de porta) e não muda resting', () => {
    const world = sala(p => p.kind !== 'sofa'), { state, events } = rest(world, 'bia');
    expect(state).toBe(world);
    expect(events).toEqual([{ type: 'missing', actor: 'bia', need: 'bed', want: 'bed' }]);
  });
  it('com o sofá ocupado também falta cama', () => {
    const world = sala(() => true), full = transition(transition(world, { type: 'sit', actor: 'luna', seat: '2.0' }).state, { type: 'sit', actor: 'leo', seat: '2.1' }).state;
    expect(rest(full, 'bia').events).toEqual([{ type: 'missing', actor: 'bia', need: 'bed', want: 'bed' }]);
    expect(who(rest(full, 'bia').state, 'bia').resting).toBe(false);
  });
  it('cochila no sofá livre: senta na vaga e descansa', () => {
    const { state, events } = rest(sala(() => true), 'bia');
    expect(who(state, 'bia')).toMatchObject({ seat: '2.0', resting: true, x: seatPoint(state, '2.0')!.x, y: seatPoint(state, '2.0')!.y });
    expect(events).toEqual([{ type: 'rested', actor: 'bia' }]);
  });
  it('quem já está sentado no sofá cochila ali mesmo', () => {
    const world = transition(sala(() => true), { type: 'sit', actor: 'bia', seat: '2.1' }).state;
    expect(who(rest(world, 'bia').state, 'bia')).toMatchObject({ seat: '2.1', resting: true });
  });
  it('a cama vem antes do sofá: no quarto ela deita na cama', () => {
    const world = bedroom(initialWorld());
    expect(restSeat(world, who(world, 'bia'))).toBe('8.0');
    expect(who(rest(world, 'bia').state, 'bia')).toMatchObject({ seat: '8.0', resting: true });
  });
  it('acordar continua igual: quem descansa acorda pronto para comer', () => {
    const asleep = rest(sala(() => true), 'bia').state, { state, events } = rest(asleep, 'bia');
    expect(who(state, 'bia')).toMatchObject({ resting: false, fed: false });
    expect(events).toEqual([{ type: 'rested', actor: 'bia' }]);
  });
  it('o gato prefere a caminha, depois o sofá e a cama, e nunca a caminha de outro', () => {
    const world = bedroom(initialWorld());
    expect(who(rest(world, 'mimi').state, 'mimi')).toMatchObject({ seat: '10.0', resting: true });
    const taken = transition(world, { type: 'sit', actor: 'nino', seat: '10.0' }).state;
    expect(who(rest(taken, 'mimi').state, 'mimi')).toMatchObject({ seat: '8.0', resting: true });
    expect(who(rest(sala(() => true), 'mimi').state, 'mimi')).toMatchObject({ seat: '2.0', resting: true });
  });
  it('o gato dorme no tapete quando não há caminha, sofá nem cama livre; no chão nu, nunca', () => {
    const off = sala(p => p.kind !== 'sofa'), { state, events } = rest({ ...off, actors: off.actors.map(a => a.id === 'mimi' ? { ...a, x: 930 } : a) }, 'mimi');
    expect(who(state, 'mimi')).toMatchObject({ seat: null, resting: true, x: 495, y: 517 });
    expect(events).toEqual([{ type: 'rested', actor: 'mimi' }]);
    const bare = sala(p => p.kind !== 'sofa' && p.kind !== 'rug');
    expect(rest(bare, 'mimi')).toEqual({ state: bare, events: [{ type: 'missing', actor: 'mimi', need: 'bed', want: 'cat-bed' }] });
  });
  it('o gato que já está no tapete dorme onde está', () => {
    const world = sala(p => p.kind !== 'sofa'), on = { ...world, actors: world.actors.map(a => a.id === 'mimi' ? { ...a, x: 300, y: 500 } : a) };
    expect(who(rest(on, 'mimi').state, 'mimi')).toMatchObject({ x: 300, y: 500, resting: true });
  });
  it('uma pessoa não dorme no tapete nem na caminha', () => {
    const world = bedroom(sala(p => p.kind !== 'sofa')), noBed = { ...world, layout: { ...world.layout, pieces: world.layout.pieces.filter(p => p.kind !== 'bed') } };
    expect(rest(noBed, 'bia').events).toEqual([{ type: 'missing', actor: 'bia', need: 'bed', want: 'bed' }]);
  });
});

describe('dormir até de manhã (W3L-15)', () => {
  const town = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
  const sleepy = (t: Neighborhood) => ({ ...t, actors: t.actors.map(a => ({ ...a, needs: { fome: 50, sono: 90, tedio: 10, alegria: 0 } })) });
  const lying = (t: Neighborhood, id: ActorId, patch: Partial<Resident>) => ({ ...t, actors: t.actors.map(a => a.id === id ? { ...a, resting: true, ...patch } : a) });
  it('zera o sono das pessoas em cama ou sofá da casa (deitadas ou só sentadas), e só delas', () => {
    const start = sleepy(town()), inside = start.actors[0]!.location as Extract<Resident['location'], { kind: 'interior' }>;
    let night = lying(start, 'bia', { seat: '8.0', room: 'quarto', location: { ...inside, room: 'quarto' } });
    night = lying(night, 'luna', { seat: '2.1', resting: false });
    night = lying(night, 'mimi', { seat: '2.0' });
    night = lying(night, 'leo', { seat: null });
    night = lying(night, 'rui', { seat: null, location: { kind: 'street' } });
    const morning = neighborhoodAction(night, { type: 'morning', building: inside.building });
    const sono = (id: ActorId) => needsOf(morning.actors.find(a => a.id === id)!).sono;
    expect([sono('bia'), sono('luna'), sono('leo'), sono('rui'), sono('mimi')]).toEqual([0, 0, 90, 90, 90]);
    expect(needsOf(morning.actors[0]!)).toEqual({ fome: 50, sono: 0, tedio: 10, alegria: 0 });
  });
  it('ninguém deitado: nada muda', () => {
    const start = town();
    expect(neighborhoodAction(start, { type: 'morning', building: 1 })).toEqual(start);
  });
});
