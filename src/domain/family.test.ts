import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { initialAlbum } from './houses';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { adultIds, isAdult, wardrobeOf } from './family';
import { tastes } from './tastes';
import { needsOf } from './needs';
import { actorIds, actorKinds } from './types';

it('os pais da turma, Daniel e Fabiana, são pessoas da turma e os únicos adultos (W3L-24)', () => {
  expect(adultIds).toEqual(['daniel', 'fabiana']);
  expect(actorIds).toEqual(expect.arrayContaining([...adultIds]));
  expect(adultIds.map(id => actorKinds[id])).toEqual(['human', 'human']);
  expect(actorIds.filter(isAdult)).toEqual(['daniel', 'fabiana']);
});

it('um jogo novo começa com os dois em pé no quarto da casa, sem segurar nada', () => {
  const world = initialWorld();
  for (const id of adultIds) {
    const adult = world.actors.find(a => a.id === id)!;
    expect(adult).toMatchObject({ kind: 'human', room: 'quarto', seat: null, fed: false, resting: false });
    expect(world.items.some(i => i.holder === id)).toBe(false);
  }
});

it('adulto se entedia mais devagar: tédio ×0,6 (§3.6)', () => {
  for (const id of adultIds) expect(tastes[id].pace).toEqual({ tedio: 0.6 });
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  const after = neighborhoodAction(town, { type: 'live', elapsed: 60_000, phase: 'manha', idle: ['bia', 'daniel'] });
  const boredom = (id: 'bia' | 'daniel') => needsOf(after.actors.find(a => a.id === id)!).tedio;
  expect(boredom('daniel')).toBeCloseTo(boredom('bia') * 0.6);
});

it('o guarda-roupa do adulto tem 7 looks: 2 do dia a dia e 5 uniformes; as crianças não vestem os uniformes de adulto (§3.6)', () => {
  expect(wardrobeOf('daniel')).toEqual(['sol', 'outing', 'market', 'office', 'doctor', 'firefighter', 'police']);
  expect(wardrobeOf('fabiana')).toEqual(wardrobeOf('daniel'));
  expect(wardrobeOf('bia')).not.toContain('market'); expect(wardrobeOf('bia')).not.toContain('firefighter');
  expect(wardrobeOf('bia')).toContain('spiderman');
  const home = { ...initialWorld(), room: 'quarto' as const };
  expect(transition(home, { type: 'dress', actor: 'daniel', look: 'office' }).state.actors.find(a => a.id === 'daniel')!.look).toBe('office');
  expect(transition(home, { type: 'dress', actor: 'daniel', look: 'spiderman' })).toEqual({ state: home, events: [] });
  const sala = initialWorld();
  expect(transition(sala, { type: 'dress', actor: 'bia', look: 'firefighter' })).toEqual({ state: sala, events: [] });
});
