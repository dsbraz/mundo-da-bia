import { expect, test } from '@playwright/test';
import { ready, tray, closeTray, readTown, point } from './helpers';
import { neighborhoodAction } from '../src/domain/neighborhood';
import { actorIds } from '../src/domain/types';
import { cards } from '../src/content/personalities';

for (const viewport of [{ width: 1280, height: 800 }, { width: 1024, height: 768 }]) {
  // W3L-03: the strip of faces (portrait) or the Turma button (landscape) stays outside the scene and the scene never moves; the actions
  // are a ring inside the scene that goes with the chosen character (above Bia, then above Rui).
  test(`controles fora da cena, cena parada e anel acima de quem foi escolhido ao trocar a seleção ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport); await ready(page);
    const initialScene = (await page.locator('#world').boundingBox())!;
    const hint = await page.locator('#play-hint').boundingBox(), turma = (await page.locator('#tray-toggle').boundingBox())!;
    if (hint) expect(Math.max(hint.x - initialScene.x - initialScene.width, hint.y - initialScene.y - initialScene.height)).toBeGreaterThanOrEqual(0);
    else expect(turma.y + turma.height).toBeLessThanOrEqual(initialScene.y);
    const panel = page.locator('#actor-context');
    const above = async (id: string) => {
      const actor = (await readTown(page)).actors.find(a => a.id === id)!, feet = await point(page, actor.x, actor.y);
      const ring = (await panel.boundingBox())!, scene = (await page.locator('#world').boundingBox())!;
      expect(ring.y, id).toBeGreaterThanOrEqual(scene.y); expect(ring.y + ring.height, id).toBeLessThan(feet.y);
      expect(ring.x, id).toBeGreaterThanOrEqual(scene.x); expect(ring.x + ring.width, id).toBeLessThanOrEqual(scene.x + scene.width + 1);
      if (feet.x > scene.x + ring.width / 2 && feet.x < scene.x + scene.width - ring.width / 2) { expect(ring.x, id).toBeLessThanOrEqual(feet.x); expect(ring.x + ring.width, id).toBeGreaterThanOrEqual(feet.x); }
    };
    await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
    await expect(panel).toBeVisible(); await above('bia');
    expect(await page.locator('#world').boundingBox()).toEqual(initialScene);
    await tray(page, 'Turma'); await page.getByRole('button', { name: 'Rui', exact: true }).click(); await closeTray(page);
    await expect(panel).toBeVisible(); await above('rui');
    expect(await page.locator('#world').boundingBox()).toEqual(initialScene);
    await tray(page);
    const scene = (await page.locator('#world').boundingBox())!, choices = (await page.locator('#play-tray').boundingBox())!;
    if (hint) expect(Math.max(choices.y - scene.y - scene.height, choices.x - scene.x - scene.width)).toBeGreaterThanOrEqual(0);
    else expect(scene).toEqual(initialScene);
    await page.screenshot({ path: `reports/ui-dock-${viewport.width}.png` });
  });
}

test('Organizar oferece as ações da casa; Lugares só serve para ir', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click();
  await expect(page.getByRole('button', { name: 'Ações de Minha casa: ampliar, mover e excluir', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Organizar', exact: true }).click();
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
  await page.addInitScript(value => localStorage.setItem('mundo-da-bia:neighborhood:v3', JSON.stringify({ version: 3, town: value })), town);
  await page.reload(); await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Organizar', exact: true }).click();
  await expect(page.locator('#add-room')).toBeDisabled();
  await expect(page.locator('#room-capacity')).toHaveText('12 de 12 cômodos. Crie outra construção para continuar.');
  const pieces = town.buildings[0]!.layout.pieces.filter(p => p.room === town.buildings[0]!.entry);
  await expect(page.locator(`#room-map [data-room="${town.buildings[0]!.entry}"] [data-piece]`)).toHaveCount(pieces.length);
  await page.screenshot({ path: 'reports/ui-house-map.png' });
});

