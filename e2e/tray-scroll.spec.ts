import { expect, test } from '@playwright/test';
import { create, read, ready, tray } from './helpers';
test('sliding a finger up and down over the catalog scrolls the tray instead of grabbing a piece', async ({ page }) => {
  await ready(page); await create(page); await page.locator('#build-toggle').click(); await tray(page, 'Todos');
  const scroller = page.locator('#build-catalog');
  const count = (await read(page)).layout.pieces.length;
  const box = (await page.locator('.catalog-piece:not([hidden])').nth(2).boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 4, y - 160, { steps: 8 }); await page.mouse.up();
  expect(await scroller.evaluate(e => e.scrollTop)).toBeGreaterThan(100);
  expect((await read(page)).layout.pieces).toHaveLength(count);
  await expect(page.locator('.catalog-ghost')).toHaveCount(0);
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 3, y + 120, { steps: 8 }); await page.mouse.up();
  expect(await scroller.evaluate(e => e.scrollTop)).toBeLessThan(100);
  expect((await read(page)).layout.pieces).toHaveLength(count);
});
