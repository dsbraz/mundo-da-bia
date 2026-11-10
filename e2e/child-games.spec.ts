import { expect, test } from '@playwright/test';
import { ready, readTown, tray, closeTray, point, bringHere } from './helpers';
import { initialWorld } from '../src/domain/world';
import { hopPosition, hopTiles } from '../src/presentation/game-space';
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
  world.actors.forEach(a => { a.x = a.id === 'bia' ? 700 : 200; a.y = a.kind === 'cat' ? 540 : 530; a.seat = null; });
  const saved = encodeNeighborhood(migrateNeighborhood(initialAlbum(world)));
  expect(decodeNeighborhood(saved)).not.toBeNull();
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, saved);
  await ready(page); await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
}

test('amarelinha: ida e volta por teclado, sair e recarregar sem sessão persistida', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await playground(page);
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
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

/** Every visible text in the game panel: its words and computed size. */
const panelTexts = (page: import('@playwright/test').Page) => page.locator('#game-panel').evaluate(panel => {
  const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT), found: { text: string; words: number; size: number }[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const owner = node.parentElement!, text = node.textContent!.trim();
    if (text && owner.checkVisibility({ visibilityProperty: true })) found.push({ text, words: text.split(/\s+/).length, size: Number.parseFloat(getComputedStyle(owner).fontSize) });
  }
  return found;
});
for (const game of ['Pular corda', 'Amarelinha']) test(`painel de ${game}: ícone e rótulos curtos de 16 px, sem parágrafo de instruções`, async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 }); await playground(page);
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: game, exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
  await expect(page.locator('#game-instruction')).toHaveCount(0);
  const icon = await page.locator('#game-name').evaluate(h => getComputedStyle(h, '::before').backgroundImage);
  expect(icon).toContain(game === 'Amarelinha' ? 'ui-hopscotch.svg' : 'ui-rope.svg');
  const check = async () => { for (const t of await panelTexts(page)) { expect(t.words, t.text).toBeLessThanOrEqual(6); expect(t.size, t.text).toBeGreaterThanOrEqual(16); } };
  await check();
  if (game === 'Pular corda') { await page.locator('#game-jump').click(); await check(); return; }
  for (const cells of ['1', '2', '3 e 4', '5', '6 e 7', '8', '6 e 7', '5', '3 e 4', '2', '1']) {
    await expect(page.locator('#game-jump')).toHaveText(`Pular para ${cells}`); await expect(page.locator('#game-jump')).toBeEnabled(); await page.keyboard.press('Space');
  }
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'complete'); await check();
});

test('corda: interrupção ao trocar personagem, escapar e perder foco', async ({ page }) => {
  await playground(page); const original = await readTown(page);
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Pular corda', exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
  await page.keyboard.press('Space');
  await tray(page, 'Turma'); await page.getByRole('button', { name: 'Luna', exact: true }).click();
  await expect(page.locator('#game-panel')).toBeHidden();
  expect((await readTown(page)).items).toEqual(original.items);
  await page.locator('#tray-toggle').click();
  for (const interrupt of ['escape', 'blur']) {
    await page.getByRole('button', { name: 'Jogar', exact: true }).click();
    await page.getByRole('button', { name: 'Pular corda', exact: true }).click();
    await expect(page.locator('#game-panel')).toBeVisible();
    await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
    if (interrupt === 'escape') await page.keyboard.press('Escape');
    else await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('#game-panel')).toBeHidden();
  }
});

for (const game of ['Pular corda', 'Amarelinha']) test(`mão ocupada solta o objeto no chão e ${game} começa`, async ({ page }) => {
  await playground(page, true); const held = (await readTown(page)).items.find(i => i.holder === 'bia')!;
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: game, exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
  expect((await readTown(page)).items.find(i => i.id === held.id)).toMatchObject({ holder: null, spot: 'floor' });
});

test('com um gato escolhido, a brincadeira passa para a criança mais perto', async ({ page }) => {
  await playground(page); await tray(page, 'Turma'); await page.getByRole('button', { name: 'Mimi', exact: true }).click(); await closeTray(page);
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Pular corda', exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
  await expect(page.locator('#game-choice-message')).toBeEmpty(); await expect(page.locator('#selected')).not.toHaveText('Mimi');
});

