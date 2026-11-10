import { test, expect } from '@playwright/test';
import { ready, read, readTown, create, closeTray, point, tray } from './helpers';

test('brincadeira tem três entradas e edição abre o catálogo sem outra procura', async ({ page }) => {
  await ready(page);
  await expect(page.locator('#map-toggle')).toHaveText('Mapa');
  await expect(page.locator('#tray-toggle')).toHaveText('Turma');
  await expect(page.locator('#build-toggle')).toHaveText('Criar');
  await expect(page.locator('#play-mode')).toHaveText('Brincar');
  await expect(page.locator('#play-mode')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#construct-mode')).toBeHidden();
  await page.locator('#build-toggle').click();
  await expect(page.locator('#build-catalog')).toBeVisible();
  await expect(page.locator('#build-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#play-mode')).toHaveText('Brincar');
  await expect(page.locator('header')).not.toContainText('Pronto');
  await expect(page.locator('header')).not.toContainText('Ampliar');
  await expect(page.locator('#create-tabs #construct-mode')).toBeVisible();
  await expect(page.locator('#tray-toggle')).toHaveText('Móveis e cores');
  await page.screenshot({ path: 'reports/header-create.png' });
});

test('desfazer continua disponível depois de terminar a edição', async ({ page }) => {
  await ready(page); await create(page); await page.locator('#build-toggle').click();
  const before = await read(page);
  await page.getByRole('button', { name: 'Adicionar Sofá aconchego', exact: true }).click();
  await page.locator('#play-mode').click();
  await expect(page.locator('#undo')).toBeVisible(); await page.locator('#undo').click();
  expect((await read(page)).layout.pieces).toEqual(before.layout.pieces);
});

test('mapa reúne navegação e transporte sem um segundo menu Explorar', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click();
  await expect(page.locator('#room-dialog #room-navigation')).toBeVisible();
  await expect(page.locator('#navigation-toggle')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ir para Rua', exact: true })).toBeVisible();
  await expect(page.locator('#room-dialog').getByRole('button', { name: /Excluir|Mover|Levar|Trazer/ })).toHaveCount(0);
  await expect(page.locator('#room-map .room-cast img')).toHaveCount(7);
});

test('no modo Brincar, tocar num cômodo do Mapa leva quem está selecionado; em Criar só muda a vista', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click();
  await expect(page.locator('#home-hint')).toHaveText('Toque num lugar para ir com Bia.');
  await page.getByRole('button', { name: 'Ir para Quarto dos sonhos', exact: true }).click();
  let state = await read(page); expect(state.room).toBe('quarto'); expect(state.actors[0]!.room).toBe('quarto');
  await page.locator('#build-toggle').click(); await closeTray(page); await page.locator('#map-toggle').click();
  await page.getByRole('button', { name: 'Ir para Sala & palco', exact: true }).click();
  state = await read(page); expect(state.room).toBe('sala'); expect(state.actors[0]!.room).toBe('quarto');
});

test('catálogo encontra móveis por atividade cotidiana sem coleção intermediária', async ({ page }) => {
  await ready(page); await page.locator('#build-toggle').click();
  await page.getByRole('button', { name: 'Cozinha', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Adicionar Pia de cozinha', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Adicionar Sofá aconchego', exact: true })).toBeHidden();
  await expect(page.locator('.collection-filter')).toHaveCount(0);
});

test('bairro oferece arraste da casa, destino visível e cancelamento', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click();
  await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click();
  await page.locator('#build-toggle').click();
  await page.setViewportSize({ width: 1440, height: 800 }); await closeTray(page);
  const source = page.getByRole('button', { name: 'Mover Minha casa', exact: true });
  await expect(source).toBeVisible();
  const before = await readTown(page);
  const from = (await source.boundingBox())!, to = (await page.getByRole('button', { name: 'Construir no terreno 2', exact: true }).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.keyboard.press('Escape'); await page.mouse.up(); expect(await readTown(page)).toEqual(before);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 }); await page.mouse.up();
  expect((await readTown(page)).buildings[0]!.plot).toBe(1);
  await page.locator('#undo').click(); expect((await readTown(page)).buildings).toEqual(before.buildings);
  await source.click(); await expect(page.getByRole('button', { name: 'Excluir Minha casa…', exact: true })).toBeVisible();
});

test('ampliar mostra o espaço escolhido no mapa antes de criar o cômodo', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click();
  await expect(page.getByRole('button', { name: 'Adicionar cômodo · Térreo · espaço 4', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Organizar', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar cômodo · Térreo · espaço 4', exact: true }).click();
  await page.getByRole('button', { name: 'Criar Cozinha', exact: true }).click();
  const before = await readTown(page);
  await page.getByRole('button', { name: 'Construir cômodo', exact: true }).click();
  const rooms = Object.values((await readTown(page)).buildings[0]!.layout.rooms);
  expect(rooms.find(r => r?.cell === 3)?.template).toBe('kitchen');
  expect(rooms).toHaveLength(Object.keys(before.buildings[0]!.layout.rooms).length + 1);
});

