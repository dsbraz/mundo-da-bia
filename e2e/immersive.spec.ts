import { test, expect } from '@playwright/test';
import { ready, readTown, tray } from './helpers';
test('cena preenche o viewport em paisagem e retrato e os controles recolhem', async ({ page }) => {
  for (const size of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(size); await ready(page);
    const scene = await page.locator('#world').boundingBox();
    expect(scene).toEqual({ x: 0, y: 0, ...size });
    const canvas = (await page.locator('canvas').boundingBox())!;
    expect(canvas.width).toBeGreaterThanOrEqual(size.width - 1); expect(canvas.height).toBeGreaterThanOrEqual(size.height - 1);
    await tray(page, 'Looks');
    await expect(page.getByRole('button', { name: /Homem-Aranha/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Superman/ })).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.locator('#play-tray')).toBeHidden();
    const after = (await page.locator('canvas').boundingBox())!;
    expect(after.width).toBeGreaterThanOrEqual(size.width - 1); expect(after.height).toBeGreaterThanOrEqual(size.height - 1);
    await page.screenshot({ path: `reports/immersive-${size.width}.png` });
  }
});
test('ampliar usa cartões de cômodos com prévia e confirmação', async ({ page }) => {
  await ready(page); await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
  await page.locator('#construct-structure').click();
  await page.getByRole('button', { name: 'Adicionar Cozinha', exact: true }).click();
  const before = await readTown(page);
  await expect(page.getByRole('button', { name: 'Confirmar módulo' })).toBeVisible();
  expect(await readTown(page)).toEqual(before);
  await page.getByRole('button', { name: 'Confirmar módulo' }).click();
  await expect.poll(async () => Object.keys((await readTown(page)).buildings[0]!.layout.rooms).length).toBe(Object.keys(before.buildings[0]!.layout.rooms).length + 1);
});
test('abajur muda de material na cena e preserva a cor ao recarregar', async ({ page }) => {
  await ready(page); await page.locator('#build-toggle').click();
  const target = page.getByRole('button', { name: /Selecionar Abajur/ }); await target.focus(); await page.keyboard.press('Enter');
  const pixel = () => page.evaluate(() => Array.from(document.querySelector('canvas')!.getContext('2d')!.getImageData(110, 400, 1, 1).data));
  const before = await pixel();
  await page.getByRole('button', { name: 'Cor Menta', exact: true }).click();
  await expect.poll(pixel).not.toEqual(before);
  expect((await readTown(page)).buildings[0]!.layout.pieces.find(p => p.kind === 'lamp')!.color).toBe('mint');
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  expect((await readTown(page)).buildings[0]!.layout.pieces.find(p => p.kind === 'lamp')!.color).toBe('mint');
});
test('cômodo maior preserva proporção após recarga', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click(); await page.locator('#add-room').click();
  await page.getByRole('button', { name: 'Criar Livre', exact: true }).click(); await page.getByRole('button', { name: 'Construir cômodo', exact: true }).click();
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  const bounds = (await page.locator('canvas').boundingBox())!; expect(bounds.width / bounds.height).toBeCloseTo(2);
});
test('a frente da cama oculta completamente quem está atrás', async ({ page }) => {
  await ready(page);
  const alpha = await page.evaluate(async () => {
    const path = '/src/presentation/piece-assets.ts'; const { pieceImage } = await import(path);
    const image = new Image(); image.src = pieceImage('bed', 'original', true); await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 425; canvas.height = 275;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0, 425, 275);
    return context.getImageData(210, 240, 1, 1).data[3];
  });
  expect(alpha).toBe(255);
});