test('ações da construção atual aparecem em Organizar sem rolar até o bairro', async ({ page }) => {
  await ready(page); await page.locator('#map-toggle').click();
  await expect(page.getByRole('button', { name: 'Ampliar, mover ou excluir Minha casa', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Organizar', exact: true }).click();
  const action = page.getByRole('button', { name: 'Ampliar, mover ou excluir Minha casa', exact: true });
  await expect(action).toBeInViewport(); await action.click();
  await expect(page.locator('#plot-dialog').getByRole('button', { name: 'Excluir Minha casa…', exact: true })).toBeVisible();
});

test('a turma nasce espalhada a 1024 px e o cartão mostra a roupa atual', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 }); await ready(page);
  await page.screenshot({ path: 'reports/initial-1024.png' });
  // Only who is in the room shown (the grown-ups start in the bedroom, W3L-24).
  const actors = (await readTown(page)).actors.filter(a => a.location.kind === 'interior' && a.location.room === 'sala');
  const boxes = await page.locator('canvas').evaluate((canvas, list) => {
    const box = canvas.getBoundingClientRect(), scale = box.width / Number(canvas.dataset.viewWidth);
    return list.map(a => {
      const width = (a.cat ? 70 : 84) * scale, height = (a.cat ? 94 : 189) * scale, foot = a.y + (a.seated ? 19 : 0);
      const x = box.x + (a.x - Number(canvas.dataset.viewX)) * scale, y = box.y + (foot - Number(canvas.dataset.viewY)) * scale;
      return { left: x - width / 2, right: x + width / 2, top: y - height, bottom: y, inside: x > box.x && x < box.x + box.width };
    });
  }, actors.map(a => ({ x: a.x, y: a.y, cat: ['mimi', 'nino', 'pipoca'].includes(a.id), seated: !!a.seat })));
  // W3L-03: with the 84 px strip the portrait scene is taller, so the room is drawn bigger and about half of its width shows at once;
  // Bia (the chosen one) opens whole in view, and the rest is reached by panning.
  expect(boxes[actors.findIndex(a => a.id === 'bia')]!.inside).toBe(true);
  for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top).toBe(true);
  // Nobody is cut by the scene's edge before any pan: each character is either whole in view or wholly out of it.
  const scene = (await page.locator('#world').boundingBox())!;
  const shown = actors.filter((_, i) => boxes[i]!.right > scene.x && boxes[i]!.left < scene.x + scene.width);
  for (const a of shown) {
    const half = (['mimi', 'nino', 'pipoca'].includes(a.id) ? 35 : 42);
    const [left, right] = [await point(page, a.x - half, a.y), await point(page, a.x + half, a.y)];
    expect(left.x, a.id).toBeGreaterThanOrEqual(scene.x); expect(right.x, a.id).toBeLessThanOrEqual(scene.x + scene.width);
  }
  await tray(page, 'Turma'); const card = page.locator('#cast button', { hasText: 'Bia' }).locator('img');
  const before = await card.getAttribute('src');
  await page.locator('#play-tray').getByRole('button', { name: 'Looks', exact: true }).click(); await page.getByRole('button', { name: 'Festa' }).click();
  await page.locator('#play-tray').getByRole('button', { name: 'Turma', exact: true }).click();
  await expect.poll(() => card.getAttribute('src')).not.toBe(before);
  await page.screenshot({ path: 'reports/ui-dock-dressed-1024.png' });
});