test('corda tem indicação de ritmo e novas tentativas por toque com movimento reduzido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await playground(page);
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
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
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Amarelinha', exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
  const actor = (await readTown(page)).actors[0]!;
  // The camera glides to frame the board after play starts: tap only once the square's screen point stops moving.
  let previous = '';
  await expect.poll(async () => { const now = JSON.stringify(await point(page, actor.x, actor.y - 12)); const settled = now === previous; previous = now; return settled; }).toBe(true);
  const target = await point(page, actor.x, actor.y - 12); await page.touchscreen.tap(target.x, target.y);
  await expect(page.locator('#game-jump')).toHaveText('Pular para 2');
  const world = (await page.locator('#world').boundingBox())!, panel = (await page.locator('#game-panel').boundingBox())!;
  expect(panel.y).toBeGreaterThanOrEqual(world.y + world.height - 1);
  await page.screenshot({ path: 'reports/hopscotch-portrait.png' });
  const vision = await page.context().newCDPSession(page);
  await page.locator('#game-jump').click(); await expect(page.locator('#game-jump')).toHaveText('Pular para 3 e 4');
  await vision.send('Emulation.setEmulatedVisionDeficiency', { type: 'deuteranopia' });
  await page.screenshot({ path: 'reports/hopscotch-portrait-deuteranopia.png' });
  await vision.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' }); await vision.detach();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.locator('#game-jump')).toBeVisible();
  await page.locator('#build-toggle').click(); await expect(page.locator('#game-panel')).toBeHidden();
});

test('cancelar a aproximação invalida o início pendente', async ({ page }) => {
  await playground(page);
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Amarelinha', exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'walking');
  await page.keyboard.press('Escape'); await page.clock.runFor(3000);
  await expect(page.locator('#game-panel')).toBeHidden();
  await expect(page.locator('canvas')).toHaveAttribute('data-walking', '');
});

test('um segundo dedo não pula outra casa', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await playground(page);
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
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
  await ready(page); await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Organizar', exact: true }).click(); await page.locator('#add-room').click();
  await page.getByRole('button', { name: 'Criar Quintal de brincadeiras', exact: true }).click();
  await page.getByRole('button', { name: 'Construir cômodo', exact: true }).click();
  await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
  await bringHere(page);
  for (const name of ['Pular corda', 'Amarelinha']) {
    await page.getByRole('button', { name: 'Jogar', exact: true }).click();
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('#game-panel')).toBeVisible();
    await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
    await page.getByRole('button', { name: 'Encerrar brincadeira', exact: true }).click();
  }
});

test('sem espaço livre na sala inicial, a amarelinha leva a criança e a câmera ao chão mais livre, sem texto', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 }); await ready(page);
  await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Amarelinha', exact: true }).click();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
  await expect(page.locator('#game-chooser')).toBeHidden(); await expect(page.locator('#game-choice-message')).toHaveText('');
  const bia = (await readTown(page)).actors.find(a => a.id === 'bia')!, scene = (await page.locator('#world').boundingBox())!;
  const feet = await page.locator('canvas').evaluate((c, [x, y]) => {
    const box = c.getBoundingClientRect(), d = (c as HTMLCanvasElement).dataset, scale = box.width / Number(d.viewWidth);
    return { x: box.x + (x - Number(d.viewX) - Number(d.cameraX)) * scale, y: box.y + (y - Number(d.viewY)) * scale };
  }, [bia.x, bia.y]);
  expect(feet.x).toBeGreaterThan(scene.x); expect(feet.x).toBeLessThan(scene.x + scene.width);
  await page.screenshot({ path: 'reports/hopscotch-crowded-768.png' });
  // A tap on a drawn square jumps.
  for (const cells of ['1', '2', '3 e 4']) { await expect(page.locator('#game-jump')).toHaveText(`Pular para ${cells}`); await expect(page.locator('#game-jump')).toBeEnabled(); await page.locator('#game-jump').click(); }
  await expect(page.locator('#game-jump')).toHaveText('Pular para 5'); await expect(page.locator('#game-jump')).toBeEnabled();
  const square = await page.locator('canvas').evaluate((c, [x, y]) => {
    const box = c.getBoundingClientRect(), d = (c as HTMLCanvasElement).dataset, scale = box.width / Number(d.viewWidth);
    return { x: box.x + (x - Number(d.viewX) - Number(d.cameraX)) * scale, y: box.y + (y - Number(d.viewY)) * scale };
  }, [bia.x + 3 * 42, bia.y - 12 - 3 * 20]);
  await page.touchscreen.tap(square.x, square.y);
  await expect(page.locator('#game-jump')).toHaveText('Pular para 6 e 7');
});

