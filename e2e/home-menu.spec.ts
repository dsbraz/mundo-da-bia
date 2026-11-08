import { test, expect } from '@playwright/test';
import { ready, readTown } from './helpers';

test('Minha casa abre mapa limpo, separa organização e permite excluir com confirmação', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click();
  await expect(page.getByRole('button', { name: 'Visitar Sala & palco', exact: true })).toBeVisible();
  await expect(page.locator('#rename-house')).toBeHidden();
  await page.screenshot({ path: 'reports/home-map-landscape.png' });
  await expect(page.getByRole('button', { name: 'Mover Quarto dos sonhos antes', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Organizar', exact: true }).click();
  await expect(page.locator('#rename-house')).toBeVisible();
  await page.screenshot({ path: 'reports/home-organize.png' });
  await page.locator('#copy-house').click();
  await expect.poll(async () => (await readTown(page)).buildings.length).toBe(2);
  await page.getByRole('button', { name: 'Excluir casa…', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Excluir Minha casa · cópia?' })).toBeVisible();
  await page.getByRole('button', { name: 'Manter casa', exact: true }).click();
  await expect.poll(async () => (await readTown(page)).buildings.length).toBe(2);
  await page.getByRole('button', { name: 'Excluir casa…', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir esta casa', exact: true }).click();
  await expect.poll(async () => (await readTown(page)).buildings.length).toBe(1);
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  expect((await readTown(page)).buildings).toHaveLength(1);
  await page.locator('#map-toggle').click();
  await expect(page.getByRole('button', { name: 'Lugares', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

for (const width of [390, 768]) test(`mapa cabe em retrato ${width} e visita sem reorganizar`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1024 }); await ready(page); await page.locator('#map-toggle').click();
  await page.screenshot({ path: `reports/home-map-${width}.png` });
  expect(await page.locator('#room-dialog').evaluate(n => n.scrollWidth <= n.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'Visitar Quarto dos sonhos', exact: true }).click();
  await expect(page.locator('#room-dialog')).not.toBeVisible();
  expect((await readTown(page)).location).toMatchObject({ room: 'quarto' });
});

test('mapa vem antes do bairro e cancelar ampliação devolve o foco', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click();
  const map = (await page.locator('#room-map').boundingBox())!;
  const neighborhood = (await page.locator('#neighborhood-list').boundingBox())!;
  expect(map.y).toBeLessThan(neighborhood.y);
  await page.locator('#add-room').click(); await page.locator('#cancel-room-choice').click();
  await expect(page.locator('#add-room')).toBeFocused();
});

test('muda casa para terreno vazio e troca com outra casa sem perder conteúdo', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Organizar', exact: true }).click();
  await page.locator('#copy-house').click(); const before = await readTown(page);
  await expect(page.getByRole('button', { name: 'Mudar de terreno', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mudar de terreno', exact: true }).click();
  await page.getByRole('button', { name: 'Terreno 3 · vazio', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar mudança', exact: true }).click();
  expect(await readTown(page)).toEqual(before);
  await page.getByRole('button', { name: 'Terreno 3 · vazio', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar mudança', exact: true }).click();
  expect((await readTown(page)).buildings[1]!.plot).toBe(2);
  await page.getByRole('button', { name: 'Mudar de terreno', exact: true }).click();
  await page.getByRole('button', { name: 'Terreno 1 · Minha casa', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Trocar Minha casa · cópia com Minha casa?' })).toBeVisible();
  await page.screenshot({ path: 'reports/home-move-preview.png' });
  await page.getByRole('button', { name: 'Confirmar mudança', exact: true }).click();
  const after = await readTown(page);
  expect(after.buildings.map(b => b.plot)).toEqual([2, 0]);
  expect({ ...after, buildings: before.buildings }).toEqual(before);
  expect(after.buildings.map(({ plot: _plot, ...b }) => b)).toEqual(before.buildings.map(({ plot: _plot, ...b }) => b));
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true'); expect(await readTown(page)).toEqual(after);
});

test('cancelar arraste em Organizar não bloqueia a próxima visita no Mapa', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click();
  await page.getByRole('button', { name: 'Organizar', exact: true }).click();
  const card = page.getByRole('button', { name: 'Visitar Quarto dos sonhos', exact: true });
  await card.scrollIntoViewIfNeeded(); const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 35); await page.mouse.down(); await page.mouse.move(box.x + 50, box.y + 35);
  await card.dispatchEvent('pointercancel', { pointerId: 1 }); await page.mouse.up();
  await page.getByRole('button', { name: 'Lugares', exact: true }).click(); await card.click();
  await expect(page.locator('#room-dialog')).not.toBeVisible();
  expect((await readTown(page)).location).toMatchObject({ room: 'quarto' });
});
