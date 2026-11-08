import { expect, it } from 'vitest';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { decodeNeighborhood, encodeNeighborhood } from '../persistence/neighborhood';

const initial = () => neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'shop' });
it('move a casa para terreno vazio preservando IDs, vista, moradores, objetos e decoração', () => {
  const town = initial();
  const next = neighborhoodAction(town, { type: 'move-building', building: 1, plot: 3 });
  expect(next.buildings[0]).toEqual({ ...town.buildings[0], plot: 3 });
  expect(next.buildings[1]).toEqual(town.buildings[1]);
  expect({ ...next, buildings: town.buildings }).toEqual(town);
  expect(decodeNeighborhood(encodeNeighborhood(next))).toEqual(next);
  expect(town.buildings[0]!.plot).toBe(0);
});
it('troca casas em terrenos ocupados sem duplicar nenhuma delas', () => {
  const town = initial();
  const next = neighborhoodAction(town, { type: 'move-building', building: 1, plot: 1 });
  expect(next.buildings).toEqual([{ ...town.buildings[0], plot: 1 }, { ...town.buildings[1], plot: 0 }]);
  expect({ ...next, buildings: town.buildings }).toEqual(town);
  expect(decodeNeighborhood(encodeNeighborhood(next))).toEqual(next);
});
it('recusa destino atual, terreno inválido e casa ausente sem criar histórico', () => {
  const town = initial();
  for (const plot of [0, -1, 4, .5, NaN, Infinity]) expect(neighborhoodAction(town, { type: 'move-building', building: 1, plot })).toBe(town);
  expect(neighborhoodAction(town, { type: 'move-building', building: 999, plot: 2 })).toBe(town);
});
