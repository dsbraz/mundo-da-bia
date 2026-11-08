import { test, expect } from '@playwright/test';
import { ready, read, swipe, point, tray, closeTray } from './helpers';
test('navegação acompanha o dedo, retorna incompleta e respeita extremos sem levar Bia', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await ready(page); const before = await read(page);
  await swipe(page, 700, 600); expect(await read(page)).toEqual(before);
  await swipe(page, 700, 400); expect((await read(page)).room).toBe('quarto'); expect((await read(page)).actors[0]!.room).toBe('sala');
  await swipe(page, 700, 300); expect((await read(page)).room).toBe('quarto');
  await swipe(page, 300, 700); expect((await read(page)).room).toBe('sala'); await expect(page.locator('#previous-room')).toHaveCount(0);
});
test('transporta personagem com objeto; esperar não salva e cancelar restaura', async ({ page }) => {
  await ready(page); await tray(page, 'Objetos'); await page.getByRole('button', { name: 'Ursinho', exact: true }).click(); await closeTray(page);
  await expect.poll(async () => (await read(page)).items.find(i => i.id === '1:ursinho')!.holder).toBe('bia');
  const before = await read(page); const actor = before.actors[0]!; const a = await point(page, actor.x, actor.y - 170), b = await point(page, 980, 500);
  for (const cancel of [true, false]) {
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 });
    await expect(page.locator('#edge-progress')).toBeVisible(); await expect(page.locator('#edge-progress')).toBeHidden();
    expect(await read(page)).toEqual(before);
    if (cancel) await page.keyboard.press('Escape'); await page.mouse.up();
    if (cancel) expect(await read(page)).toEqual(before);
  }
  const after = await read(page); expect(after.actors[0]!.room).toBe('quarto'); expect(after.items.find(i => i.id === '1:ursinho')!.holder).toBe('bia');
  await page.reload(); expect(await read(page)).toEqual(after);
});
test('objeto solto atravessa preservando identidade e quantidade', async ({ page }) => {
  await ready(page); const a = await point(page, 350, 382), b = await point(page, 980, 480);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 });
  await expect(page.locator('#edge-progress')).toBeVisible(); await expect(page.locator('#edge-progress')).toBeHidden(); await page.mouse.up();
  const state = await read(page); expect(state.room).toBe('quarto'); expect(state.items).toHaveLength(4); expect(state.items.find(i => i.id === '1:ursinho')).toMatchObject({ room: 'quarto', holder: null });
});
