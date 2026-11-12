import { expect, test } from '@playwright/test';
import { ready, tap, tray } from './helpers';

test('primeira abertura a 1024 px: sem parágrafos longos, e a mão-fantasma até o primeiro toque', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 }); await ready(page);
  await expect(page.locator('#first-touch')).toBeVisible();
  await expect(page.locator('#play-hint p')).toHaveCount(0);
  const long = await page.evaluate(() => [...document.querySelectorAll('p')].filter(p => p.checkVisibility())
    .map(p => p.textContent!.trim()).filter(text => text.split(/[.!?](\s|$)/).filter(part => part.trim()).length > 1));
  expect(long).toEqual([]);
  await page.screenshot({ path: 'reports/first-touch-1024.png' });
  await tap(page, 500, 520);
  await expect(page.locator('#first-touch')).toHaveCount(0);
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#first-touch')).toHaveCount(0);
});

test('sem armazenamento (navegação privada) o jogo abre normalmente com a mão-fantasma', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
  await ready(page);
  await expect(page.locator('#first-touch')).toBeVisible();
  // W3L-03: in landscape the portraits are in the Turma drawer, closed by default (and without storage, it cannot remember).
  await tray(page, 'Turma'); await page.getByRole('button', { name: 'Luna', exact: true }).click();
  await expect(page.locator('#selected')).toHaveText('Luna');
  await expect(page.locator('#first-touch')).toHaveCount(0);
});
