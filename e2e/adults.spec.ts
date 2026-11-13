import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { World } from '../src/domain/types';
import { bringHere, drag, read, readTown, ready, tap } from './helpers';
import { playMinutes } from './session';

// W3L-24: the grown-ups, Daniel and Fabiana, beside the Bia in the living room (1.2× her height), and one sitting on the sofa.
const sizes = [{ width: 1024, height: 768 }, { width: 844, height: 390 }];
const spots: Partial<Record<string, number>> = { bia: 470, daniel: 610, fabiana: 750 };
/** The living room with only the Bia and the grown-ups; the others wait in the bedroom. */
function family(): World {
  const world = initialWorld();
  world.actors = world.actors.map(a => spots[a.id] ? { ...a, room: 'sala', x: spots[a.id]!, y: 530, seat: null } : { ...a, room: 'quarto', x: 300, y: 530, seat: null });
  world.actors = world.actors.map((a, n) => a.room === 'quarto' ? { ...a, x: 160 + n * 90 } : a);
  return world;
}
async function open(page: Page, size: typeof sizes[number]) {
  await page.setViewportSize(size);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(family()))));
  await ready(page);
}

/** W3L-25: the family's living room, an office on plot 1 and a market on plot 2. */
function workTown(): Neighborhood {
  const office = neighborhoodAction(migrateNeighborhood(initialAlbum(family())), { type: 'construct', plot: 1, model: 'office' });
  return neighborhoodAction(office, { type: 'construct', plot: 2, model: 'shop', plan: 'market' });
}
test('levar o Daniel ao escritório troca a roupa, e trazê-lo de volta à tarde mostra a sacola paga (W3L-25)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(workTown()));
  await ready(page);
  const daniel = async () => (await readTown(page)).actors.find(a => a.id === 'daniel')!;
  const start = await daniel();
  await tap(page, start.x, start.y - 150);
  await expect(page.locator('#selected')).toHaveText('Daniel');
  const office = (await readTown(page)).buildings.find(b => b.model === 'office')!, desk = Object.values(office.layout.rooms).find(r => r.template === 'office')!;
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: `Ir para ${office.name}`, exact: true }).click();
  await expect.poll(async () => (await daniel()).location).toMatchObject({ kind: 'interior', building: office.id });
  await page.locator('#map-toggle').click();
  await page.locator('#room-map').getByRole('button', { name: `Ir para ${desk.name}`, exact: true }).click();
  await bringHere(page);
  await expect.poll(async () => (await daniel()).look).toBe('office');
  await page.screenshot({ path: 'reports/review/adults-work-office-1024.png' });
  // The afternoon comes (5 min of play), and Daniel goes home: the outing look comes back and he brings groceries.
  await playMinutes(page, 5.5);
  const home = (await readTown(page)).buildings[0]!;
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: `Ir para ${home.name}`, exact: true }).click();
  await expect.poll(async () => (await daniel()).location).toMatchObject({ kind: 'interior', building: home.id });
  await expect.poll(async () => (await readTown(page)).items.find(i => i.holder === 'daniel')).toMatchObject({ kind: 'sacola', paid: true });
  expect((await daniel()).look).toBe('outing');
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
  await page.screenshot({ path: 'reports/review/adults-work-home-1024.png' });
});

for (const size of sizes) test(`os adultos na sala, em pé ao lado da Bia, e o Daniel sentado no sofá a ${size.width}`, async ({ page }) => {
  await open(page, size);
  await page.screenshot({ path: `reports/review/adults-living-room-${size.width}.png` });
  const daniel = (await read(page)).actors.find(a => a.id === 'daniel')!;
  await drag(page, [daniel.x, daniel.y - 150], [170, 380]);
  await expect.poll(async () => (await read(page)).actors.find(a => a.id === 'daniel')).toMatchObject({ seat: '2.0', room: 'sala' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `reports/review/adults-sofa-${size.width}.png` });
});
