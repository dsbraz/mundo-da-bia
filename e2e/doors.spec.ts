import { test, expect } from '@playwright/test';
import { ready, read, readTown, swipe, point, tray, closeTray, visitNeighbor } from './helpers';
test('explorar com um dedo não visita nem transporta; navegação explícita respeita o destino', async ({ page }) => {
  await ready(page); const before = await read(page);
  await swipe(page, 700, 300); expect(await read(page)).toEqual(before);
  await visitNeighbor(page); expect((await read(page)).room).toBe('quarto'); expect((await read(page)).actors[0]!.room).toBe('sala');
  await swipe(page, 300, 700); expect((await read(page)).room).toBe('quarto');
  await visitNeighbor(page, 'previous'); expect((await read(page)).room).toBe('sala');
});
test('leva personagem com objeto pela porta ao soltar, sem esperar; cancelar restaura', async ({ page }) => {
  await ready(page); await tray(page, 'Objetos'); await page.getByRole('button', { name: 'Ursinho', exact: true }).click(); await closeTray(page);
  await expect.poll(async () => (await read(page)).items.find(i => i.id === '1:ursinho')!.holder).toBe('bia');
  // Held by the chest, 90 above the feet: the feet reach the "Rua" door's sill (550, 410) when the finger is 90 above it.
  const before = await read(page), town = await readTown(page), actor = before.actors[0]!; const a = await point(page, actor.x, actor.y - 90), b = await point(page, 550, 320);
  for (const cancel of [true, false]) {
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 });
    await expect(page.locator('canvas')).toHaveAttribute('data-door-glow', 'true');
    expect(await readTown(page)).toEqual(town);
    if (cancel) await page.keyboard.press('Escape'); await page.mouse.up();
    if (cancel) { expect(await readTown(page)).toEqual(town); await expect(page.locator('canvas')).toHaveAttribute('data-drop-outcome', 'cancelled:escape'); }
  }
  const after = await readTown(page); expect(after.actors[0]!.location).toEqual({ kind: 'street' }); expect(after.items.find(i => i.id === '1:ursinho')!.holder).toBe('bia');
  await expect(page.locator('canvas')).toHaveAttribute('data-drop-outcome', 'crossed');
  await page.reload(); expect(await readTown(page)).toEqual(after);
});
test('objeto solto atravessa preservando identidade e quantidade', async ({ page }) => {
  await ready(page); const b = await point(page, 980, 480), a = await point(page, 350, 382);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 });
  await expect(page.locator('#edge-progress')).toBeVisible(); await expect(page.locator('#edge-progress')).toBeHidden(); await page.mouse.up();
  const state = await read(page); expect(state.room).toBe('quarto'); expect(state.items).toHaveLength(4); expect(state.items.find(i => i.id === '1:ursinho')).toMatchObject({ room: 'quarto', holder: null });
});
