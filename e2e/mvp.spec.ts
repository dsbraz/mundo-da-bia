import { expect, test, type Page } from '@playwright/test';
import { ready, readTown, point, tap, tray, closeTray, explore, visitNeighbor } from './helpers';
test('trackpad, navigation strip and modular construction preserve the world', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await ready(page);
  const canvas = page.locator('canvas');
  await canvas.dispatchEvent('wheel', { deltaX: 300, deltaY: 0 });
  expect((await readTown(page)).location).toMatchObject({ room: 'sala' });
  await visitNeighbor(page);
  await explore(page); await page.getByRole('button', { name: '← Anterior', exact: true }).click(); await page.locator('#close-map').click();
  await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
  await page.getByRole('button', { name: 'Nova casa pronta', exact: true }).click();
  await page.getByRole('button', { name: 'Prédio ·', exact: false }).click();
  await expect(page.getByText('Prévia · Prédio com dois andares')).toBeVisible();
  expect((await readTown(page)).buildings).toHaveLength(1);
  await page.getByRole('button', { name: 'Construir aqui', exact: true }).click();
  await expect(page.locator('#structure-dialog')).toBeVisible();
  expect(Object.values((await readTown(page)).buildings[1]!.layout.rooms).map(r => r.cell)).toContain(4);
  await page.getByRole('button', { name: 'Mais um andar', exact: true }).click();
  await page.getByRole('button', { name: 'Construir!' }).click();
  await expect(page.getByRole('button', { name: 'Mais um andar', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.locator('#undo').click();
  expect(Object.values((await readTown(page)).buildings[1]!.layout.rooms).some(r => r.cell === 8)).toBe(false);
  await page.locator('#redo').click();
  const town = await readTown(page); await page.reload(); await expect(canvas).toHaveAttribute('data-ready', 'true');
  expect(await readTown(page)).toEqual(town); expect(errors).toEqual([]);
});
/** With reduced motion walks are slow, not instant: scene time is played ahead in 100 ms frames (a walk step's cap) while waiting for an arrival. */
async function reducedClock(page: Page) {
  await page.clock.install(); await ready(page); await page.emulateMedia({ reducedMotion: 'reduce' });
  return async <T>(value: () => Promise<T>, done: (v: T) => boolean) => {
    for (let t = 0; t < 15000 && !done(await value()); t += 300) for (let f = 0; f < 3; f++) await page.clock.fastForward(100);
    return expect(await value());
  };
}
test('tap walks and dragging the background does not', async ({ page }) => {
  const soon = await reducedClock(page);
  await tap(page, 650, 530); (await soon(async () => (await readTown(page)).actors[0]!.x, x => Math.abs(x - 650) < .5)).toBeCloseTo(650, 0);
  const before = await readTown(page), a = await point(page, 300, 50), b = await point(page, 650, 50);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y); await page.mouse.up(); expect(await readTown(page)).toEqual(before);
});
async function toSquare(page: Page) {
  await tray(page, 'Turma'); await page.locator('#cast button').first().click(); await closeTray(page);
  await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click();
  await explore(page); await page.getByRole('button', { name: '← Anterior', exact: true }).click(); await page.locator('#close-map').click();
}
async function reloadKeeps(page: Page) {
  const town = await readTown(page); await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true'); expect(await readTown(page)).toEqual(town);
}
test('the square saves equipment', async ({ page }) => {
  const soon = await reducedClock(page); await toSquare(page);
  await tap(page, 180, 420);
  (await soon(async () => (await readTown(page)).outdoor.bench, v => v === 'bia')).toBe('bia');
  await tap(page, 180, 420);
  (await soon(async () => (await readTown(page)).outdoor.bench, v => v === null)).toBeNull();
  await tap(page, 535, 474);
  (await soon(async () => page.locator('#seed-bag').isVisible(), v => v)).toBe(true);
  await page.locator('#seed-bag [data-crop="tomate"]').click();
  expect((await readTown(page)).progress.plaza['praca-3']?.crop).toBe('tomate');
  await reloadKeeps(page);
});
test('the square saves the ball', async ({ page }) => {
  const soon = await reducedClock(page); await toSquare(page);
  await tray(page, 'Objetos'); await page.getByRole('button', { name: 'Bola da praça', exact: true }).click(); await closeTray(page);
  (await soon(async () => (await readTown(page)).items.find(i => i.kind === 'bola')!.holder, v => v === 'bia')).toBe('bia');
  for (const width of [1024, 768]) { await page.setViewportSize({ width, height: width === 1024 ? 768 : 1024 }); await page.screenshot({ path: `reports/mvp-square-${width}.png` }); }
  await reloadKeeps(page);
});
test('module previews cancel cleanly and explicit floor travel carries the held object', async ({ page }) => {
  await ready(page); await page.emulateMedia({ reducedMotion: 'reduce' });
  await tray(page, 'Objetos'); await page.getByRole('button', { name: 'Microfone', exact: true }).click(); await closeTray(page);
  // The microphone starts a show that ends by itself after 12 s and is then saved off: compare saves without it.
  const calm = (town: Awaited<ReturnType<typeof readTown>>) => ({ ...town, buildings: town.buildings.map(b => ({ ...b, show: false })) });
  const before = calm(await readTown(page));
  await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
  await page.getByRole('button', { name: 'Adicionar cômodo ou andar', exact: true }).click();
  await page.getByRole('button', { name: 'Mais um andar', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(calm(await readTown(page))).toEqual(before);
  await page.getByRole('button', { name: 'Mais um andar', exact: true }).click();
  await page.getByRole('button', { name: 'Construir!', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.locator('#play-mode').click();
  await explore(page);
  await page.getByRole('button', { name: 'Ir para Sala', exact: true }).click();
  const town = await readTown(page), bia = town.actors[0]!;
  expect(bia.location).toEqual(town.location);
  expect(town.items.find(i => i.kind === 'microfone')).toMatchObject({ holder: 'bia', location: town.location });
  expect(town.actors).toHaveLength(9); expect(town.items).toHaveLength(5);
  await explore(page);
  await expect(page.locator('.choice-cards[aria-label=Andar] button[aria-pressed=true]')).toHaveText('1º andar');
  await expect(page.getByRole('button', { name: '← Anterior', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Próximo →', exact: true })).toBeDisabled();
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true'); expect(calm(await readTown(page))).toEqual(calm(town));
});
