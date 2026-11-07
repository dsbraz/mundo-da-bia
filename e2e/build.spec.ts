import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
const read = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:v1')!).state);
async function ready(page: Page) { await page.goto('/'); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true'); }
async function home(page: Page) { await page.locator('.home-tray summary').click(); }

test('decora, desfaz, duplica e recupera casas independentes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await ready(page);
  await page.locator('#build-toggle').click();
  await page.locator('#clear-room').click();
  expect((await read(page)).layout.pieces.filter((p: { room: string }) => p.room === 'sala')).toHaveLength(0);
  await page.locator('#undo').click();
  expect((await read(page)).layout.pieces).toHaveLength(10);
  await page.locator('#redo').click();
  await page.getByRole('button', { name: 'Palco Neon', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar Letreiro Palco Neon' }).click();
  await page.locator('#piece-colors button').nth(3).click();
  await page.locator('#flip-piece').click();
  await page.locator('.finish-controls summary').click();
  await page.locator('#finish-wall').selectOption('lilac');
  await page.locator('#finish-floor').selectOption('sky');
  expect((await read(page)).layout.pieces.at(-1)).toMatchObject({ kind: 'neon', color: 'rose', flipped: true });
  await page.screenshot({ path: 'reports/build-neon.png' });
  await home(page);
  await page.locator('#house-name').fill('Estúdio da Bia'); await page.locator('#rename-house').click();
  await page.locator('#copy-house').click();
  await home(page);
  await page.locator('#clear-room').click();
  await home(page);
  await page.locator('#house-list').selectOption('1');
  expect((await read(page)).layout.pieces.at(-1).kind).toBe('neon');
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await home(page);
  await expect(page.locator('#house-name')).toHaveValue('Estúdio da Bia');
  await page.locator('#house-list').selectOption('2');
  expect((await read(page)).layout.pieces.filter((p: { room: string }) => p.room === 'sala')).toHaveLength(0);
  expect(errors).toEqual([]);
});

test('arrasta móveis sem saltar, cancela e volta a brincar com os novos looks', async ({ page }) => {
  await ready(page);
  await page.locator('#build-toggle').click();
  await page.locator('#catalog-toggle').click();
  const box = (await page.locator('canvas').boundingBox())!;
  const xy = (x: number, y: number) => ({ x: box.x + x * box.width / 1000, y: box.y + y * box.height / 600 });
  const from = xy(200, 310); const to = xy(300, 310);
  const before = await read(page);
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.locator('canvas').dispatchEvent('pointercancel', { pointerId: 1 }); await page.mouse.up();
  expect(await read(page)).toEqual(before);
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 8 }); await page.mouse.up();
  expect((await read(page)).layout.pieces.find((p: { kind: string }) => p.kind === 'sofa').x).toBeCloseTo(160, 0);
  await page.locator('#build-toggle').click();
  const actor = xy(520, 390); const seat = xy(250, 405);
  await page.mouse.move(actor.x, actor.y); await page.mouse.down();
  await page.mouse.move(seat.x, seat.y, { steps: 8 }); await page.mouse.up();
  expect((await read(page)).actors[0]).toMatchObject({ seat: 'sofa-left', x: 250, y: 405 });
  await page.locator('.tools-tray summary').click();
  await page.getByRole('button', { name: 'Estrela Neon' }).click();
  expect((await read(page)).actors[0].look).toBe('neon');
  await page.getByRole('button', { name: 'Guardiã Aurora' }).click();
  expect((await read(page)).actors[0].look).toBe('aurora');
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'reports/neon-play.png' });
});

test('começa uma casa vazia, escolhe móveis e preserva o projeto ao recarregar', async ({ page }) => {
  await ready(page); await home(page);
  await page.locator('#new-house').click();
  expect((await read(page)).layout.pieces).toHaveLength(0);
  await page.getByRole('button', { name: 'Adicionar Sofá aconchego' }).click();
  await expect(page.getByRole('button', { name: 'Adicionar Sofá aconchego' })).toBeDisabled();
  await page.getByRole('button', { name: 'Palco Neon', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar Caixa de som' }).click();
  await page.getByRole('button', { name: 'Adicionar Caixa de som' }).click();
  expect((await read(page)).layout.pieces).toHaveLength(3);
  const saved = await read(page);
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  expect(await read(page)).toEqual(saved);
  await page.locator('#build-toggle').click();
  for (const size of [{ width: 768, height: 1024 }, { width: 915, height: 412 }]) {
    await page.setViewportSize(size);
    await expect(page.locator('#undo')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await page.screenshot({ path: `reports/build-${size.width}.png` });
  }
});
