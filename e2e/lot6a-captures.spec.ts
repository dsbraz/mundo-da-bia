import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { BuildingModel, Neighborhood } from '../src/domain/neighborhood-types';
import type { RoomId } from '../src/domain/types';
import { passages } from '../src/domain/passages';
import { ready } from './helpers';

// Lot 6A captures for the review: the living room with 1 and 2 floors, the room upstairs and two institutions, at 1024×768 and 1280×800.
const saveKey = 'mundo-da-bia:neighborhood:v3', sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
async function open(page: Page, town: Neighborhood, size: typeof sizes[number]) {
  await page.setViewportSize(size);
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, [saveKey, encodeNeighborhood(town)]);
  await ready(page);
  await page.waitForTimeout(400);
}
const home = () => migrateNeighborhood(initialAlbum(initialWorld()));
const upstairs = () => neighborhoodAction(home(), { type: 'add-floor', building: 1 });
/** The Bia alone in `room` of `building`; the others stay where they are. */
function alone(town: Neighborhood, building: number, room: RoomId): Neighborhood {
  const location = { kind: 'interior' as const, building, room };
  return { ...town, location, actors: town.actors.map(a => a.id === 'bia' ? { ...a, location, room, x: 600, y: 530, seat: null } : a) };
}
const institution = (model: BuildingModel, room: RoomId) => alone(neighborhoodAction(home(), { type: 'construct', plot: 1, model }), 2, room);
const views: [string, () => Neighborhood][] = [['sala-1-andar', home], ['sala-2-andares', upstairs], ['andar-de-cima', () => alone(upstairs(), 1, 'room-3')],
  ['hospital-recepcao', () => institution('hospital', 'sala')], ['delegacia-central', () => institution('police', 'quarto')]];
for (const size of sizes) for (const [view, town] of views) test(`lote 6A: ${view} a ${size.width}`, async ({ page }) => {
  await open(page, town(), size);
  await page.screenshot({ path: `reports/review/lot6a-${view}-${size.width}.png` });
  // Every doorway and the stairs (their drawn opening) open either whole in view or wholly out of it, never cut by the edge.
  const data = await page.locator('canvas').evaluate(c => ({ x: Number(c.dataset.viewX), width: Number(c.dataset.viewWidth) }));
  const location = town().location, layout = town().buildings.find(b => location.kind === 'interior' && b.id === location.building)!.layout;
  for (const { box } of passages(layout, location.kind === 'interior' ? location.room : 'sala')) {
    const left = box.x, right = box.x + box.width;
    expect(right <= data.x || left >= data.x + data.width || (left >= data.x && right <= data.x + data.width), `${view}: ${left}-${right} in ${JSON.stringify(data)}`).toBe(true);
  }
});
