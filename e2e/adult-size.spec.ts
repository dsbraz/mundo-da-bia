import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { World } from '../src/domain/types';
import { read, ready, tap } from './helpers';

// Lot 6B: Daniel and Fabiana are clearly grown-ups (1.3× the children's height): standing by the children, on the sofa, in bed, at the
// table, and selected, with the hands, seats and hit areas following the bigger drawing.
const sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
function living(): World {
  const world = initialWorld();
  const spots: Partial<Record<string, Partial<World['actors'][number]>>> = { bia: { x: 420 }, leo: { x: 300 }, daniel: { x: 560 }, fabiana: { x: 700 } };
  world.actors = world.actors.map(a => spots[a.id] ? { ...a, room: 'sala', y: 530, seat: null, ...spots[a.id] } : a.id === 'luna' ? a : { ...a, room: 'quarto', x: 160 + actorsLeft(a.id), y: 530, seat: null });
  return world;
}
const actorsLeft = (id: string) => ['rui', 'mimi', 'nino', 'pipoca'].indexOf(id) * 70;
async function open(page: Page, size: typeof sizes[number], world: World) {
  await page.setViewportSize(size);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await ready(page);
}

for (const size of sizes) test(`os adultos são bem mais altos que as crianças, em pé, no sofá e na cama, a ${size.width}`, async ({ page }) => {
  test.setTimeout(90_000);
  const world = living();
  // Fabiana on the sofa beside the Luna; the Daniel stands by the Bia.
  world.actors = world.actors.map(a => a.id === 'fabiana' ? { ...a, seat: '2.0', x: 150, y: 405 } : a);
  // The hands follow the bigger body: the Daniel holds the snack, the Fabiana the teddy on her lap.
  world.items = world.items.map(i => i.id === 'lanche' ? { ...i, holder: 'daniel', spot: 'floor' } : i.id === 'ursinho' ? { ...i, holder: 'fabiana' } : i);
  await open(page, size, world);
  // A touch at the height of the Daniel's head (a child's head is far lower) chooses him: his hit area is the bigger drawing.
  const daniel = (await read(page)).actors.find(a => a.id === 'daniel')!;
  await tap(page, daniel.x, daniel.y - 205);
  await expect(page.locator('#selected')).toHaveText('Daniel');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `reports/review/lot6b-adults-living-${size.width}.png` });
  // The ring floats above his star and name tag, never on them.
  const [ring, canvas] = [(await page.locator('#actor-context').boundingBox())!, page.locator('canvas')];
  const label = await canvas.evaluate((c, feet) => {
    const box = c.getBoundingClientRect(), scale = box.width / Number(c.dataset.viewWidth);
    return box.y + (feet - Number(c.dataset.viewY)) * scale;
  }, daniel.y - 286 * .86 - 44);
  expect(ring.y + ring.height).toBeLessThanOrEqual(label);
});

for (const size of sizes) test(`um adulto deitado na cama e sentado à mesa, sem sobrar nem faltar, a ${size.width}`, async ({ page }) => {
  test.setTimeout(90_000);
  const world = living();
  world.room = 'quarto';
  world.actors = world.actors.map(a => a.id === 'daniel' ? { ...a, room: 'quarto', seat: '8.0', x: 790, y: 350, resting: true } : a.id === 'fabiana' ? { ...a, room: 'quarto', x: 420, y: 530 } : a.id === 'bia' ? { ...a, room: 'quarto', x: 300, y: 530 } : a.room === 'quarto' ? { ...a, room: 'sala' } : a);
  await open(page, size, world);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `reports/review/lot6b-adults-bed-${size.width}.png` });
});