/** Screen centres of the 8 drawn squares, from the player's position when the game starts (the board's origin). */
async function squareCentres(page: import('@playwright/test').Page, origin: { x: number; y: number }) {
  return page.locator('canvas').evaluate((c, points) => {
    const box = c.getBoundingClientRect(), d = (c as HTMLCanvasElement).dataset, scale = box.width / Number(d.viewWidth);
    return points.map(([x, y]) => ({ x: box.x + (x! - Number(d.viewX) - Number(d.cameraX)) * scale, y: box.y + (y! - Number(d.viewY)) * scale }));
  }, hopTiles.map(t => [origin.x + t.x, origin.y + t.y]));
}
for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
  test(`amarelinha na sala inicial a ${viewport.width}: as 8 casas inteiras no quadro e ninguém sobre o giz`, async ({ page }) => {
    await page.setViewportSize(viewport); await ready(page);
    await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
    await page.getByRole('button', { name: 'Jogar', exact: true }).click();
    await page.getByRole('button', { name: 'Amarelinha', exact: true }).click();
    // Whoever stood over the board walks off it (a short walk drawn in the scene), then stands still.
    await expect(page.locator('canvas')).not.toHaveAttribute('data-strolling', '');
    await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
    await expect(page.locator('canvas')).toHaveAttribute('data-strolling', '');
    const town = await readTown(page), origin = town.actors.find(a => a.id === 'bia')!, scene = (await page.locator('#world').boundingBox())!;
    const inside = async () => (await squareCentres(page, origin)).every(p => p.x > scene.x && p.x < scene.x + scene.width && p.y > scene.y && p.y < scene.y + scene.height);
    await expect.poll(inside).toBe(true);
    // Nobody else on the chalk: no foot inside a square and no body standing in front of a square's centre.
    for (const a of town.actors.filter(a => a.id !== 'bia' && a.room === origin.room)) {
      const half = a.kind === 'cat' ? 35 : 42, height = a.kind === 'cat' ? 94 : 189, foot = a.y + (a.seat ? 19 : 0);
      for (const t of hopTiles) {
        const cx = origin.x + t.x, cy = origin.y + t.y, dy = foot - cy;
        expect(Math.abs(a.x - cx + dy * 2.1) <= 47 && Math.abs(dy) <= 10, `${a.id} pisa na casa ${t.cell}`).toBe(false);
        expect(Math.abs(a.x - cx) < half && cy < foot && cy > foot - height, `${a.id} cobre a casa ${t.cell}`).toBe(false);
        // Nor does anyone's body meet the child's on any square (no cat ears behind her head).
        const child = hopPosition(origin, t.cell);
        expect(Math.abs(a.x - child.x) < half + 42 && foot - height < child.y && child.y - 189 < foot, `${a.id} colado à criança na casa ${t.cell}`).toBe(false);
      }
    }
    for (const cells of ['1', '2', '3 e 4', '5']) { await expect(page.locator('#game-jump')).toHaveText(`Pular para ${cells}`); await expect(page.locator('#game-jump')).toBeEnabled(); await page.locator('#game-jump').click(); }
    await expect(page.locator('#game-jump')).toHaveText('Pular para 6 e 7'); await expect.poll(inside).toBe(true);
    await page.screenshot({ path: `reports/hopscotch-board-${viewport.width}.png` });
  });
}
