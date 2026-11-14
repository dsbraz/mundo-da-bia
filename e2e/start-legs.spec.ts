import { expect, test } from '@playwright/test';
import { readTown, ready } from './helpers';

// Lot 6B: the review saw the Bia's legs behind the coffee table. A new game, at the three sizes: she stands clear of it, in front.
for (const size of [{ width: 844, height: 390 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }]) test(`no jogo novo as pernas da Bia aparecem inteiras, a ${size.width}`, async ({ page }) => {
  await page.setViewportSize(size);
  await ready(page);
  const town = await readTown(page), bia = town.actors.find(a => a.id === 'bia')!;
  expect(bia).toMatchObject({ x: 520, y: 530, seat: null });
  await page.screenshot({ path: `reports/review/lot6b-start-legs-${size.width}.png` });
});
