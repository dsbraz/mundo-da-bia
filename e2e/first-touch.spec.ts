import { expect, test } from '@playwright/test';
import { ready, tap } from './helpers';

test('primeira abertura a 768 px: fileira de retratos, sem parágrafos longos, e a mão-fantasma até o primeiro toque', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 }); await ready(page);
  await expect(page.locator('#first-touch')).toBeVisible();
  await expect(page.locator('#play-hint p')).toHaveCount(0);
  const faces = page.locator('#play-hint button img');
  await expect(faces).toHaveCount(7);
  expect((await faces.first().boundingBox())!.height).toBeGreaterThanOrEqual(64);
  const long = await page.evaluate(() => [...document.querySelectorAll('p')].filter(p => p.checkVisibility())
    .map(p => p.textContent!.trim()).filter(text => text.split(/[.!?](\s|$)/).filter(part => part.trim()).length > 1));
  expect(long).toEqual([]);
  await page.screenshot({ path: 'reports/first-touch-768.png' });
  await tap(page, 500, 520);
  await expect(page.locator('#first-touch')).toHaveCount(0);
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#first-touch')).toHaveCount(0);
});

test('sem armazenamento (navegação privada) o jogo abre normalmente com a mão-fantasma', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
  await ready(page);
  await expect(page.locator('#first-touch')).toBeVisible();
  await page.locator('#play-hint button').nth(1).click();
  await expect(page.locator('#selected')).toHaveText('Luna');
  await expect(page.locator('#first-touch')).toHaveCount(0);
});
