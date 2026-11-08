import { expect, test } from '@playwright/test';
import { ready, readTown, read, tray, closeTray, point, swipe, visitNeighbor } from './helpers';
test('nomeia, veste, sai, constrói, entra, decora, desfaz e recarrega', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await ready(page); await tray(page, 'Turma');
  await page.locator('#cast button').nth(1).click();
  await page.getByRole('textbox', { name: 'Nome do personagem' }).fill('Sol');
  await page.getByRole('button', { name: 'Salvar nome', exact: true }).click();
  await page.locator('#cast button').first().click();
  await tray(page, 'Looks'); await page.getByRole('button', { name: 'Rumi', exact: false }).click();
  await tray(page, 'Objetos'); await page.getByRole('button', { name: 'Ursinho', exact: true }).click(); await closeTray(page);
  await page.getByRole('button', { name: 'Levar pela porta', exact: false }).click();
  await page.getByRole('button', { name: 'Levar para Rua', exact: true }).click();
  expect((await readTown(page)).actors[0]).toMatchObject({ name: 'Sol', look: 'rumi', location: { kind: 'street' } });
  await page.getByRole('button', { name: 'Construir', exact: true }).click();
  await page.getByRole('button', { name: 'Nova casa pronta', exact: true }).click();
  await page.getByRole('button', { name: 'Loja · salão e fundos', exact: false }).click();
  await page.getByRole('button', { name: 'Construir aqui', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar estrutura', exact: true }).click();
  expect((await readTown(page)).buildings).toHaveLength(2);
  await page.locator('#undo').click(); expect((await readTown(page)).buildings).toHaveLength(1);
  await page.locator('#redo').click(); expect((await readTown(page)).buildings).toHaveLength(2);
  await page.locator('#play-mode').click();
  await page.getByRole('button', { name: 'Levar pela porta', exact: false }).click();
  await page.getByRole('button', { name: 'Levar para Loja 2', exact: true }).click();
  await page.locator('#build-toggle').click(); await tray(page, 'Decoração');
  await page.getByRole('button', { name: 'Adicionar Planta', exact: true }).click(); await closeTray(page);
  const count = (await read(page)).layout.pieces.length;
  await page.locator('#undo').click(); expect((await read(page)).layout.pieces).toHaveLength(count - 1);
  await page.locator('#redo').click();
  const town = await readTown(page); expect(town.actors).toHaveLength(7); expect(town.items).toHaveLength(5);
  expect(town.items.find(i => i.holder === 'bia')!.location).toEqual(town.location);
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true'); expect(await readTown(page)).toEqual(town);
  for (const viewport of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(viewport); await page.screenshot({ path: `reports/neighborhood-interior-${viewport.width}.png` });
    await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Visitar a rua', exact: false }).click();
    await page.screenshot({ path: `reports/neighborhood-street-${viewport.width}.png` });
  }
  expect(errors).toEqual([]);
});
test('fundo com um dedo não move seleção; explorar não visita e porta por teclado não transporta', async ({ page }) => {
  await ready(page); const before = await readTown(page);
  const a = await point(page, 700, 50), b = await point(page, 300, 50);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y); await page.mouse.up();
  expect(await readTown(page)).toEqual(before);
  await swipe(page, 700, 300); expect((await readTown(page)).location).toEqual(before.location);
  await visitNeighbor(page); expect((await readTown(page)).location).toMatchObject({ room: 'quarto' });
  await visitNeighbor(page, 'previous');
  await page.getByRole('button', { name: 'Visitar Rua', exact: true }).focus(); await page.keyboard.press('Enter');
  expect((await readTown(page)).location).toEqual({ kind: 'street' }); expect((await readTown(page)).actors).toEqual(before.actors);
});
test('arraste pela porta, câmera da rua e figurinos completos nas duas orientações', async ({ page }) => {
  await ready(page);
  const a = await point(page, 520, 450), b = await point(page, 550, 335);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 4 });
  await expect(page.locator('#edge-progress')).toBeVisible(); await expect(page.locator('#edge-progress')).toBeHidden();
  expect((await readTown(page)).location.kind).toBe('interior'); await page.mouse.up();
  expect((await readTown(page)).actors[0]!.location).toEqual({ kind: 'street' });
  await swipe(page, 700, 300); expect(Number(await page.locator('canvas').getAttribute('data-camera-x'))).toBeGreaterThan(380);
  await swipe(page, 700, 300); expect(Number(await page.locator('canvas').getAttribute('data-camera-x'))).toBeGreaterThan(600);
  for (let i = 0; i < 5; i++) await swipe(page, 700, 300); await expect(page.locator('canvas')).toHaveAttribute('data-camera-x', '1420');
  await page.locator('#map-toggle').click(); await page.locator('#neighborhood-list button').first().click();
  expect((await readTown(page)).location.kind).toBe('interior');
});
for (const viewport of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }]) {
  test(`figurinos completos e bandeja em ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await ready(page); await tray(page, 'Looks');
    for (const name of ['Rumi', 'Mira', 'Zoey']) {
      await page.getByRole('button', { name, exact: false }).click(); await closeTray(page);
      await page.screenshot({ path: `reports/look-${name}-${viewport.width}.png` }); await tray(page, 'Looks');
    }
    await page.getByRole('button', { name: 'Zoey', exact: false }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `reports/look-tray-${viewport.width}.png` });
  });
}
