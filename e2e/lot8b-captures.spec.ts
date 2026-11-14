import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import type { Actor, World } from '../src/domain/types';
import { bringHere, drag, readTown, ready, tap, tray } from './helpers';

// Lot 8B review captures: the grown-ups' redrawn arms (at rest, walking, raised, close up), the parents keeping their clothes from home
// to the office, and Laura beside the Bia and in the Turma drawer.
const sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
const shot = (page: Page, name: string, width: number) => page.screenshot({ path: `reports/review/lot8b-${name}-${width}.png` });
async function start(page: Page, size: typeof sizes[number], town: Neighborhood) {
  await page.setViewportSize(size);
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') });
  await page.addInitScript(value => { localStorage.setItem('mundo-da-bia:autonomy', 'off'); if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(town));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-13T10:01:30'));
}
/** `spots` stand in the living room; everybody else waits in the bedroom. */
function family(spots: Record<string, Partial<Actor>>): World {
  const world = initialWorld();
  world.actors = world.actors.map((a, n) => spots[a.id] ? { ...a, room: 'sala', y: 530, seat: null, ...spots[a.id] } as Actor : { ...a, room: 'quarto', x: 120 + n * 85, y: 530, seat: null });
  return world;
}
const who = async (page: Page, id: string) => (await readTown(page)).actors.find(a => a.id === id)!;
const home = (world: World) => migrateNeighborhood(initialAlbum(world));

for (const size of sizes) test(`lote 8B: os braços dos adultos em pé, andando e para cima, de perto, a ${size.width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page, size, home(family({ bia: { x: 330 }, laura: { x: 470 }, daniel: { x: 630 }, fabiana: { x: 790, look: 'outing' } })));
  await page.clock.runFor(300);
  await shot(page, 'adults-rest', size.width);
  const fabiana = await who(page, 'fabiana'), box = await page.locator('canvas').boundingBox();
  await page.screenshot({ path: `reports/review/lot8b-adults-closeup-${size.width}.png`, clip: { x: box!.x + box!.width * .25, y: box!.y + box!.height * .35, width: box!.width * .55, height: box!.height * .6 } });
  // Daniel takes the sofa; Fabiana dropped on his seat is refused: she shrugs, arms up.
  const daniel = await who(page, 'daniel');
  await drag(page, [daniel.x, daniel.y - 150], [170, 380]);
  await expect.poll(async () => (await who(page, 'daniel')).seat).toBe('2.0');
  await drag(page, [fabiana.x, fabiana.y - 150], [170, 380]);
  await expect(page.locator('.missing-bubble')).toBeVisible();
  await page.clock.runFor(100);
  await shot(page, 'adults-raised', size.width);
});

for (const size of sizes) test(`lote 8B: a Laura andando pela sala, a ${size.width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await start(page, size, home(family({ bia: { x: 330 }, laura: { x: 520 }, fabiana: { x: 800 } })));
  await page.clock.runFor(300);
  await tap(page, 520, 400);
  await expect(page.locator('#actor-context')).toContainText(/Laura/);
  await tap(page, 680, 560);
  // Mid-stride: the clock steps until she walks.
  await expect.poll(async () => { await page.clock.runFor(60); return page.locator('canvas').getAttribute('data-gait'); }).toMatch(/laura:walk/);
  await shot(page, 'adults-walk', size.width);
});

for (const size of sizes) test(`lote 8B: a Laura ao lado da Bia, e na gaveta da Turma, a ${size.width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page, size, home(family({ bia: { x: 440 }, laura: { x: 560 } })));
  await page.clock.runFor(300);
  await shot(page, 'laura-bia', size.width);
  await tray(page, 'Turma');
  await expect(page.locator('#cast').getByRole('button', { name: 'Laura', exact: true })).toBeVisible();
  await shot(page, 'laura-drawer', size.width);
});

/** The family at home, an office on plot 1. */
function workTown(): Neighborhood {
  return neighborhoodAction(home(family({ bia: { x: 330 }, daniel: { x: 560 }, fabiana: { x: 720 } })), { type: 'construct', plot: 1, model: 'office' });
}
/** Takes the selected grown-up to the office's desk room (the selected one goes along). */
async function toOffice(page: Page, id: string) {
  const town = await readTown(page), office = town.buildings.find(b => b.model === 'office')!, desk = Object.values(office.layout.rooms).find(r => r.template === 'office')!;
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: `Ir para ${office.name}`, exact: true }).click();
  await expect.poll(async () => (await who(page, id)).location).toMatchObject({ kind: 'interior', building: office.id });
  await page.locator('#map-toggle').click();
  await page.locator('#room-map').getByRole('button', { name: `Ir para ${desk.name}`, exact: true }).click();
  await bringHere(page);
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
}
for (const size of sizes) test(`lote 8B: pai e mãe com a mesma roupa em casa e no escritório, a ${size.width}`, async ({ page }) => {
  test.setTimeout(120_000);
  await start(page, size, workTown());
  await page.clock.runFor(300);
  await shot(page, 'parents-home', size.width);
  await page.clock.resume();
  const daniel = await who(page, 'daniel');
  await tap(page, daniel.x, daniel.y - 150);
  await expect(page.locator('#selected')).toHaveText('Daniel');
  await toOffice(page, 'daniel');
  await page.waitForTimeout(600);
  expect([(await who(page, 'daniel')).look, (await who(page, 'fabiana')).look]).toEqual(['outing', 'sol']);
  await shot(page, 'parents-office', size.width);
});
