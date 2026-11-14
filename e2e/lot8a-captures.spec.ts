import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { inPassages } from '../src/domain/placement';
import type { BuildingModel, Neighborhood } from '../src/domain/neighborhood-types';
import type { RoomId } from '../src/domain/types';
import { drag, readTown } from './helpers';

// Lot 8A captures for the review, at 1024×768 and 1280×800: rooms without interior doorways (the floor edge's cue), Bia walking off
// that edge, the professional greeting at the arrival room, and the stairwell (ground floor, upper floor, an old save cleaned).
const saveKey = 'mundo-da-bia:neighborhood:v3', sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
const canvas = (page: Page) => page.locator('canvas');
async function open(page: Page, town: Neighborhood, size: typeof sizes[number]) {
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await page.setViewportSize(size);
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, [saveKey, encodeNeighborhood(town)]);
  await page.goto('/'); await expect(canvas(page)).toHaveAttribute('data-ready', 'true');
  await page.clock.runFor(600);
}
const home = () => migrateNeighborhood(initialAlbum(initialWorld()));
const upstairs = () => neighborhoodAction(home(), { type: 'add-floor', building: 1 });
function alone(town: Neighborhood, building: number, room: RoomId, x = 600): Neighborhood {
  const location = { kind: 'interior' as const, building, room };
  return { ...town, location, actors: town.actors.map(a => a.id === 'bia' ? { ...a, location, room, x, y: 530, seat: null } : a) };
}
/** The institution's entry room, where the Map opens it. */
const entry = (model: BuildingModel) => { const town = neighborhoodAction(home(), { type: 'construct', plot: 1, model }); return alone(town, 2, town.buildings[1]!.entry, 400); };
/** A save from before lot 8A: the two-floor house with the sofa (and Luna on it) back in the living room's left corner. */
function oldSofa(): Neighborhood {
  const town = upstairs(), b = town.buildings[0]!, sofa = b.layout.pieces.find(p => p.kind === 'sofa')!, luna = town.actors.find(a => a.id === 'luna')!;
  return { ...town, buildings: [{ ...b, layout: { ...b.layout, pieces: b.layout.pieces.map(p => p === sofa ? { ...p, x: 60, y: 270 } : p) } }],
    actors: town.actors.map(a => a === luna ? { ...a, x: luna.x - sofa.x + 60, y: luna.y - sofa.y + 270 } : a) };
}
/** Each view, and which way it is slid before the capture (the sala to its right edge's cue, the stairwell to the left end). */
const views: [string, () => Neighborhood, number?][] = [['sala', home, 2000], ['quarto', () => alone(home(), 1, 'quarto', 250), -2000],
  ['escola-chegada', () => entry('school')], ['hospital-chegada', () => entry('hospital')],
  ['escada-terreo', upstairs, -2000], ['escada-andar-de-cima', () => alone(upstairs(), 1, 'room-3', 400), -2000], ['escada-save-antigo', oldSofa, -2000]];
for (const size of sizes) for (const [view, town, pan] of views) test(`lote 8A: ${view} a ${size.width}`, async ({ page }) => {
  await open(page, town(), size);
  if (pan) await canvas(page).dispatchEvent('wheel', { deltaX: pan, deltaY: 0 });
  await page.clock.runFor(300);
  await page.screenshot({ path: `reports/review/lot8a-${view}-${size.width}.png` });
  // Nothing stands in the stairwell, also in the old save once loaded.
  const loaded = await readTown(page);
  expect(loaded.buildings.flatMap(b => b.layout.pieces.filter(p => inPassages(b, p) > 0).map(p => `${b.id}:${p.room}:${p.kind}`))).toEqual([]);
});
for (const size of sizes) test(`lote 8A: a Bia saindo pela beirada a ${size.width}`, async ({ page }) => {
  await open(page, home(), size);
  await page.clock.pauseAt(new Date('2026-11-13T09:01:00'));
  await drag(page, [520, 455], [1165, 455]);
  await expect(canvas(page)).toHaveAttribute('data-door', 'edge');
  await page.clock.runFor(100);
  await page.screenshot({ path: `reports/review/lot8a-saindo-pela-beirada-${size.width}.png` });
  await expect.poll(async () => { await page.clock.runFor(100); return (await readTown(page)).location; }).toMatchObject({ room: 'quarto' });
  await page.clock.runFor(350);
  await page.screenshot({ path: `reports/review/lot8a-entrando-pela-beirada-${size.width}.png` });
});
