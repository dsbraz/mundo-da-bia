import { expect, it } from 'vitest';
import { initialWorld } from './world';
import { initialAlbum } from './houses';
import { migrateNeighborhood } from './neighborhood';
import { adultIds, isAdult, parentIds, wardrobeOf } from './family';
import { tastes } from './tastes';
import { needsOf } from './needs';
import { actorIds, actorKinds } from './types';
import { pupilsOf } from './school';
import { suggestion } from './routine';

it('lote 8B: a Laura, irmã mais velha da Bia (18 anos), é da turma e conta como adulta, sem ser mãe nem pai', () => {
  expect(actorIds.at(-1)).toBe('laura');
  expect(actorKinds.laura).toBe('human');
  expect(isAdult('laura')).toBe(true);
  expect(adultIds).toEqual(['daniel', 'fabiana', 'laura']);
  expect(parentIds).toEqual(['daniel', 'fabiana']);
  expect(wardrobeOf('laura')).toEqual(wardrobeOf('fabiana'));
  expect(tastes.laura.pace).toEqual({ tedio: 0.8 });
});

it('num jogo novo ela começa em pé no quarto, longe dos pais, com a roupa do dia a dia e as necessidades de manhã', () => {
  const world = initialWorld(), laura = world.actors.find(a => a.id === 'laura')!;
  expect(laura).toMatchObject({ kind: 'human', room: 'quarto', seat: null, look: 'sol', fed: false, resting: false });
  for (const parent of parentIds) expect(Math.abs(world.actors.find(a => a.id === parent)!.x - laura.x)).toBeGreaterThanOrEqual(150);
  const town = migrateNeighborhood(initialAlbum(world));
  expect(needsOf(town.actors.find(a => a.id === 'laura')!).fome).toBeGreaterThan(0);
});

it('na aula ela não é aluna (adulta: fica de pé ensinando, como os pais), e de manhã em casa pega a pasta para estudar ou trabalhar', () => {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  const seated = { ...town, actors: town.actors.map(a => a.id === 'laura' || a.id === 'bia' ? { ...a, room: 'sala' as const, seat: '2.0' as const, location: { kind: 'interior' as const, building: 1, room: 'sala' as const } } : a) };
  const pupils = pupilsOf(seated, { building: 1, room: 'sala', grownUps: adultIds });
  expect(pupils).not.toContain('laura');
  const fine = { kind: 'human' as const, needs: { fome: 0, sono: 0, tedio: 0, alegria: 0 } };
  expect(suggestion('manha', fine, 'home', isAdult('laura'))).toBe('pasta');
});
