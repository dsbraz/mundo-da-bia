import { expect, test } from '@playwright/test';
import { ready, read, tray, closeTray, clear, drag, create, choice } from './helpers';
test('esvaziar exige confirmação, desfaz, refaz, colore e duplica casas independentes', async ({ page }) => {
  await ready(page); const original = await read(page); await page.locator('#build-toggle').click();
  await page.locator('#map-toggle').click(); await page.locator('#room-options summary').click(); await page.locator('#clear-room').click();
  expect(await read(page)).toEqual(original); await page.locator('#cancel-clear').click();
  await clear(page); expect((await read(page)).layout.pieces.filter(p => p.room === 'sala')).toHaveLength(0);
  await page.locator('#undo').click(); expect((await read(page)).layout.pieces).toEqual(original.layout.pieces); await page.locator('#redo').click();
  await tray(page, 'Decoração'); await choice(page, '#collection-filter', 'neon');
  await page.getByRole('button', { name: 'Adicionar Letreiro Palco Neon' }).click(); await closeTray(page);
  await page.locator('#piece-colors button').nth(3).click(); await page.locator('#flip-piece').click();
  expect((await read(page)).layout.pieces.at(-1)).toMatchObject({ kind: 'neon', color: 'rose', flipped: true });
  await tray(page, 'Acabamentos'); await choice(page, '#finish-wall', 'lilac'); await choice(page, '#finish-floor', 'sky');
  await page.locator('#map-toggle').click(); await page.getByText('Minhas casas', { exact: true }).click();
  await page.locator('#house-name').fill('Estúdio da Bia'); await page.locator('#rename-house').click(); await page.locator('#copy-house').click(); await page.locator('#close-map').click();
  await clear(page); await page.locator('#map-toggle').click(); await choice(page, '#house-list', '1');
  expect((await read(page)).layout.pieces.at(-1)!.kind).toBe('neon'); await choice(page, '#house-list', '2');
  expect((await read(page)).layout.pieces.filter(p => p.room === 'sala')).toHaveLength(0);
});
test('mover móveis não navega nem ativa brincadeiras; teclado, cancelar e guardar', async ({ page }) => {
  await ready(page); await page.locator('#build-toggle').click(); await clear(page); await tray(page); await page.getByRole('button', { name: 'Adicionar Sofá aconchego', exact: true }).click(); await closeTray(page); const before = await read(page);
  const sofa = before.layout.pieces.find(p => p.kind === 'sofa')!; const from: [number, number] = [sofa.x + 100, sofa.y + 60], to: [number, number] = [sofa.x + 120, sofa.y + 60];
  await drag(page, from, to, true); expect(await read(page)).toEqual(before);
  await drag(page, from, to); expect((await read(page)).layout.pieces.find(p => p.kind === 'sofa')!.x).toBeCloseTo(sofa.x + 20);
  expect((await read(page)).room).toBe('sala'); await page.locator('#world').focus(); await page.keyboard.press('ArrowRight');
  expect((await read(page)).layout.pieces.find(p => p.kind === 'sofa')!.x).toBeCloseTo(sofa.x + 40);
  await page.locator('#remove-piece').click(); expect((await read(page)).layout.pieces.some(p => p.kind === 'sofa')).toBe(false);
  await page.locator('#undo').click(); expect((await read(page)).layout.pieces.some(p => p.kind === 'sofa')).toBe(true);
});
test('catálogo adiciona por arraste e teclado sem duplicar e salva', async ({ page }) => {
  await ready(page); await create(page); await page.locator('#build-toggle').click(); await tray(page, 'Decoração');
  const button = page.getByRole('button', { name: 'Adicionar Planta', exact: true }); const start = (await button.boundingBox())!;
  const canvas = (await page.locator('canvas').boundingBox())!; const count = (await read(page)).layout.pieces.length;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2); await page.mouse.down();
  await page.mouse.move(canvas.x + canvas.width * .4, canvas.y + canvas.height * .5, { steps: 10 }); await page.mouse.up();
  expect((await read(page)).layout.pieces).toHaveLength(count + 1); await button.focus(); await page.keyboard.press('Enter');
  expect((await read(page)).layout.pieces).toHaveLength(count + 2); const state = await read(page);
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true'); expect(await read(page)).toEqual(state);
});
test('Escape cancela catálogo sem adicionar; teclado seleciona e move móveis existentes', async ({ page }) => {
  await ready(page); await page.locator('#build-toggle').click(); await tray(page, 'Decoração');
  const count = (await read(page)).layout.pieces.length; const button = page.getByRole('button', { name: 'Adicionar Planta', exact: true });
  const box = (await button.boundingBox())!; await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.mouse.move(400, 400, { steps: 8 });
  await page.keyboard.press('Escape'); await page.mouse.up(); expect((await read(page)).layout.pieces).toHaveLength(count);
  await clear(page); await tray(page, 'Móveis'); await page.getByRole('button', { name: 'Adicionar Sofá aconchego', exact: true }).click(); await closeTray(page);
  const target = page.getByRole('button', { name: 'Selecionar Sofá aconchego', exact: true }); await target.focus(); await page.keyboard.press('Enter');
  const before = (await read(page)).layout.pieces.find(p => p.kind === 'sofa')!.x; await page.keyboard.press('ArrowRight');
  expect((await read(page)).layout.pieces.find(p => p.kind === 'sofa')!.x).toBe(before + 20);
});
