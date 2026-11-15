import { expect, test, type Page } from '@playwright/test';
import { initialWorld, transition } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { World } from '../src/domain/types';
import { closeTray, readTown, ready, tray } from './helpers';
import { playMinutes } from './session';

// Lot 6B: one dish shared by two people seated at the same table: one plate on the table, both eat, both stop being hungry.
const sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
/** The living room with a picnic table where the coffee table was, Bia and Léo seated at it, the Bia holding pancakes. */
function atTable(): World {
  let world = initialWorld();
  world.layout = { ...world.layout, pieces: [...world.layout.pieces.filter(p => p.kind !== 'table'), { id: 90, kind: 'picnic-table', room: 'sala', x: 330, y: 340, color: 'original', flipped: false }], nextId: 91 };
  world = transition(transition(world, { type: 'sit', actor: 'bia', seat: '90.1' }).state, { type: 'sit', actor: 'leo', seat: '90.2' }).state;
  return world;
}
const faces = async (page: Page) => Object.fromEntries((await page.locator('canvas').getAttribute('data-faces'))!.split(' ').map(f => f.split(':')));

for (const size of sizes) test(`um prato, dois à mesa: os dois comem e matam a fome, a ${size.width}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(size);
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') });
  const town = migrateNeighborhood(initialAlbum(atTable())), bia = town.actors.find(a => a.id === 'bia')!;
  const dish = { id: '20:prato' as const, kind: 'prato' as const, recipe: 'panqueca', room: 'sala' as const, location: bia.location, x: bia.x, y: bia.y, holder: 'bia' as const, spot: 'floor' as const };
  await page.addInitScript(value => { localStorage.setItem('mundo-da-bia:autonomy', 'off'); if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood({ ...town, nextItem: 21, items: [...town.items, dish] }));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-13T10:01:30'));
  // Without eating, both ask for food at 14 min (hunger +1.5/min: Léo from 5 min 20 s, the Bia from 6 min 40 s), and neither face is
  // happy (lot 8E: the hungry face itself only comes at 25 min, when sitting still has already bored them).
  await playMinutes(page, 14);
  expect(await faces(page)).not.toMatchObject({ bia: 'happy' });
  expect(await faces(page)).not.toMatchObject({ leo: 'happy' });
  await tray(page); await page.locator('#cast [data-actor=bia]').click(); await closeTray(page);
  await page.getByRole('button', { name: 'Comer', exact: true }).click();
  await page.clock.runFor(1200);
  await expect(page.locator('canvas')).toHaveAttribute('data-meal-actor', 'bia');
  await expect(page.locator('canvas')).toHaveAttribute('data-meal-on', 'table');
  await page.screenshot({ path: `reports/review/lot6b-shared-plate-${size.width}.png` });
  // Only one plate: when it is empty both answer, happy.
  for (let t = 0; t < 4000 && await page.locator('canvas').getAttribute('data-meal') !== 'done'; t += 200) await page.clock.runFor(200);
  await expect(page.locator('canvas')).toHaveAttribute('data-meal', 'done');
  await page.clock.runFor(400);
  expect(await faces(page)).toMatchObject({ bia: 'happy', leo: 'happy' });
  expect((await readTown(page)).items.some(i => i.kind === 'prato')).toBe(false);
  await page.screenshot({ path: `reports/review/lot6b-shared-plate-after-${size.width}.png` });
});
