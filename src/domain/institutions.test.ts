import { expect, it } from 'vitest';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import type { BuildingModel } from './neighborhood-types';
import { decodeNeighborhood, encodeNeighborhood } from '../persistence/neighborhood';

for (const [model, name, templates] of [
  ['hospital', 'Hospital', ['reception', 'consultation', 'ward']],
  ['police', 'Delegacia', ['reception', 'dispatch', 'investigation']],
  ['office', 'Escritório', ['reception', 'office', 'meeting', 'breakroom']],
  ['fire-station', 'Bombeiros', ['dispatch', 'bedroom', 'breakroom']],
  ['school', 'Escola', ['reception', 'classroom', 'library', 'playground']],
  ['stadium', 'Estádio', ['sportsfield', 'gym', 'breakroom']],
  ['sports-club', 'Clube esportivo', ['reception', 'gym', 'playground']],
] as const) it(`constrói ${name} mobiliado e preserva a turma e o save`, () => {
  const before = migrateNeighborhood(initialAlbum(initialWorld()));
  const town = neighborhoodAction(before, { type: 'construct', plot: 1, model: model as BuildingModel });
  const building = town.buildings[1]!;
  expect(building.name).toBe(`${name} 2`);
  expect(Object.values(building.layout.rooms).map(r => r.template)).toEqual(templates);
  for (const room of Object.keys(building.layout.rooms)) expect(building.layout.pieces.some(p => p.room === room)).toBe(true);
  expect(town.actors).toEqual(before.actors);
  expect(town.items).toEqual(before.items);
  expect(decodeNeighborhood(encodeNeighborhood(town))).toEqual(town);
  expect(before.buildings).toHaveLength(1);
});
