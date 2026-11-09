import { expect, test } from '@playwright/test';
import { ready, readTown, tray, closeTray } from './helpers';

for (const [model, name, count] of [['hospital', 'Hospital', 3], ['police', 'Delegacia', 3], ['office', 'Escritório', 4], ['fire-station', 'Bombeiros', 3], ['school', 'Escola', 4], ['stadium', 'Estádio', 3], ['sports-club', 'Clube esportivo', 3]] as const) {
  test(`${name}: construir, visitar ambientes, desfazer e recarregar`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width: 1280, height: 800 }); await ready(page);
    const original = await readTown(page);
    await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
    await page.locator('#construct-plot').click();
    await page.locator('#plot-dialog').getByRole('button', { name: new RegExp(`^${name} ·`) }).click();
    await page.getByRole('button', { name: 'Construir aqui', exact: true }).click();
    await page.getByRole('button', { name: 'Fechar estrutura', exact: true }).click();
    const built = await readTown(page), building = built.buildings.at(-1)!;
    expect(building.model).toBe(model); expect(Object.keys(building.layout.rooms)).toHaveLength(count);
    expect(built.actors).toEqual(original.actors); expect(built.items).toEqual(original.items);
    await page.locator('#undo').click(); expect((await readTown(page)).buildings).toEqual(original.buildings);
    await page.locator('#redo').click(); expect((await readTown(page)).buildings).toEqual(built.buildings);
    await page.locator('#play-mode').click(); await page.locator('#map-toggle').click();
    await page.locator('#neighborhood-list').getByRole('button', { name: `⌂ ${building.name}`, exact: true }).click();
    for (const room of Object.values(building.layout.rooms)) {
      await page.locator('#map-toggle').click();
      await page.getByRole('button', { name: `Visitar ${room.name}`, exact: true }).click();
      await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
      await page.screenshot({ path: `reports/${model}-${room.template}.png` });
    }
    const saved = await readTown(page); await page.reload();
    await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
    expect(await readTown(page)).toEqual(saved);
    await page.locator('#map-toggle').click(); await page.getByRole('button', { name: '⌂ Bairro', exact: true }).click();
    await page.screenshot({ path: `reports/${model}-facade.png` });
    expect(errors).toEqual([]);
  });
}

for (const [id, name] of [['nurse', 'Enfermagem'], ['police', 'Polícia'], ['detective', 'Detetive'], ['office', 'Escritório'], ['sport', 'Esporte'], ['outing', 'Passeio']]) {
  test(`roupa ${name} aparece completa e permanece após recarga`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width: 1280, height: 800 }); await ready(page);
    await tray(page, 'Looks'); await page.getByRole('button', { name: new RegExp(`${name}$`) }).click();
    await closeTray(page);
    expect((await readTown(page)).actors.find(a => a.id === 'bia')!.look).toBe(id);
    await page.screenshot({ path: `reports/outfit-${id}.png` });
    const saved = await readTown(page); await page.reload();
    await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
    expect(await readTown(page)).toEqual(saved); expect(errors).toEqual([]);
  });
}
