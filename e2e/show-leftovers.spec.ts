import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { World } from '../src/domain/types';
import { read, readTown, ready, tap } from './helpers';

// Lot 6B: the show's sign is drawn (notes, no text); the piano follows the show (it stops when the show ends, and one touch starts a new
// one); leaving the house during a show ends it, so coming back never replays the dance.
const sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
/** The living room with a piano (id 900) where the wardrobe was. */
function withPiano(): World {
  const world = initialWorld();
  world.layout = { ...world.layout, nextId: 901, pieces: [...world.layout.pieces.filter(p => p.kind !== 'wardrobe'), { id: 900, kind: 'piano', room: 'sala', x: 300, y: 235, color: 'original', flipped: false }] };
  return world;
}
async function open(page: Page, size: typeof sizes[number]) {
  await page.setViewportSize(size);
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(withPiano()))));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-13T10:00:30'));
}
const piano = async (page: Page) => (await read(page)).layout.pieces.find(p => p.id === 900)!;
const faces = async (page: Page) => (await page.locator('canvas').getAttribute('data-faces')) ?? '';
async function playPiano(page: Page) {
  await tap(page, 410, 300);
  for (let t = 0; t < 8000 && !(await read(page)).show; t += 100) await page.clock.runFor(100);
  expect((await read(page)).show).toBe(true);
  expect((await piano(page)).active).toBe(true);
}

for (const size of sizes) test(`o show tem notas desenhadas, o piano acompanha o show e um toque começa outro, a ${size.width}`, async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, size);
  await playPiano(page);
  await page.clock.runFor(300);
  await expect(page.locator('canvas')).toHaveAttribute('data-live', 'notes');
  await page.screenshot({ path: `reports/review/lot6b-show-notes-${size.width}.png` });
  // The show ends by itself: the piano stops with it and the sign goes.
  await page.clock.fastForward(12_000); await page.clock.runFor(200);
  expect((await read(page)).show).toBe(false);
  expect((await piano(page)).active).toBe(false);
  await expect(page.locator('canvas')).not.toHaveAttribute('data-live', 'notes');
  await page.screenshot({ path: `reports/review/lot6b-show-piano-quiet-${size.width}.png` });
  // One touch on the piano is a new show.
  await playPiano(page);
});

test('sair de casa durante o show e voltar: ninguém dança de novo e o piano está parado', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, sizes[0]!);
  await playPiano(page);
  await page.locator('#map-toggle').click();
  await page.locator('#go-street').click();
  for (let t = 0; t < 8000 && (await readTown(page)).location.kind !== 'street'; t += 100) await page.clock.runFor(100);
  const home = (await readTown(page)).buildings[0]!;
  expect([home.show, home.layout.pieces.find(p => p.id === 900)!.active]).toEqual([false, false]);
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: `Ir para ${home.name}`, exact: true }).click();
  for (let t = 0; t < 8000 && (await readTown(page)).location.kind !== 'interior'; t += 100) await page.clock.runFor(100);
  await page.clock.runFor(1500);
  expect((await read(page)).show).toBe(false);
  expect(await faces(page)).not.toContain('laugh');
  await expect(page.locator('canvas')).not.toHaveAttribute('data-live', 'notes');
});