for (const viewport of [{ width: 844, height: 390 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
  test(`a personagem escolhida nasce a 24 px ou mais da borda da cena a ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport); await ready(page);
    const bia = (await readTown(page)).actors.find(a => a.id === 'bia')!, scene = (await page.locator('#world').boundingBox())!;
    const ring = await page.locator('canvas').evaluate((c, x) => {
      const box = c.getBoundingClientRect(), scale = box.width / Number(c.dataset.viewWidth), offset = Number(c.dataset.viewX) + Number(c.dataset.cameraX);
      return { left: box.x + (x - 42 - offset) * scale, right: box.x + (x + 42 - offset) * scale };
    }, bia.x);
    expect(ring.left - scene.x).toBeGreaterThanOrEqual(24); expect(scene.x + scene.width - ring.right).toBeGreaterThanOrEqual(24);
  });
}

test('a Turma inteira cabe sem rolagem a 1024 px, com a frase de cada um e o lápis só no cartão escolhido', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 }); await ready(page); await tray(page, 'Turma');
  await expect(page.locator('#cast .character')).toHaveCount(9);
  await expect(page.locator('#cast .motto')).toHaveText(actorIds.map(id => cards[id].motto));
  for (const motto of await page.locator('#cast .motto').all()) await expect(motto).toBeInViewport({ ratio: 1 });
  await expect(page.locator('#cast .rename:visible')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Mudar o nome de Bia', exact: true })).toBeVisible();
  expect(await page.locator('#play-tray').evaluate(n => n.scrollHeight <= n.clientHeight + 1)).toBe(true);
  await page.screenshot({ path: 'reports/cast-1024.png' });
});

test('nenhum ícone se repete entre botões visíveis ao mesmo tempo', async ({ page }) => {
  // Compares the drawing as rendered: each icon is rasterized with its computed transform. Two drawings repeat when
  // their silhouettes match and either both are one-colour icons (a mirrored or recoloured copy) or their colours match too.
  const repeated = () => page.evaluate(async () => {
    const size = 64, drawings: { name: string; rgba: Uint8ClampedArray; mono: boolean }[] = [];
    const raster = async (url: string, transform: string) => {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      const context = canvas.getContext('2d')!, m = transform === 'none' ? new DOMMatrix() : new DOMMatrix(transform);
      context.translate(size / 2, size / 2); context.transform(m.a, m.b, m.c, m.d, 0, 0); context.translate(-size / 2, -size / 2);
      context.drawImage(image, 0, 0, size, size);
      const rgba = context.getImageData(0, 0, size, size).data, colours = new Map<number, number>();
      for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3]! > 96) { const key = (rgba[i]! >> 5) << 6 | (rgba[i + 1]! >> 5) << 3 | rgba[i + 2]! >> 5; colours.set(key, (colours.get(key) ?? 0) + 1); }
      const opaque = [...colours.values()].reduce((a, b) => a + b, 0);
      return { rgba, mono: Math.max(...colours.values()) >= opaque * .9 };
    };
    for (const button of document.querySelectorAll<HTMLButtonElement>('button')) {
      if (!button.checkVisibility() || button.closest('[inert]')) continue;
      const before = getComputedStyle(button, '::before'), url = /url\("?(.+?)"?\)/.exec(before.backgroundImage)?.[1], image = button.querySelector('img');
      const name = button.textContent!.trim() || button.getAttribute('aria-label')!;
      if (url) drawings.push({ name, ...await raster(url, before.transform) });
      if (image?.src) drawings.push({ name, ...await raster(image.src, getComputedStyle(image).transform) });
    }
    const same = (a: typeof drawings[number], b: typeof drawings[number]) => {
      let union = 0, both = 0, difference = 0;
      for (let i = 3; i < a.rgba.length; i += 4) {
        const on = a.rgba[i]! > 96, other = b.rgba[i]! > 96;
        if (on || other) union++;
        if (on && other) { both++; if ([3, 2, 1].some(c => Math.abs(a.rgba[i - c]! - b.rgba[i - c]!) > 40)) difference++; }
      }
      return union > 0 && both / union > .9 && (a.mono && b.mono || difference / both < .005);
    };
    const repeats = drawings.flatMap((a, i) => drawings.slice(i + 1).filter(b => same(a, b)).map(b => [a.name, b.name]));
    return drawings.length > 4 ? repeats : [['poucos ícones vistos', String(drawings.length)]];
  });
  await ready(page); await page.locator('#tray-toggle').click();
  for (const tab of ['Turma', 'Looks', 'Objetos']) { await tray(page, tab); expect(await repeated()).toEqual([]); }
  await tray(page, 'Turma'); await page.locator('#cast .character').first().click(); await closeTray(page);
  await expect(page.locator('#actor-context')).toBeVisible(); expect(await repeated()).toEqual([]);
  await page.locator('#build-toggle').click(); expect(await repeated()).toEqual([]);
  await page.locator('#construct-mode').click(); expect(await repeated()).toEqual([]);
  await page.locator('#map-toggle').click(); expect(await repeated()).toEqual([]);
  await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click(); expect(await repeated()).toEqual([]);
  await page.locator('#play-mode').click(); expect(await repeated()).toEqual([]);
});
