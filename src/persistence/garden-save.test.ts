import { expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { growMinutes } from '../domain/garden';
import { plazaPlots } from '../domain/progress';
import type { Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { cropIds } from '../domain/types';

const roundTrip = (town: Neighborhood) => decodeNeighborhood(encodeNeighborhood(town));

it('plantar, regar, crescer até pronto, colher e chover, em cada canteiro e cultura, sobrevivem a encode → decode igual', () => {
  let town = migrateNeighborhood(initialAlbum(initialWorld()));
  town = { ...town, progress: { ...town.progress, seeds: [...cropIds] } };
  let now = 1_700_000_000_000;
  const step = (action: NeighborhoodAction) => { const next = neighborhoodAction(town, action); expect(roundTrip(next), JSON.stringify(action)).toEqual(next); town = next; };
  for (const crop of cropIds) for (const plot of plazaPlots) {
    step({ type: 'plant', plot, crop, now });
    for (const stage of [0, 1, 2, 3] as const) {
      step(stage % 2 ? { type: 'rain', now } : { type: 'water-plot', plot, now });
      now += growMinutes[crop][stage] * 60_000; step({ type: 'tick', now });
    }
    expect(town.progress.plaza[plot]?.stage).toBe(4);
    step({ type: 'harvest', plot });
  }
  expect(town.progress.basket).toEqual(Object.fromEntries(cropIds.map(crop => [crop, 6])));
  // Back in time: a watered plant is rebased (to 0 at the earliest), and that too saves and loads the same.
  step({ type: 'plant', plot: 'praca-1', crop: 'alface', now: 5000 }); step({ type: 'water-plot', plot: 'praca-1', now: 5000 });
  step({ type: 'tick', now: 0 });
  expect(town.progress.plaza['praca-1']).toEqual({ crop: 'alface', stage: 0, since: 0, watered: true });
});