for (const width of [390, 768]) test(`organização mantém controles acessíveis em retrato ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1024 }); await ready(page);
  await page.screenshot({ path: `reports/organization-play-${width}.png` });
  await page.locator('#build-toggle').click();
  await page.getByRole('button', { name: 'Cozinha', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Adicionar Pia de cozinha', exact: true })).toBeVisible();
  await page.screenshot({ path: `reports/organization-catalog-${width}.png` });
  const undo = (await page.locator('#undo').boundingBox())!;
  expect([undo.width, undo.height]).toEqual([56, 56]); expect(undo.x).toBeGreaterThanOrEqual(0); expect(undo.y + undo.height).toBeLessThanOrEqual(1024);
  expect(await page.locator('.catalog-categories').evaluate(n => n.scrollWidth <= n.clientWidth)).toBe(true);
  await page.locator('#map-toggle').click();
  expect(await page.locator('#room-dialog').evaluate(n => n.scrollWidth <= n.clientWidth)).toBe(true);
  await page.screenshot({ path: `reports/organization-map-${width}.png` });
});

test('desfazer atualiza a lista de peças e o inspetor junto com a cena', async ({ page }) => {
  await ready(page); await create(page); await page.locator('#build-toggle').click();
  await page.getByRole('button', { name: 'Adicionar Sofá aconchego', exact: true }).click();
  await page.locator('#undo').click();
  expect((await read(page)).layout.pieces.filter(p => p.room === 'room-3')).toHaveLength(0);
  await expect(page.locator('#present-pieces button')).toHaveCount(0);
  await expect(page.locator('#build-inspector')).toBeHidden();
});

test('segundo contato não abre ações durante o arraste de uma casa', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click();
  await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click();
  await page.locator('#build-toggle').click(); await closeTray(page);
  const source = page.getByRole('button', { name: 'Mover Minha casa', exact: true });
  const box = (await source.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await source.dispatchEvent('pointerdown', { pointerId: 2, button: 0 });
  await source.dispatchEvent('pointerup', { pointerId: 2 });
  await source.dispatchEvent('click', { detail: 1 });
  await expect(page.locator('#plot-dialog')).toBeHidden();
  await page.keyboard.press('Escape'); await page.mouse.up();
});

test('Arrumar reabre o catálogo recolhido', async ({ page }) => {
  await ready(page); await page.locator('#build-toggle').click(); await closeTray(page);
  await page.locator('#build-toggle').click(); await expect(page.locator('#build-catalog')).toBeVisible();
});

test('arraste na borda revela terrenos em retrato e Escape não muda a casa', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 }); await ready(page);
  await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click();
  await page.locator('#build-toggle').click(); await closeTray(page);
  const before = await readTown(page), canvas = page.locator('canvas');
  const camera = Number(await canvas.getAttribute('data-camera-x'));
  const source = (await page.getByRole('button', { name: 'Mover Minha casa', exact: true }).boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2); await page.mouse.down();
  await page.mouse.move(760, source.y + source.height / 2, { steps: 8 });
  await expect.poll(async () => Number(await canvas.getAttribute('data-camera-x'))).toBeGreaterThan(camera + 80);
  await page.screenshot({ path: 'reports/organization-house-drag-768.png' });
  await page.keyboard.press('Escape'); await page.mouse.up(); expect(await readTown(page)).toEqual(before);
});

test('arrumar sem briga: o sofá segue o dedo sobre a geladeira, encosta ao lado ao soltar e a peça repetida pisca na cena', async ({ page }) => {
  await ready(page); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator('#build-toggle').click(); await closeTray(page);
  const before = await read(page), sofa = before.layout.pieces.find(p => p.kind === 'sofa')!, fridge = before.layout.pieces.find(p => p.kind === 'fridge')!;
  const from = await point(page, sofa.x + 135, sofa.y + 85), to = await point(page, fridge.x + 15, fridge.y + 110);
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 8 });
  await expect(page.locator('canvas')).toHaveAttribute('data-invalid-piece', String(sofa.id));
  await page.mouse.up();
  const moved = (await read(page)).layout.pieces.find(p => p.id === sofa.id)!;
  expect(moved).not.toMatchObject({ x: sofa.x, y: sofa.y });
  expect(Math.hypot(moved.x - (fridge.x - 120), moved.y - (fridge.y + 25))).toBeLessThan(260);
  await expect(page.locator('canvas')).toHaveAttribute('data-invalid-piece', '');
  await tray(page, 'Todos'); await page.getByRole('button', { name: 'Adicionar Geladeira', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-blink', 'fridge');
  expect((await read(page)).layout.pieces.filter(p => p.kind === 'fridge' && p.room === 'sala')).toHaveLength(1);
});
