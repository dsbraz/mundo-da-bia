import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { expect, test } from '@playwright/test';
import { ready, readTown, read, tray, closeTray, point, swipe, visitNeighbor, tap } from './helpers';
import { plotStart } from '../src/domain/neighborhood-geometry';
test('nomeia, veste, sai, constrói, entra, decora, desfaz e recarrega', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await ready(page); await tray(page, 'Turma');
  await page.locator('#cast button').nth(1).click();
  await page.getByRole('textbox', { name: 'Nome do personagem' }).fill('Sol');
  await page.getByRole('button', { name: 'Salvar nome', exact: true }).click();
  await page.locator('#cast button').first().click();
  await tray(page, 'Looks'); await page.getByRole('button', { name: 'Rumi', exact: false }).click();
  await tray(page, 'Objetos'); await page.getByRole('button', { name: 'Ursinho', exact: true }).click(); await closeTray(page);
  await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click();
  expect((await readTown(page)).actors[0]).toMatchObject({ name: 'Sol', look: 'rumi', location: { kind: 'street' } });
  await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
  await page.getByRole('button', { name: 'Nova casa pronta', exact: true }).click();
  await page.getByRole('button', { name: 'Loja · salão e fundos', exact: false }).click();
  await page.getByRole('button', { name: 'Construir aqui', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  expect((await readTown(page)).buildings).toHaveLength(2);
  await page.locator('#undo').click(); expect((await readTown(page)).buildings).toHaveLength(1);
  await page.locator('#redo').click(); expect((await readTown(page)).buildings).toHaveLength(2);
  await page.locator('#play-mode').click();
  await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Ir para Loja 2', exact: true }).click();
  await page.locator('#build-toggle').click(); await tray(page, 'Todos');
  await page.getByRole('button', { name: 'Adicionar Planta', exact: true }).click(); await closeTray(page);
  const count = (await read(page)).layout.pieces.length;
  await page.locator('#undo').click(); expect((await read(page)).layout.pieces).toHaveLength(count - 1);
  await page.locator('#redo').click();
  const town = await readTown(page); expect(town.actors).toHaveLength(7); expect(town.items).toHaveLength(5);
  expect(town.items.find(i => i.holder === 'bia')!.location).toEqual(town.location);
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true'); expect(await readTown(page)).toEqual(town);
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
  // The doorway lights up under her feet at once, with no wait; she goes through only when let go.
  await expect(page.locator('canvas')).toHaveAttribute('data-door-glow', 'true');
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

for (const viewport of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }]) {
  test(`interior e bairro panorâmico em ${viewport.width}`, async ({ page }) => {
    let town = migrateNeighborhood(initialAlbum(initialWorld()));
    town = neighborhoodAction(town, { type: 'construct', plot: 1, model: 'shop' });
    town = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'interior', building: 2, room: town.buildings[1]!.entry }, point: { x: 520, y: 530 } });
    await page.addInitScript(value => localStorage.setItem('mundo-da-bia:neighborhood:v2', value), encodeNeighborhood(town));
    await page.setViewportSize(viewport); await ready(page);
    await page.screenshot({ path: `reports/neighborhood-interior-${viewport.width}.png` });
    await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click();
    await page.screenshot({ path: `reports/neighborhood-street-${viewport.width}.png` });
    expect((await readTown(page)).location).toEqual({ kind: 'street' });
    // Arriving from the house, the nearest free plot's sign opens whole beside it, before any pan.
    const edges = await page.locator('canvas').evaluate((canvas, [left, right, door]) => {
      const box = canvas.getBoundingClientRect(), scale = box.width / Number(canvas.dataset.viewWidth), offset = Number(canvas.dataset.viewX) + Number(canvas.dataset.cameraX);
      return { left: box.x + (left! - offset) * scale, right: box.x + (right! - offset) * scale, door: box.x + (door! - offset) * scale };
    }, [plotStart(2) + 40, plotStart(2) + 261, plotStart(1) + 330]);
    const world = (await page.locator('#world').boundingBox())!;
    // W3L-03: in portrait the taller scene draws the street bigger, so the sign is reached by panning; in landscape it opens whole.
    if (viewport.width > viewport.height) { expect(edges.left).toBeGreaterThanOrEqual(world.x); expect(edges.right).toBeLessThanOrEqual(world.x + world.width); }
    // Beside the house just left: the right part of its facade is in view too.
    expect(edges.door).toBeGreaterThan(world.x); expect(edges.door).toBeLessThan(world.x + world.width);
    // Whoever left the house arrives whole, 24 px or more inside the scene.
    const bia = (await readTown(page)).actors.find(a => a.id === 'bia')!, ring = await streetRing(page, bia.x);
    expect(ring.left - world.x).toBeGreaterThanOrEqual(24); expect(world.x + world.width - ring.right).toBeGreaterThanOrEqual(24);
    await tap(page, plotStart(2) + 125, 330);
    await expect(page.locator('#plot-dialog')).toBeVisible();
  });
}

/** Screen x of street points, before any pan. */
const screenX = (page: import('@playwright/test').Page, xs: number[]) => page.locator('canvas').evaluate((c, xs) => {
  const box = c.getBoundingClientRect(), scale = box.width / Number(c.dataset.viewWidth), offset = Number(c.dataset.viewX) + Number(c.dataset.cameraX);
  return xs.map(x => box.x + (x - offset) * scale);
}, xs);
/** A street character's ring, as wide as indoors so the arms are inside it too. */
const streetRing = async (page: import('@playwright/test').Page, x: number) => { const [left, right] = await screenX(page, [x - 42, x + 42]); return { left: left!, right: right! }; };
for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
  test(`ao sair de casa num jogo novo a ${viewport.width}, a Bia chega inteira à rua, a 24 px da borda`, async ({ page }) => {
    await page.setViewportSize(viewport); await ready(page);
    await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
    await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-street', 'true');
    const town = await readTown(page), bia = town.actors.find(a => a.id === 'bia')!, world = (await page.locator('#world').boundingBox())!;
    expect(bia.location).toEqual({ kind: 'street' });
    const ring = await streetRing(page, bia.x);
    expect(ring.left - world.x).toBeGreaterThanOrEqual(24); expect(world.x + world.width - ring.right).toBeGreaterThanOrEqual(24);
    await page.screenshot({ path: `reports/street-arrival-${viewport.width}.png` });
    if (viewport.width <= viewport.height) return;
    // In landscape, the nearest free plot's sign is whole beside her too (W3L-03: in portrait the bigger street leaves it to a pan).
    const free = [...Array(town.plots).keys()].find(p => !town.buildings.some(b => b.plot === p))!;
    const [left, right] = await screenX(page, [plotStart(free) + 40, plotStart(free) + 261]);
    expect(left).toBeGreaterThanOrEqual(world.x); expect(right).toBeLessThanOrEqual(world.x + world.width);
  });
}
