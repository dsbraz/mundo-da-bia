import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { Actor, World } from '../src/domain/types';
import { drag, readTown, ready, tap } from './helpers';

// The grown-ups' arms come out of their sleeves, like the children's: standing, holding something, seated, raised, in a hug, lying
// awake in bed and walking (captures for review beside the children).
const sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
const shot = (page: Page, name: string, width: number) => page.screenshot({ path: `reports/review/adult-arms-${name}-${width}.png` });
async function start(page: Page, size: typeof sizes[number], world: World) {
  await page.setViewportSize(size);
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') });
  await page.addInitScript(value => { localStorage.setItem('mundo-da-bia:autonomy', 'off'); if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-13T10:01:30'));
}
/** `spots` stand in `room` (or lie as given); everybody else waits in the other room. */
function family(room: 'sala' | 'quarto', spots: Record<string, Partial<Actor>>): World {
  const world = initialWorld(), away = room === 'sala' ? 'quarto' : 'sala';
  world.room = room;
  world.actors = world.actors.map((a, n) => spots[a.id] ? { ...a, room, y: 530, seat: null, ...spots[a.id] } as Actor : { ...a, room: away, x: 160 + n * 90, y: 530, seat: null });
  return world;
}
const who = async (page: Page, id: string) => (await readTown(page)).actors.find(a => a.id === id)!;

for (const size of sizes) test(`na sala, os braços dos adultos saem das mangas: em pé, segurando, sentado, para cima e no abraço, a ${size.width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const world = family('sala', { leo: { x: 330 }, bia: { x: 470 }, daniel: { x: 630 }, fabiana: { x: 800 } });
  world.items = world.items.map(i => i.id === 'lanche' ? { ...i, holder: 'fabiana', spot: 'floor' } : i);
  await start(page, size, world);
  await page.clock.runFor(300);
  await shot(page, 'standing', size.width);
  const bia = await who(page, 'bia'), adult = await who(page, 'fabiana');
  await drag(page, [bia.x, bia.y - 80], [adult.x, adult.y - 80]);
  await expect(page.locator('canvas')).toHaveAttribute('data-embrace', /^bia:fabiana:/);
  await page.clock.runFor(450);
  await shot(page, 'hug', size.width);
  await page.clock.runFor(1500);
  const daniel = await who(page, 'daniel');
  await drag(page, [daniel.x, daniel.y - 150], [170, 380]);
  await expect.poll(async () => (await who(page, 'daniel')).seat).toBe('2.0');
  await page.clock.runFor(600);
  await shot(page, 'seated', size.width);
  // Fabiana dropped on Daniel's seat is refused: she shrugs, arms up.
  const fabiana = await who(page, 'fabiana');
  await drag(page, [fabiana.x, fabiana.y - 150], [170, 380]);
  await expect(page.locator('.missing-bubble')).toBeVisible();
  await page.clock.runFor(100);
  await shot(page, 'raised', size.width);
});

for (const size of sizes) test(`no quarto, de manga comprida: o Daniel deitado acordado e a Fabiana andando, a ${size.width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await start(page, size, family('quarto', { leo: { x: 300 }, fabiana: { x: 500, look: 'outing' }, daniel: { x: 790, y: 350, seat: '8.0', look: 'office' } }));
  await page.clock.runFor(800);
  expect(await who(page, 'daniel')).toMatchObject({ seat: '8.0', resting: false });
  await shot(page, 'bed', size.width);
  await tap(page, 500, 400);
  await expect(page.locator('#actor-context')).toContainText(/Fabiana/);
  await tap(page, 250, 600);
  await page.clock.runFor(400);
  await expect(page.locator('canvas')).toHaveAttribute('data-gait', /fabiana:walk/);
  await shot(page, 'walk', size.width);
});
