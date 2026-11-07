import { test, expect } from '@playwright/test';
import { ready, tray, closeTray } from './helpers';
test('arte da turma e botões ilustrados carregam sem erros no tablet', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await ready(page);
  await expect(page.locator('#actor-context')).toBeHidden();
  await page.screenshot({ path: 'reports/atelier-refined.png' }); await tray(page, 'Turma');
  await expect(page.locator('#cast img')).toHaveCount(7);
  expect(await page.locator('#cast img').evaluateAll(images => images.every(i => (i as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: 'reports/atelier-cast.png' }); await closeTray(page); expect(errors).toEqual([]);
});
