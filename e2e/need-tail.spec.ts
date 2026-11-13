import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { readTown, ready, tap } from './helpers';
import { playMinutes } from './session';

// Lot 6B: when the thought bubble would sit under the open action ring, it stands beside the head of who thinks it, its tail toward it.
const sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
async function seed(page: Page, size: typeof sizes[number]) {
  await page.setViewportSize(size);
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') });
  await page.addInitScript(value => { localStorage.setItem('mundo-da-bia:autonomy', 'off'); if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(initialWorld()))));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-13T10:01:30'));
}
const thought = (page: Page) => page.locator('.missing-bubble.thought');

for (const size of sizes) test(`ao lado do anel de ações, a cauda da bolha aponta para a cabeça da Bia, a ${size.width}`, async ({ page }) => {
  test.setTimeout(180_000);
  await seed(page, size);
  // 13 min 30 s without eating: hunger is `precisa` (13 min 20 s) and her thought stays up (needs are never saved, so they are played).
  await playMinutes(page, 13.5);
  // Choosing the Bia opens her ring above her head, where her thought would be: the thought stands beside it.
  const bia = (await readTown(page)).actors.find(a => a.id === 'bia')!;
  await tap(page, bia.x, bia.y - 120);
  // While she says her line, the thought waits: the two never cover each other; then it comes back.
  await page.clock.runFor(300);
  await expect(page.locator('canvas')).toHaveAttribute('data-said', /./);
  await expect(thought(page)).toHaveCount(0);
  await page.clock.runFor(5000);
  await expect(thought(page)).toHaveAttribute('data-actor', 'bia');
  const geometry = await page.evaluate(() => {
    const bubble = document.querySelector<HTMLElement>('.missing-bubble.thought')!, box = bubble.getBoundingClientRect(), ring = document.querySelector('#actor-context')!.getBoundingClientRect();
    const near = parseFloat(getComputedStyle(bubble, '::after').left) + 8, far = parseFloat(getComputedStyle(bubble, '::before').left) + 4.5;
    const canvas = document.querySelector('canvas')!, c = canvas.getBoundingClientRect(), scale = c.width / Number(canvas.dataset.viewWidth);
    return { center: box.left + box.width / 2, near: box.left + near, far: box.left + far, ring, box, scale, viewX: Number(canvas.dataset.viewX), left: c.left };
  });
  const head = geometry.left + (bia.x - geometry.viewX) * geometry.scale;
  // Not under the ring: beside her head, level with it, and the tail's circles go from the bubble toward the head, the far one closer.
  const { box, ring } = geometry;
  await page.screenshot({ path: `reports/review/lot6b-need-tail-${size.width}.png` });
  expect(box.right <= ring.left || box.left >= ring.right || box.bottom <= ring.top || box.top >= ring.bottom).toBe(true);
  expect(Math.abs(geometry.center - head)).toBeLessThan(box.width * 1.5);
  // Moved aside, the tail bends back to her; right above her (the ring left room), it simply points down at her. At 1024 the ring is
  // where the thought would be: it stands beside her head.
  if (size.width === 1024) expect(Math.abs(geometry.center - head)).toBeGreaterThan(20);
  if (Math.abs(geometry.center - head) > 20) {
    expect(Math.abs(geometry.near - head)).toBeLessThan(Math.abs(geometry.center - head));
    expect(Math.abs(geometry.far - head)).toBeLessThan(Math.abs(geometry.near - head));
  } else expect(Math.abs(geometry.far - head)).toBeLessThan(12);
});
