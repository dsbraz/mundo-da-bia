import { expect, test } from '@playwright/test';
import { ready } from './helpers';

const save = 'mundo-da-bia:neighborhood:v3';
test('com relógio falso, 30 s despacham um tick e voltar à aba despacha outro, sem mudar o save', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T15:00:00') });
  await ready(page);
  const before = await page.evaluate(key => localStorage.getItem(key), save);
  // Less than 30 s have passed since the page opened, so no tick yet; jumping 30 s (timers only, no frame by frame) gives exactly one.
  await expect(page.locator('#app')).not.toHaveAttribute('data-ticks');
  await page.clock.fastForward(30_000);
  await expect(page.locator('#app')).toHaveAttribute('data-ticks', '1');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('#app')).toHaveAttribute('data-ticks', '2');
  expect(await page.evaluate(key => localStorage.getItem(key), save)).toBe(before);
});
