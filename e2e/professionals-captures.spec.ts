import { expect, test } from '@playwright/test';
import { proTown, openPro, places, tapStaff } from './pro-helpers';
import { seatAt } from './school-helpers';

// Lot 7 captures for the art review: each professional at work, resting and mid-trade, landscape 1024×768 and 1280×800.
const sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
for (const size of sizes) for (const model of places) test(`lote 7: ${model} a ${size.width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize(size);
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await openPro(page, proTown(model));
  await expect(page.locator('canvas')).toHaveAttribute('data-staff', /:/);
  await page.screenshot({ path: `reports/review/lot7-${model}-${size.width}.png` });
  if (model === 'school') { await seatAt(page, 'bia', 0); await seatAt(page, 'leo', 2); }
  await tapStaff(page);
  await page.clock.runFor(model === 'school' ? 6000 : 900);
  await page.screenshot({ path: `reports/review/lot7-${model}-act-${size.width}.png` });
});
