import { expect, test } from '@playwright/test';
import { ready, tray, closeTray, point, read } from './helpers';
test('selection uses external controls while the character walks and stops at the clicked pose', async ({ page }) => {
  await ready(page); await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
  // W3L-03: the actions are a ring inside the scene, beside her; while she walks it steps aside and comes back when she stops.
  const scene = (await page.locator('#world').boundingBox())!, panel = (await page.locator('#actor-context').boundingBox())!;
  expect(panel.x).toBeGreaterThanOrEqual(scene.x); expect(panel.x + panel.width).toBeLessThanOrEqual(scene.x + scene.width);
  expect(panel.y).toBeGreaterThanOrEqual(scene.y); expect(panel.y + panel.height).toBeLessThanOrEqual(scene.y + scene.height);
  const end = await point(page, 930, 530); await page.mouse.click(end.x, end.y);
  await expect(page.locator('canvas')).toHaveAttribute('data-walking', 'bia');
  await expect(page.locator('#actor-context')).toBeHidden();
  await page.keyboard.press('Escape');
  const stopped = (await read(page)).actors[0]!;
  expect(stopped.x).toBeGreaterThanOrEqual(520); expect(stopped.x).toBeLessThan(930);
  await expect(page.locator('canvas')).toHaveAttribute('data-walking', '');
  await expect(page.locator('#actor-context')).toBeVisible();
});
test('three modes expose construction separately from decoration', async ({ page }) => {
  await ready(page); await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
  await expect(page.locator('#construct-mode')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#tray-toggle')).toHaveText('Casas e cômodos');
  await expect(page.locator('#announcement')).toContainText('Casas prontas');
  await expect(page.getByRole('button', { name: 'Adicionar cômodo ou andar', exact: true })).toBeVisible();
  await page.locator('#build-toggle').click(); await tray(page);
  await expect(page.locator('#tray-toggle')).toHaveText('Móveis e cores');
  await expect(page.locator('#announcement')).toContainText('Hora de arrumar');
  await expect(page.locator('#build-catalog')).toBeVisible(); await expect(page.locator('#construction-tray')).toBeHidden();
});
