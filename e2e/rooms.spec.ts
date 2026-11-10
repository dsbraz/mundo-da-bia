import { expect, test } from '@playwright/test';
import { ready, read, create, drag, visitNeighbor, bringHere } from './helpers';
test('cria por cartão, renomeia e reordena sem transportar personagens', async ({ page }) => {
  await ready(page); await create(page, 'Cozinha'); let state = await read(page);
  expect(state.layout.rooms['room-3']).toMatchObject({ name: 'Cozinha', size: 'medium', cell: 2 }); expect(state.actors[0]!.room).toBe('sala');
  await bringHere(page); expect((await read(page)).actors[0]!.room).toBe('room-3');
  await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Organizar', exact: true }).click(); await page.locator('#room-options summary').click();
  await page.locator('#current-room-name').fill('Café'); await page.locator('#room-rename').click();
  await page.getByRole('button', { name: 'Mover Café antes' }).click(); expect((await read(page)).layout.rooms['room-3']!.cell).toBe(1);
  await page.getByRole('button', { name: 'Ir para Sala & palco' }).click(); expect((await read(page)).actors[0]!.room).toBe('room-3');
  await visitNeighbor(page); expect((await read(page)).room).toBe('room-3'); state = await read(page);
  await page.reload(); expect(await read(page)).toEqual(state);
});
test('arraste não salva a cada movimento; cancelamento não altera o mundo', async ({ page }) => {
  await page.addInitScript(() => { const original = Storage.prototype.setItem; Object.assign(window, { writes: 0 }); Storage.prototype.setItem = function (...args) { (window as unknown as { writes: number }).writes++; return original.apply(this, args); }; });
  await ready(page); const before = await read(page); await page.evaluate(() => Object.assign(window, { writes: 0 }));
  await drag(page, [520, 420], [600, 410], true); expect(await read(page)).toEqual(before);
  expect(await page.evaluate(() => (window as unknown as { writes: number }).writes)).toBe(0);
  await drag(page, [520, 420], [600, 410]); expect(await page.evaluate(() => (window as unknown as { writes: number }).writes)).toBe(1);
});
test('arrastar cartões muda a ordem; segundo toque e cancelamento não duplicam', async ({ page }) => {
  await ready(page); await create(page); await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Organizar', exact: true }).click();
  await page.locator('[data-room="room-3"] > button').first().scrollIntoViewIfNeeded();
  const from = (await page.locator('[data-room="room-3"] > button').first().boundingBox())!;
  const to = (await page.locator('[data-room="quarto"] > button').first().boundingBox())!;
  await page.mouse.move(from.x + 40, from.y + 40); await page.mouse.down(); await page.mouse.move(to.x + 40, to.y + 40, { steps: 8 }); await page.mouse.up();
  expect((await read(page)).layout.rooms['room-3']!.cell).toBe(1); await page.locator('#close-map').click();
  await visitNeighbor(page); const before = await read(page);
  const canvas = page.locator('canvas');
  await canvas.dispatchEvent('pointerdown', { pointerId: 11, clientX: 500, clientY: 450 });
  await canvas.dispatchEvent('pointerdown', { pointerId: 12, clientX: 510, clientY: 450 });
  await canvas.dispatchEvent('pointercancel', { pointerId: 11 });
  await canvas.dispatchEvent('pointerup', { pointerId: 12, clientX: 900, clientY: 450 });
  expect(await read(page)).toEqual(before);
});
