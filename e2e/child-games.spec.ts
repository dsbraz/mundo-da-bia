import { expect, test } from '@playwright/test';
import { ready, readTown, tray, closeTray, point } from './helpers';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { decodeNeighborhood, encodeNeighborhood } from '../src/persistence/neighborhood';
const errors = new WeakMap<import('@playwright/test').Page, string[]>();
test.beforeEach(({ page }) => { const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message)); });
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

async function playground(page: import('@playwright/test').Page, holding = false) {
  const world = initialWorld(); world.layout.pieces = [];
  world.items.forEach(i => { i.spot = 'floor'; i.x = 100; });
  if (holding) world.items[0]!.holder = 'bia';
  world.actors.forEach(a => { a.x = a.id === 'bia' ? 700 : 200; });
  const saved = encodeNeighborhood(migrateNeighborhood(initialAlbum(world)));
  expect(decodeNeighborhood(saved)).not.toBeNull();
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, saved);
  await ready(page); await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
}

test('amarelinha: ida e volta por teclado, sair e recarregar sem sessão persistida', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await playground(page);
  await page.getByRole('button', { name: 'Brincadeiras', exact: true }).click();
  await page.getByRole('button', { name: 'Amarelinha', exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
  for (const cells of ['1', '2', '3 e 4', '5', '6 e 7', '8', '6 e 7', '5', '3 e 4', '2', '1']) {
    await expect(page.locator('#game-jump')).toHaveText(`Pular para ${cells}`);
    await expect(page.locator('#game-jump')).toBeEnabled();
    await page.keyboard.press('Space');
  }
  await expect(page.locator('#game-message')).toContainText('Ida e volta');
  await page.screenshot({ path: 'reports/hopscotch-complete.png' });
  await page.getByRole('button', { name: 'Encerrar brincadeira', exact: true }).click();
  const saved = await readTown(page); await page.reload();
  await expect(page.locator('#game-panel')).toBeHidden(); expect(await readTown(page)).toEqual(saved);
});

test('corda: interrupção ao trocar personagem, escapar e perder foco', async ({ page }) => {
  await playground(page); const original = await readTown(page);
  await page.getByRole('button', { name: 'Brincadeiras', exact: true }).click();
  await page.getByRole('button', { name: 'Pular corda', exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
  await page.keyboard.press('Space');
  await tray(page, 'Turma'); await page.getByRole('button', { name: 'Luna', exact: true }).click();
  await expect(page.locator('#game-panel')).toBeHidden();
  expect((await readTown(page)).items).toEqual(original.items);
  await page.locator('#tray-toggle').click();
  for (const interrupt of ['escape', 'blur']) {
    await page.getByRole('button', { name: 'Brincadeiras', exact: true }).click();
    await page.getByRole('button', { name: 'Pular corda', exact: true }).click();
    await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
    if (interrupt === 'escape') await page.keyboard.press('Escape');
    else await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('#game-panel')).toBeHidden();
  }
});

test('mão ocupada explica a recusa e preserva o objeto', async ({ page }) => {
  await playground(page, true); const original = await readTown(page);
  await page.getByRole('button', { name: 'Brincadeiras', exact: true }).click();
  for (const name of ['Pular corda', 'Amarelinha']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('#game-choice-message')).toContainText('Solte o objeto');
    await expect(page.locator('#game-panel')).toBeHidden();
    expect(await readTown(page)).toEqual(original);
  }
});

test('corda tem indicação de ritmo e novas tentativas por toque com movimento reduzido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await playground(page);
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'Brincadeiras', exact: true }).click();
  await page.getByRole('button', { name: 'Pular corda', exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
  await page.evaluate(() => {
    Reflect.set(window, 'gameAnnouncements', 0);
    new MutationObserver(() => Reflect.set(window, 'gameAnnouncements', Reflect.get(window, 'gameAnnouncements') + 1)).observe(document.querySelector('#game-message')!, { childList: true });
  });
  await page.clock.runFor(500); expect(await page.evaluate(() => Reflect.get(window, 'gameAnnouncements'))).toBe(0);
  await page.locator('#game-jump').tap(); await expect(page.locator('#game-message')).toContainText('Tente');
  await page.clock.runFor(1100); await expect(page.locator('#game-cue')).toHaveText('Agora!');
  await page.locator('#game-jump').tap(); await expect(page.locator('#game-message')).toContainText('Isso!');
  await page.screenshot({ path: 'reports/rope-reduced.png' });
  await page.getByRole('button', { name: 'Encerrar brincadeira', exact: true }).click();
  await expect(page.locator('#game-panel')).toBeHidden();
});

test('amarelinha por toque mantém os controles abaixo da cena no retrato e cancela ao mudar de modo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await playground(page);
  await page.getByRole('button', { name: 'Brincadeiras', exact: true }).click();
  await page.getByRole('button', { name: 'Amarelinha', exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
  const actor = (await readTown(page)).actors[0]!;
  const target = await point(page, actor.x, actor.y - 12); await page.touchscreen.tap(target.x, target.y);
  await expect(page.locator('#game-jump')).toHaveText('Pular para 2');
  const world = (await page.locator('#world').boundingBox())!, panel = (await page.locator('#game-panel').boundingBox())!;
  expect(panel.y).toBeGreaterThanOrEqual(world.y + world.height - 1);
  await page.screenshot({ path: 'reports/hopscotch-portrait.png' });
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.locator('#game-jump')).toBeVisible();
  await page.locator('#build-toggle').click(); await expect(page.locator('#game-panel')).toBeHidden();
});

test('cancelar a aproximação invalida o início pendente', async ({ page }) => {
  await playground(page);
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'Brincadeiras', exact: true }).click();
  await page.getByRole('button', { name: 'Amarelinha', exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'walking');
  await page.keyboard.press('Escape'); await page.clock.runFor(3000);
  await expect(page.locator('#game-panel')).toBeHidden();
  await expect(page.locator('canvas')).toHaveAttribute('data-walking', '');
});

test('um segundo dedo não pula outra casa', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await playground(page);
  await page.getByRole('button', { name: 'Brincadeiras', exact: true }).click();
  await page.getByRole('button', { name: 'Amarelinha', exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
  const actor = (await readTown(page)).actors[0]!;
  const first = { ...await point(page, actor.x, actor.y - 12), id: 1 };
  const second = { ...await point(page, actor.x + 42, actor.y - 32), id: 2 };
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
  await expect(page.locator('#game-jump')).toHaveText('Pular para 1');
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#game-jump')).toHaveText('Pular para 2'); await expect(page.locator('#game-jump')).toBeEnabled();
  await page.touchscreen.tap(second.x, second.y); await expect(page.locator('#game-jump')).toHaveText('Pular para 3 e 4'); await session.detach();
});

test('quintal pronto permite corda e amarelinha sem retirar a mobília', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click(); await page.locator('#add-room').click();
  await page.getByRole('button', { name: 'Criar Quintal de brincadeiras', exact: true }).click();
  await page.getByRole('button', { name: 'Construir cômodo', exact: true }).click();
  await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click();
  await page.locator('#bring-here').click(); await closeTray(page);
  for (const name of ['Pular corda', 'Amarelinha']) {
    await page.getByRole('button', { name: 'Brincadeiras', exact: true }).click();
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
    await page.getByRole('button', { name: 'Encerrar brincadeira', exact: true }).click();
  }
});
