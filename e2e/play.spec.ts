import { expect, test } from '@playwright/test';

test('Beatriz reúne a turma, cuida, troca roupa e monta um show que continua ao recarregar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('#cast img, #objects img')).toHaveCount(11);
  await expect.poll(() => page.locator('#cast img, #objects img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.getByRole('button', { name: 'Lanche', exact: false }).click();
  await page.getByRole('button', { name: 'Oferecer comida' }).click();
  await expect(page.locator('#actor-status')).toContainText('Barriguinha feliz');
  await page.getByRole('button', { name: 'Festa', exact: false }).click();
  await page.getByRole('button', { name: 'Mimi', exact: false }).click();
  await page.getByRole('button', { name: 'Comidinha de gato' }).click();
  await page.getByRole('button', { name: 'Oferecer comida' }).click();
  await page.getByRole('button', { name: 'Descansar' }).click();
  await expect(page.locator('#actor-status')).toContainText('Descansando');
  await page.getByRole('button', { name: 'Quarto dos sonhos' }).click();
  await page.getByRole('button', { name: 'Reunir todo mundo' }).click();
  await page.getByRole('button', { name: 'Sala & palco' }).click();
  await page.getByRole('button', { name: 'Reunir todo mundo' }).click();
  await page.getByRole('button', { name: 'Bia', exact: false }).click();
  await page.getByRole('button', { name: 'Microfone' }).click();
  await page.getByRole('button', { name: 'Começar show' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Encerrar show' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Festa', exact: false })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#actor-status')).toContainText('Microfone');
  await page.getByRole('button', { name: 'Mimi', exact: false }).click();
  await expect(page.locator('#actor-status')).toContainText('Barriguinha feliz · Descansando');
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'reports/tablet.png', fullPage: true });
});

test('arraste cancelado preserva posição e teclado move sem duplicar', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  const point = (x: number, y: number) => ({ clientX: box.x + x * box.width / 1000, clientY: box.y + y * box.height / 600, pointerId: 4, pointerType: 'touch', bubbles: true });
  // Real pointer establishes capture before the cancellation event.
  await page.mouse.move(box.x + 160 * box.width / 1000, box.y + 400 * box.height / 600);
  await page.mouse.down();
  await page.mouse.move(box.x + 350 * box.width / 1000, box.y + 430 * box.height / 600);
  await canvas.dispatchEvent('pointercancel', point(350, 430));
  await page.mouse.move(box.x + 450 * box.width / 1000, box.y + 430 * box.height / 600);
  await page.mouse.up();
  await page.locator('#world').focus();
  await page.keyboard.press('ArrowRight');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:v1')!).state);
  expect(saved.actors).toHaveLength(7);
  expect(saved.actors[0].x).toBeCloseTo(370, 0);
  await page.reload();
  const again = await page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:v1')!).state);
  expect(again).toEqual(saved);
});

test('salvamento inválido recupera a brincadeira inicial', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('mundo-da-bia:v1', '{bad'));
  await page.reload();
  await expect(page.locator('#selected')).toContainText('Bia');
  await page.getByRole('button', { name: 'Reunir todo mundo' }).click();
  await expect(page.locator('#save-status')).toHaveText('✓ Brincadeira salva');
});
