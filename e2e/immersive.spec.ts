import { test, expect } from '@playwright/test';
import { ready, readTown, tray, point } from './helpers';
test('jogo preenche o viewport, separa cena e controles e recolhe as bandejas', async ({ page }) => {
  for (const size of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(size); await ready(page);
    expect(await page.locator('#app').boundingBox()).toEqual({ x: 0, y: 0, ...size });
    const scene = (await page.locator('#world').boundingBox())!;
    // W3L-03: in portrait the strip of faces is below the scene; in landscape the scene takes the width and the Turma button is above it.
    const hint = await page.locator('#play-hint').boundingBox(), turma = (await page.locator('#tray-toggle').boundingBox())!;
    if (hint) expect(Math.max(hint.x - scene.x - scene.width, hint.y - scene.y - scene.height)).toBeGreaterThanOrEqual(0);
    else { expect(turma.y + turma.height).toBeLessThanOrEqual(scene.y); expect(scene.width).toBeGreaterThanOrEqual(size.width * .95); }
    const area = await page.locator('#world').evaluate(n => ({ width: n.clientWidth, height: n.clientHeight }));
    const canvas = (await page.locator('canvas').boundingBox())!;
    expect(canvas.width).toBeGreaterThanOrEqual(area.width - 1); expect(canvas.height).toBeGreaterThanOrEqual(area.height - 1);
    await tray(page, 'Looks');
    await expect(page.getByRole('button', { name: /Homem-Aranha/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Superman/ })).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.locator('#play-tray')).toBeHidden();
    const after = (await page.locator('canvas').boundingBox())!;
    expect(after.width).toBeGreaterThanOrEqual(area.width - 1); expect(after.height).toBeGreaterThanOrEqual(area.height - 1);
    expect(await page.locator('#world').boundingBox()).toEqual(scene);
    await page.screenshot({ path: `reports/immersive-${size.width}.png` });
  }
});
test('ampliar usa cartões de cômodos com prévia e confirmação', async ({ page }) => {
  await ready(page); await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
  await page.locator('#construct-structure').click();
  await page.getByRole('button', { name: 'Adicionar Cozinha', exact: true }).click();
  const before = await readTown(page);
  await expect(page.getByRole('button', { name: 'Construir!' })).toBeVisible();
  expect(await readTown(page)).toEqual(before);
  await page.getByRole('button', { name: 'Construir!' }).click();
  await expect.poll(async () => Object.keys((await readTown(page)).buildings[0]!.layout.rooms).length).toBe(Object.keys(before.buildings[0]!.layout.rooms).length + 1);
});
test('abajur muda de material na cena e preserva a cor ao recarregar', async ({ page }) => {
  await ready(page); await page.locator('#build-toggle').click();
  const target = page.getByRole('button', { name: /Selecionar Abajur/ }); await target.focus(); await page.keyboard.press('Enter');
  await point(page, 58, 238.4); // the closer camera may leave the lamp to the side: pan it into view before sampling
  const pixel = () => page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const x = Math.round((58 - Number(canvas.dataset.viewX)) * 2), y = Math.round((238.4 - Number(canvas.dataset.viewY)) * 2);
    return Array.from(canvas.getContext('2d')!.getImageData(x, y, 1, 1).data);
  });
  const before = await pixel();
  await page.getByRole('button', { name: 'Cor Menta', exact: true }).click();
  await expect.poll(pixel).not.toEqual(before);
  expect((await readTown(page)).buildings[0]!.layout.pieces.find(p => p.kind === 'lamp')!.color).toBe('mint');
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  expect((await readTown(page)).buildings[0]!.layout.pieces.find(p => p.kind === 'lamp')!.color).toBe('mint');
});
test('cômodo maior preserva proporção após recarga', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Organizar', exact: true }).click(); await page.locator('#add-room').click();
  await page.getByRole('button', { name: 'Criar Livre', exact: true }).click(); await page.getByRole('button', { name: 'Construir cômodo', exact: true }).click();
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  const scale = await page.locator('canvas').evaluate(canvas => {
    const box = canvas.getBoundingClientRect();
    return { x: box.width / Number(canvas.dataset.viewWidth), y: box.height / Number(canvas.dataset.viewHeight) };
  });
  expect(scale.x).toBeCloseTo(scale.y);
  await expect(page.locator('canvas')).toHaveAttribute('data-logical-width', '1200');
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
