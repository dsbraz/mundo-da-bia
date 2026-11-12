import { expect, test } from '@playwright/test';
import { read, ready, tap } from './helpers';

// W3L-03b: the game is played lying down (landscape). Standing up, a drawing asks to turn the tablet and the game takes no touch;
// turned back, the drawing goes and nothing was lost.
test('em pé a 768×1024 o desenho de girar cobre o jogo e tocar na Bia não faz nada; deitado a 1024×768 ele some, o mesmo toque escolhe a Bia e ela anda', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 }); await ready(page);
  const overlay = page.getByRole('img', { name: 'Gire o tablet' });
  await expect(overlay).toBeVisible();
  const box = (await overlay.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(767); expect(box.height).toBeGreaterThanOrEqual(1023);
  const before = await read(page);
  await tap(page, 520, 440); await page.waitForTimeout(600);
  await expect(page.locator('#app')).not.toHaveClass(/actor-chosen/);
  await expect(page.locator('canvas')).toHaveAttribute('data-walking', '');
  expect(await read(page)).toEqual(before);
  await page.screenshot({ path: 'reports/wave3-life-1a/rotate-768x1024.png' });
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(overlay).toBeHidden();
  await tap(page, 520, 440);
  await expect(page.locator('#app')).toHaveClass(/actor-chosen/);
  await tap(page, 930, 530);
  await expect(page.locator('canvas')).toHaveAttribute('data-walking', 'bia');
});

test('um celular deitado (844×390) joga normalmente, sem o desenho de girar', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 }); await ready(page);
  await expect(page.getByRole('img', { name: 'Gire o tablet' })).toBeHidden();
  await page.getByRole('button', { name: 'Turma' }).click();
  await expect(page.locator('#play-tray')).toBeVisible();
});
