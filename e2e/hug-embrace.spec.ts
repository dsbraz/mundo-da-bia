import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { World } from '../src/domain/types';
import { drag, readTown, ready } from './helpers';

// Lot 6B: a hug reads as a hug: the two lean in until their bodies overlap, one arm goes around the other's shoulders, both are happy,
// also with reduced motion; the save keeps only where they stand.
const sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
async function start(page: Page, size: typeof sizes[number], world = initialWorld()) {
  await page.setViewportSize(size);
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') });
  await page.addInitScript(value => { localStorage.setItem('mundo-da-bia:autonomy', 'off'); if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-13T10:01:30'));
}
const canvas = (page: Page) => page.locator('canvas');
const faces = async (page: Page) => Object.fromEntries((await canvas(page).getAttribute('data-faces'))!.split(' ').map(f => f.split(':')));
/** Drags `id` by its body onto the feet of whoever stands at `to`, and checks the embrace that follows. */
async function hug(page: Page, id: string, to: [number, number], other: string) {
  const from = (await readTown(page)).actors.find(a => a.id === id)!;
  await drag(page, [from.x, from.y - 80], [to[0], to[1] - 80]);
  await expect(canvas(page)).toHaveAttribute('data-hug', `${id}:${other}:hug`);
  await expect(canvas(page)).toHaveAttribute('data-embrace', new RegExp(`^${id}:${other}:(\\d+)$`));
  const gap = Number((await canvas(page).getAttribute('data-embrace'))!.split(':')[2]);
  await page.clock.runFor(450);
  return gap;
}

for (const size of sizes) for (const reduced of [false, true]) test(`soltar a Bia no Léo é um abraço de verdade${reduced ? ' (movimento reduzido)' : ''}, a ${size.width}`, async ({ page }) => {
  test.setTimeout(90_000);
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page, size);
  const before = await readTown(page);
  // Their feet stay 70 apart in the save; drawn, their bodies meet (34 apart, a body is about 60 wide).
  expect(await hug(page, 'bia', [420, 530], 'leo')).toBeLessThanOrEqual(40);
  const shown = await faces(page);
  expect(['happy', 'laugh']).toContain(shown.bia); expect(['happy', 'laugh']).toContain(shown.leo);
  await page.screenshot({ path: `reports/review/lot6b-hug-kids-${size.width}${reduced ? '-reduced' : ''}.png` });
  // The hug ends by itself and both stand where the save says.
  await page.clock.runFor(1500);
  await expect(canvas(page)).toHaveAttribute('data-embrace', '');
  const after = await readTown(page);
  expect(after.actors.find(a => a.id === 'leo')).toEqual(before.actors.find(a => a.id === 'leo'));
});

test('abraços com um adulto e com um gato', async ({ page }) => {
  test.setTimeout(120_000);
  const world: World = initialWorld();
  world.actors = world.actors.map(a => a.id === 'fabiana' ? { ...a, room: 'sala', x: 760, y: 530 } : a.id === 'rui' ? { ...a, x: 910 } : a.id === 'mimi' ? { ...a, x: 840 } : a.id === 'nino' ? { ...a, x: 330 } : a);
  await start(page, sizes[0]!, world);
  expect((await readTown(page)).actors.find(a => a.id === 'fabiana')!.room).toBe('sala');
  await hug(page, 'bia', [760, 530], 'fabiana');
  await page.screenshot({ path: 'reports/review/lot6b-hug-adult-1024.png' });
  await page.clock.runFor(1500);
  const mimi = (await readTown(page)).actors.find(a => a.id === 'mimi')!;
  await hug(page, 'bia', [mimi.x, mimi.y], 'mimi');
  await page.screenshot({ path: 'reports/review/lot6b-hug-cat-1024.png' });
});
