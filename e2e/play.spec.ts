import { expect, test } from '@playwright/test';
import { ready, read, tray, closeTray, drag, tap, onPiece } from './helpers';
test('alimenta humanos e gatos, veste, descansa e preserva ao recarregar', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await ready(page);
  await tray(page, 'Objetos'); await page.getByRole('button', { name: 'Lanche', exact: true }).click(); await closeTray(page);
  await page.getByRole('button', { name: 'Comer', exact: true }).click(); expect((await read(page)).actors[0]!.fed).toBe(true);
  await tray(page, 'Looks'); await page.getByRole('button', { name: 'Festa' }).click();
  await tray(page, 'Turma'); await page.getByRole('button', { name: 'Mimi', exact: true }).click();
  await tray(page, 'Objetos'); await page.getByRole('button', { name: 'Comidinha de gato' }).click(); await closeTray(page);
  await page.getByRole('button', { name: 'Comer', exact: true }).click(); await page.getByRole('button', { name: 'Descansar', exact: true }).click();
  const state = await read(page); expect(state.actors[4]).toMatchObject({ fed: true, resting: true });
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true'); expect(await read(page)).toEqual(state); expect(errors).toEqual([]);
});
test('arraste cancelado preserva posição, teclado move e dados inválidos recuperam', async ({ page }) => {
  await ready(page); const before = await read(page); await drag(page, [520, 420], [550, 430], true); expect(await read(page)).toEqual(before);
  await page.locator('#world').focus(); await page.keyboard.press('ArrowRight'); expect((await read(page)).actors[0]!.x).toBe(540);
  await page.evaluate(() => window.addEventListener('pagehide', () => { localStorage.setItem('mundo-da-bia:neighborhood:v3', '{bad'); localStorage.setItem('mundo-da-bia:neighborhood:v2', '{bad'); localStorage.setItem('mundo-da-bia:neighborhood:v1', '{bad'); localStorage.setItem('mundo-da-bia:v1', '{bad'); localStorage.setItem('mundo-da-bia:houses:v1', '{bad'); }));
  await page.reload(); expect((await read(page)).actors).toHaveLength(7); expect((await read(page)).actors[0]!.x).toBe(520);
});
test('móveis, alimentação e guardar objeto continuam respondendo na cena', async ({ page }) => {
  await ready(page); await drag(page, [520, 420], [150, 405]); expect((await read(page)).actors[0]!.seat).toBe('2.0');
  await drag(page, await onPiece(page, 'fridge', 680, 282), await onPiece(page, 'table', 260, 450)); expect((await read(page)).items[0]!.spot).toBe('table');
  await drag(page, await onPiece(page, 'table', 260, 447), [150, 350]); expect((await read(page)).actors[0]!.fed).toBe(true);
  await drag(page, await onPiece(page, 'fridge', 680, 332), [335, 515]); expect((await read(page)).actors[4]!.fed).toBe(true);
  // Whoever opens the drawer now stands on the floor in front of it, so the teddy is first moved out from under their feet.
  await drag(page, [350, 382], [640, 430]);
  await tap(page, ...await onPiece(page, 'wardrobe', 380, 365)); await expect.poll(async () => (await read(page)).home.drawer, { timeout: 10000 }).toBe(true);
  await drag(page, [640, 430], await onPiece(page, 'wardrobe', 460, 370)); expect((await read(page)).items[3]!.spot).toBe('drawer');
  await tap(page, ...await onPiece(page, 'wardrobe', 320, 390)); await expect.poll(async () => (await read(page)).home.drawer, { timeout: 10000 }).toBe(false);
});
test('microfone e luminária respondem com o anel de ações aberto sobre a personagem', async ({ page }) => {
  // W3L-03: "Recolher ações" is gone; the ring floats above the head and leaves the stage free.
  await ready(page); await tap(page, 520, 420);
  await expect(page.locator('#actions')).toBeVisible(); await expect(page.locator('#context-toggle')).toHaveCount(0);
  const performer = (await read(page)).actors[0]!; await drag(page, [600, 402], [performer.x, performer.y - 140]); expect((await read(page)).show).toBe(true);
  await tap(page, ...await onPiece(page, 'lamp', 60, 200)); await expect.poll(async () => (await read(page)).home.lamp).toBe(false);
});
test('cancelar objeto e arrastar para o chão mantém identidade e quantidade', async ({ page }) => {
  await ready(page); const before = await read(page); await drag(page, [350, 382], [640, 430], true); expect(await read(page)).toEqual(before);
  await drag(page, [350, 382], [640, 430]); const state = await read(page); expect(state.items).toHaveLength(4);
  expect(state.items[3]).toMatchObject({ id: '1:ursinho', holder: null, spot: 'floor' }); expect(state.items[3]!.x).toBeCloseTo(640);
});
test('uma bandeja por vez, teclado, toque e orientações de tablet', async ({ page }) => {
  await ready(page);
  for (const size of [{ width: 1024, height: 768 }, { width: 915, height: 412 }]) {
    await page.setViewportSize(size); await tray(page, 'Looks'); await expect(page.locator('#cast')).toBeHidden();
    await page.keyboard.press('Escape'); await expect(page.locator('#play-tray')).toBeHidden();
    await page.locator('#build-toggle').click(); await tray(page); await expect(page.locator('#play-tray')).toBeHidden();
    await page.locator('#map-toggle').click(); await expect(page.locator('#build-catalog')).toBeHidden(); await page.locator('#close-map').click();
    await page.locator('#play-mode').click(); expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  }
  await page.setViewportSize({ width: 1024, height: 768 }); await page.screenshot({ path: 'reports/atelier-landscape.png' });
});
test('os 16 looks da Bia e roupas arrastadas para outro humano funcionam', async ({ page }) => {
  await ready(page); await tray(page, 'Looks');
  const buttons = page.locator('#looks button');
  for (let index = 0; index < 16; index++) { await buttons.nth(index).click(); await expect(buttons.nth(index)).toHaveAttribute('aria-pressed', 'true'); }
  await buttons.first().scrollIntoViewIfNeeded();
  const source = (await buttons.first().boundingBox())!; const target = await import('./helpers').then(h => h.point(page, 245, 330));
  await page.mouse.move(source.x + 25, source.y + 25); await page.mouse.down(); await page.mouse.move(target.x, target.y, { steps: 10 }); await page.mouse.up();
  expect((await read(page)).actors[1]!.look).toBe('sol');
  await closeTray(page); await page.screenshot({ path: 'reports/atelier-bia.png' });
});
test('o painel tem cinco botões de ícone fixos que não mudam de lugar ao pegar e soltar', async ({ page }) => {
  await ready(page); await tap(page, 520, 420);
  const panel = page.locator('#actions button');
  // W3L-03: the buttons are a ring that follows the chosen character (taking the snack walks her to it); inside the ring each keeps its slot.
  const boxes = async () => { const ring = (await page.locator('#actor-context').boundingBox())!; return Promise.all((await panel.all()).map(async b => { const box = await b.boundingBox(); return box && { ...box, x: box.x - ring.x, y: box.y - ring.y }; })); };
  await expect(panel).toHaveCount(5);
  expect(await panel.allTextContents()).toEqual(['Vestir', 'Jogar', 'Descansar', 'Soltar', 'Comer']);
  for (const button of await panel.all()) await expect(button.locator('img')).toHaveAttribute('src', /\.svg$/);
  await expect(page.locator('#actor-context')).not.toContainText('Pronto para');
  const before = await boxes(); await page.locator('#actor-context').screenshot({ path: 'reports/panel-before.png' });
  await expect(page.getByRole('button', { name: 'Soltar', exact: true })).toBeDisabled();
  await tray(page, 'Objetos'); await page.getByRole('button', { name: 'Lanche', exact: true }).click(); await closeTray(page);
  await expect(page.getByRole('button', { name: 'Comer', exact: true })).toBeEnabled();
  expect(await boxes()).toEqual(before); await page.locator('#actor-context').screenshot({ path: 'reports/panel-holding.png' });
  await page.getByRole('button', { name: 'Soltar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Soltar', exact: true })).toBeDisabled();
  expect(await boxes()).toEqual(before); await page.locator('#actor-context').screenshot({ path: 'reports/panel-after.png' });
});
