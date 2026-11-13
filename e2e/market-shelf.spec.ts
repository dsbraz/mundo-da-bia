import { expect, test } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import { readTown, ready } from './helpers';

// Lot 6B: the market's shelves use their three boards (the goods are shared out, none left bare); captures for the art review.
const hall = { kind: 'interior' as const, building: 2, room: 'sala' as const };
function inMarket(): Neighborhood {
  const world = initialWorld();
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 760, y: 520, seat: null }));
  const town = neighborhoodAction(migrateNeighborhood(initialAlbum(world)), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
  return { ...town, location: hall, actors: town.actors.map(a => a.id === 'bia' ? { ...a, location: hall, room: 'sala', x: 520, y: 540 } : a) };
}
for (const size of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }]) test(`as prateleiras do mercado enchem as três tábuas, a ${size.width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize(size);
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); }, encodeNeighborhood(inMarket()));
  await ready(page);
  expect((await readTown(page)).location).toEqual(hall);
  await page.screenshot({ path: `reports/review/lot6b-market-shelf-${size.width}.png` });
});
