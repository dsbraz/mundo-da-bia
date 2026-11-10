import { describe, expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { toggleRest, wake } from './care';
import { initialAlbum } from './houses';
import { localWorld, migrateNeighborhood, neighborhoodAction } from './neighborhood';
import type { Actor, World } from './types';

const bia = (world: World) => world.actors.find(a => a.id === 'bia')!;
const others = (world: World) => world.actors.filter(a => a.id !== 'bia');
/** Bia fed and asleep on the living-room floor; Luna fed and awake (she must never be touched). */
function sleepyFed(): World {
  let world = initialWorld();
  world = transition(world, { type: 'pick', actor: 'bia', item: 'lanche' }).state;
  world = transition(world, { type: 'feed', actor: 'bia' }).state;
  world = { ...world, actors: world.actors.map(a => a.id === 'luna' ? { ...a, fed: true } : a) };
  return transition(world, { type: 'rest', actor: 'bia' }).state;
}

describe('ciclo de cuidado suave', () => {
  it('acordar limpa a barriga cheia; quem já estava acordado continua igual', () => {
    expect(wake({ resting: true, fed: true } as Actor)).toEqual({ resting: false, fed: false });
    expect(wake({ resting: false, fed: true } as Actor)).toEqual({ resting: false });
    expect(wake({ resting: false, fed: false } as Actor)).toEqual({ resting: false });
  });
  it('o botão de descanso dorme guardando a refeição ou acorda pronto para comer', () => {
    expect(toggleRest({ resting: false })).toEqual({ resting: true });
    expect(toggleRest({ resting: true })).toEqual({ resting: false, fed: false });
  });
  it('dormir guarda a barriga cheia', () => {
    const world = sleepyFed();
    expect(bia(world)).toMatchObject({ resting: true, fed: true });
  });
  it('alimentar, descansar e acordar deixa comer de novo', () => {
    const asleep = sleepyFed(), before = others(asleep);
    const { state, events } = transition(asleep, { type: 'rest', actor: 'bia' });
    expect(bia(state)).toMatchObject({ resting: false, fed: false });
    expect(events).toEqual([{ type: 'rested', actor: 'bia' }]);
    expect(others(state)).toEqual(before);
    const held = transition(state, { type: 'pick', actor: 'bia', item: 'lanche' }).state;
    const again = transition(held, { type: 'feed', actor: 'bia' });
    expect(bia(again.state).fed).toBe(true);
    expect(again.events).toEqual([{ type: 'fed', actor: 'bia' }]);
  });
  it('andar acorda e esvazia a barriga, sem mexer nos outros', () => {
    const asleep = sleepyFed();
    const state = transition(asleep, { type: 'move', actor: 'bia', point: { x: 600, y: 500 } }).state;
    expect(bia(state)).toMatchObject({ resting: false, fed: false, x: 600, y: 500 });
    expect(others(state)).toEqual(others(asleep));
  });
  it('andar acordado não esvazia a barriga', () => {
    const awake = transition(sleepyFed(), { type: 'rest', actor: 'bia' }).state;
    const fed = { ...awake, actors: awake.actors.map(a => a.id === 'bia' ? { ...a, fed: true } : a) };
    expect(bia(transition(fed, { type: 'move', actor: 'bia', point: { x: 600, y: 500 } }).state).fed).toBe(true);
  });
  it('comer dormindo acorda de barriga cheia', () => {
    let world = transition(initialWorld(), { type: 'rest', actor: 'bia' }).state;
    world = transition(world, { type: 'pick', actor: 'bia', item: 'lanche' }).state;
    expect(bia(transition(world, { type: 'feed', actor: 'bia' }).state)).toMatchObject({ resting: false, fed: true });
    expect(bia(transition(world, { type: 'drop', actor: 'bia' }).state)).toMatchObject({ resting: true });
  });
  it('receber comida dormindo acorda de barriga cheia; receber brinquedo acorda e esvazia', () => {
    const asleep = sleepyFed();
    expect(bia(transition(asleep, { type: 'give', actor: 'bia', item: 'lanche' }).state)).toMatchObject({ resting: false, fed: true });
    const toy = transition(asleep, { type: 'give', actor: 'bia', item: 'ursinho' }).state;
    expect(bia(toy)).toMatchObject({ resting: false, fed: false });
    expect(others(toy)).toEqual(others(asleep));
  });
  it('sentar no sofá acorda e esvazia; deitar na cama mantém a barriga', () => {
    const asleep = sleepyFed();
    expect(bia(transition(asleep, { type: 'sit', actor: 'bia', seat: 'sofa-left' }).state)).toMatchObject({ seat: 'sofa-left', resting: false, fed: false });
    const bedroom = transition({ ...asleep, actors: asleep.actors.map(a => a.id === 'bia' ? { ...a, room: 'quarto' } : a) }, { type: 'room', room: 'quarto' }).state;
    expect(bia(transition(bedroom, { type: 'sit', actor: 'bia', seat: 'bed' }).state)).toMatchObject({ seat: 'bed', resting: true, fed: true });
  });
  it('ir a outro cômodo acorda e esvazia a barriga', () => {
    const asleep = sleepyFed();
    const state = transition(asleep, { type: 'travel', actor: 'bia', room: 'quarto' }).state;
    expect(bia(state)).toMatchObject({ room: 'quarto', resting: false, fed: false });
    expect(others(state)).toEqual(others(asleep));
  });
  it('sair para a rua ou ir à praça acorda e esvazia a barriga', () => {
    let town = migrateNeighborhood(initialAlbum(sleepyFed()));
    const street = { kind: 'street' } as const;
    const out = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: street, point: { x: 300, y: 520 } });
    expect(out.actors[0]).toMatchObject({ resting: false, fed: false });
    expect(out.actors[1]).toMatchObject({ fed: true });
    town = { ...out, actors: out.actors.map(a => a.id === 'bia' ? { ...a, resting: true, fed: true } : a) };
    const bench = neighborhoodAction(town, { type: 'outdoor', actor: 'bia', target: 'bench' });
    expect(bench.actors[0]).toMatchObject({ resting: false, fed: false });
    expect(localWorld(bench).actors[1]).toMatchObject({ fed: true });
  });
});
