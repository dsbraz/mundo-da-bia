import { test, expect } from '@playwright/test';
import { ready, read, create, tray, closeTray, tap } from './helpers';
test('piano, televisão e aquário mantêm brincadeiras e persistência', async ({ page }) => {
  await ready(page); await create(page); await tray(page, 'Turma'); await page.locator('#bring-here').click(); await closeTray(page);
  for (const [index, name] of ['Piano', 'Televisão', 'Aquário'].entries()) {
    await page.locator('#build-toggle').click(); await tray(page, 'Todos'); await page.getByRole('button', { name: `Adicionar ${name}`, exact: true }).click(); await closeTray(page);
    const piece = (await read(page)).layout.pieces.at(-1)!;
    await page.locator('#play-mode').click();
    if (index === 2) { await page.getByRole('button', { name: 'Usar Aquário', exact: true }).focus(); await page.keyboard.press('Enter'); }
    else await tap(page, piece.x + 50, piece.y + 50);
    await expect.poll(async () => (await read(page)).layout.pieces.at(-1)!.active, { message: name }).toBe(true);
    if (index === 0) expect((await read(page)).show).toBe(true);
    await page.locator('#build-toggle').click(); await tap(page, piece.x + 50, piece.y + 50); await page.locator('#remove-piece').click();
  }
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
});
test('ideias são opcionais e salvam uma versão independente', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Ideias', exact: true }).click(); await page.locator('#project-cards button').first().click(); await page.locator('#save-project').click();
  await page.getByRole('button', { name: 'Organizar', exact: true }).click(); await expect(page.locator('#house-list option')).toHaveCount(2);
  await page.screenshot({ path: 'reports/atelier-home.png' });
});
