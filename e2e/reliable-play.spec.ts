import { expect, test } from '@playwright/test';
import { ready, tray, closeTray, point, read } from './helpers';
test('selection stays outside the scene while the character walks and stops at the clicked pose', async ({ page }) => {
  await ready(page); await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
  const canvas = (await page.locator('canvas').boundingBox())!, panel = (await page.locator('#actor-context').boundingBox())!;
  expect(panel.y).toBeGreaterThanOrEqual(canvas.y + canvas.height);
  const end = await point(page, 930, 530); await page.mouse.click(end.x, end.y);
  await expect(page.locator('canvas')).toHaveAttribute('data-walking', 'bia');
  await page.keyboard.press('Escape');
  const stopped = (await read(page)).actors[0]!;
  expect(stopped.x).toBeGreaterThanOrEqual(520); expect(stopped.x).toBeLessThan(930);
  await expect(page.locator('canvas')).toHaveAttribute('data-walking', '');
});
test('three modes expose construction separately from decoration', async ({ page }) => {
  await ready(page); await page.locator('#construct-mode').click();
  await expect(page.locator('#construct-mode')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Estrutura modular', exact: true })).toBeVisible();
  await page.locator('#build-toggle').click(); await tray(page);
  await expect(page.locator('#build-catalog')).toBeVisible(); await expect(page.locator('#construction-tray')).toBeHidden();
});
