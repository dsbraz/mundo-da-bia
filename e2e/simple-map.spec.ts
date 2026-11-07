import { test, expect } from '@playwright/test';
test('cria por imagem sem digitar e entra no cômodo com Bia', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await page.locator('#map-toggle').click();
  await expect(page.locator('#new-room-name')).not.toBeVisible();
  await page.getByRole('button', { name: 'Construir no espaço 3', exact: true }).click();
  await page.getByRole('button', { name: 'Criar Cozinha', exact: true }).click();
  await expect(page.locator('#room-dialog')).not.toBeVisible();
  let state = await page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:v1')!).state);
  expect(state.layout.rooms['room-3']).toMatchObject({ name: 'Cozinha', cell: 2 });
  expect(state.actors[0].room).toBe('room-3');
  await page.locator('#build-toggle').click();
  await page.locator('#map-toggle').click();
  await page.getByRole('button', { name: 'Abrir Cozinha', exact: true }).click();
  await expect(page.locator('#room-dialog')).not.toBeVisible();
  state = await page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:v1')!).state);
  expect(state.actors[0].room).toBe('room-3');
  await page.locator('#map-toggle').click();
  await page.screenshot({ path: 'reports/simple-map.png' });
});
test('piano anima a turma, TV acende e aquário liga com estado salvo', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await page.locator('#map-toggle').click();
  await page.getByRole('button', { name: 'Construir no espaço 3', exact: true }).click();
  await page.getByRole('button', { name: 'Criar Livre', exact: true }).click();
  for (const [index, name] of ['Piano', 'Televisão', 'Aquário'].entries()) {
    await page.getByRole('button', { name: `Adicionar ${name}`, exact: true }).click();
    await page.locator('#catalog-toggle').click();
    const box = (await page.locator('canvas').boundingBox())!;
    const point = (x: number, y: number) => ({ x: box.x + x * box.width / 1200, y: box.y + y * box.height / 600 });
    const start = point(500, 340), end = point([160, 680, 1000][index]!, 340);
    await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 10 }); await page.mouse.up();
    await page.locator('#build-toggle').click();
    await page.mouse.click(end.x, end.y);
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:v1')!).state);
    expect(state.layout.pieces.at(-1).active, name).toBe(true);
    if (index === 0) expect(state.show).toBe(true);
    if (index < 2) { await page.locator('#build-toggle').click(); await page.locator('#catalog-toggle').click(); }
  }
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:v1')!).state);
  expect(state.layout.pieces.slice(-3).every((p: { active: boolean }) => p.active)).toBe(true);
  await page.screenshot({ path: 'reports/playroom.png' });
});
