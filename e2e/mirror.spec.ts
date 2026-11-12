import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { glassOf } from '../src/presentation/mirror-reflection';
import type { Piece, World } from '../src/domain/types';
import { onPiece, point, read, ready, tap } from './helpers';

const mirrorAt = (x: number): Piece => ({ id: 100, kind: 'mirror', room: 'sala', x, y: 130, color: 'original', flipped: false });
/** The living room with a mirror on the wall at `x` and Bia alone across the room (v3 save), at `width` × `height`. */
async function room(page: Page, mirror: Piece, width: number, height: number) {
  const world: World = initialWorld();
  world.layout = { ...world.layout, pieces: [...world.layout.pieces.filter(p => p.room !== 'sala'), mirror], nextId: 101 };
  const start = mirror.x > 500 ? 200 : 800;
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: a.id === 'bia' ? start : 500, y: 520, seat: null }));
  world.items = world.items.map(i => ({ ...i, room: 'quarto', spot: 'floor', x: 500, y: 520 }));
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await page.setViewportSize({ width, height }); await ready(page);
}
const canvas = (page: Page) => page.locator('canvas');
const cases = [
  { side: 'esquerda', x: 380, width: 1024, height: 768, reduced: false }, { side: 'esquerda', x: 380, width: 1024, height: 768, reduced: true },
  { side: 'direita', x: 760, width: 1024, height: 768, reduced: false }, { side: 'direita', x: 760, width: 844, height: 390, reduced: false },
];

for (const { side, x, width, height, reduced } of cases) test(`tocar no espelho à ${side} (${width}): a Bia vai até ele, faz careta, os Looks abrem na hora e o reflexo espelhado troca junto para chef${reduced ? ' (movimento reduzido: reflexo parado)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  const mirror = mirrorAt(x);
  await room(page, mirror, width, height);
  const look = (await read(page)).actors.find(a => a.id === 'bia')!.look;
  await tap(page, ...await onPiece(page, 'mirror', x + 50, 200));
  await expect(page.locator('#looks')).toBeVisible();
  await expect(canvas(page)).toHaveAttribute('data-reflection', `bia:${look}:-1`, { timeout: 15000 });
  // At the mirror she pulls her face (a poke with no line), after the use repainted the scene.
  await expect(canvas(page)).toHaveAttribute('data-reaction', 'bia:');
  // The reflection shows as her figure walks past; the save holds her place once she has arrived.
  await expect.poll(async () => Math.abs((await read(page)).actors.find(a => a.id === 'bia')!.x - (x + 50))).toBeLessThanOrEqual(110);
  const bia = (await read(page)).actors.find(a => a.id === 'bia')!;
  // The open tray leaves the mirror and her in view.
  const tray = (await page.locator('.mode-tray:not([hidden])').boundingBox())!, glass = glassOf(mirror);
  await expect.poll(async () => (await point(page, glass.x + glass.width, glass.y)).x).toBeLessThan(tray.x);
  expect((await point(page, bia.x + 40, bia.y)).x).toBeLessThan(tray.x);
  expect((await point(page, Math.min(glass.x, bia.x - 40), glass.y)).x).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Chef de cozinha', exact: true }).click();
  await expect.poll(async () => (await read(page)).actors.find(a => a.id === 'bia')!.look).toBe('chef');
  await expect(canvas(page)).toHaveAttribute('data-reflection', 'bia:chef:-1');
  if (!reduced) {
    await page.waitForTimeout(1200);
    expect(Number(await canvas(page).getAttribute('data-mirror-cost'))).toBeLessThan(1);
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: `reports/wave3-life-1b/mirror-chef-${side}-${width}${reduced ? '-reduced' : ''}.png` });
});
