import { expect, test } from '@playwright/test';
import { ready, tray, closeTray, readTown } from './helpers';
import { neighborhoodAction } from '../src/domain/neighborhood';

for (const viewport of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }]) {
  test(`controles ficam fora da cena e no mesmo lugar ao trocar a seleção ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport); await ready(page);
    const initialScene = (await page.locator('#world').boundingBox())!;
    const hint = (await page.locator('#play-hint').boundingBox())!;
    expect(Math.max(hint.x - initialScene.x - initialScene.width, hint.y - initialScene.y - initialScene.height)).toBeGreaterThanOrEqual(0);
    await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
    const panel = page.locator('#actor-context');
    const bounds = async () => ({ panel: (await panel.boundingBox())!, scene: (await page.locator('#world').boundingBox())! });
    await expect.poll(async () => { const b = await bounds(); return Math.max(b.panel.y - b.scene.y - b.scene.height, b.panel.x - b.scene.x - b.scene.width); }).toBeGreaterThanOrEqual(0);
    expect((await bounds()).scene).toEqual(initialScene);
    const before = (await bounds()).panel;
    await tray(page, 'Turma'); await page.getByRole('button', { name: 'Rui', exact: true }).click(); await closeTray(page);
    expect((await bounds()).panel.x).toBe(before.x); expect((await bounds()).panel.y).toBe(before.y);
    await tray(page);
    const scene = (await page.locator('#world').boundingBox())!, choices = (await page.locator('#play-tray').boundingBox())!;
    expect(Math.max(choices.y - scene.y - scene.height, choices.x - scene.x - scene.width)).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: `reports/ui-dock-${viewport.width}.png` });
  });
}

test('mapa oferece ações da casa sem procurar em Organizar', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click();
  await page.getByRole('button', { name: 'Ações de Minha casa: ampliar, mover e excluir', exact: true }).click();
  const dialog = page.locator('#plot-dialog');
  await expect(dialog.getByRole('button', { name: 'Ampliar Minha casa', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Excluir Minha casa…', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Mover Minha casa', exact: true }).click();
  await page.getByRole('button', { name: 'Terreno 2 · vazio', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar mudança', exact: true }).click();
  expect((await readTown(page)).buildings[0]!.plot).toBe(1);
  await page.getByRole('button', { name: 'Ações de Minha casa: ampliar, mover e excluir', exact: true }).click();
  await dialog.getByRole('button', { name: 'Ampliar Minha casa', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Adicionar Cozinha', exact: true })).toBeVisible();
});

test('mapa mostra a mobília real e explica a capacidade esgotada', async ({ page }) => {
  await ready(page);
  let town = await readTown(page);
  for (let cell = 2; cell < 12; cell++) town = neighborhoodAction(town, { type: 'add-module', building: 1, cell, template: 'empty' });
  await page.addInitScript(value => localStorage.setItem('mundo-da-bia:neighborhood:v2', JSON.stringify({ version: 2, town: value })), town);
  await page.reload(); await page.locator('#map-toggle').click();
  await expect(page.locator('#add-room')).toBeDisabled();
  await expect(page.locator('#room-capacity')).toHaveText('12 de 12 cômodos. Crie outra construção para continuar.');
  const pieces = town.buildings[0]!.layout.pieces.filter(p => p.room === town.buildings[0]!.entry);
  await expect(page.locator(`#room-map [data-room="${town.buildings[0]!.entry}"] [data-piece]`)).toHaveCount(pieces.length);
  await page.screenshot({ path: 'reports/ui-house-map.png' });
});

test('ações da construção atual aparecem junto do mapa sem rolar até o bairro', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click();
  const action = page.getByRole('button', { name: 'Ampliar, mover ou excluir Minha casa', exact: true });
  await expect(action).toBeInViewport(); await action.click();
  await expect(page.locator('#plot-dialog').getByRole('button', { name: 'Excluir Minha casa…', exact: true })).toBeVisible();
});

test('a turma nasce espalhada a 768 px e o cartão mostra a roupa atual', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 }); await ready(page);
  await page.screenshot({ path: 'reports/initial-768.png' });
  const actors = (await readTown(page)).actors;
  const boxes = await page.locator('canvas').evaluate((canvas, list) => {
    const box = canvas.getBoundingClientRect(), scale = box.width / Number(canvas.dataset.viewWidth);
    return list.map(a => {
      const width = (a.cat ? 70 : 84) * scale, height = (a.cat ? 94 : 189) * scale, foot = a.y + (a.seated ? 19 : 0);
      const x = box.x + (a.x - Number(canvas.dataset.viewX)) * scale, y = box.y + (foot - Number(canvas.dataset.viewY)) * scale;
      return { left: x - width / 2, right: x + width / 2, top: y - height, bottom: y, inside: x > box.x && x < box.x + box.width };
    });
  }, actors.map(a => ({ x: a.x, y: a.y, cat: ['mimi', 'nino', 'pipoca'].includes(a.id), seated: !!a.seat })));
  expect(boxes.every(b => b.inside)).toBe(true);
  for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top).toBe(true);
  await tray(page, 'Turma'); const card = page.locator('#cast button', { hasText: 'Bia' }).locator('img');
  const before = await card.getAttribute('src');
  await page.locator('#play-tray').getByRole('button', { name: 'Looks', exact: true }).click(); await page.getByRole('button', { name: 'Festa' }).click();
  await page.locator('#play-tray').getByRole('button', { name: 'Turma', exact: true }).click();
  await expect.poll(() => card.getAttribute('src')).not.toBe(before);
  await page.screenshot({ path: 'reports/ui-dock-dressed-768.png' });
});
