import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { read, ready, tap } from './helpers';

// W3L-03: the scene takes the width, the Turma drawer overlays it (closed by default, remembered) and the actions float in a ring.
const sceneShare = async (page: Page) => (await page.locator('#world').boundingBox())!.width / page.viewportSize()!.width;
const view = (page: Page) => page.locator('canvas').evaluate(c => ({ x: c.dataset.viewX, y: c.dataset.viewY, width: c.dataset.viewWidth }));

test('a 1024 com alguém escolhido a cena tem 95% da largura; a gaveta abre por cima, escolhe o Léo, fecha e o estado volta ao recarregar', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 }); await ready(page);
  await tap(page, 520, 440);
  await expect(page.locator('#actor-context')).toBeVisible();
  expect(await sceneShare(page)).toBeGreaterThanOrEqual(.95);
  await expect(page.locator('#play-tray')).toBeHidden();
  const before = await view(page);
  await page.locator('#tray-toggle').click();
  await expect(page.locator('#play-tray')).toBeVisible();
  expect(await sceneShare(page)).toBeGreaterThanOrEqual(.95);
  expect(await view(page)).toEqual(before);
  await page.locator('#cast .character').filter({ hasText: 'Léo' }).click();
  await expect(page.locator('#selected')).toHaveText('Léo');
  await page.locator('#tray-toggle').click();
  await expect(page.locator('#play-tray')).toBeHidden();
  expect(await view(page)).toEqual(before);
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#play-tray')).toBeHidden();
  await page.locator('#tray-toggle').click(); await expect(page.locator('#play-tray')).toBeVisible();
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#play-tray')).toBeVisible();
  await expect(page.locator('#context-toggle')).toHaveCount(0);
});

test('Comer no anel, ao lado da personagem, funciona sem abrir a gaveta; os alvos têm 56 px ou mais', async ({ page }) => {
  const world = initialWorld();
  world.items = world.items.map(i => i.id === 'lanche' ? { ...i, holder: 'bia', spot: 'floor' } : i);
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); }, encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await page.setViewportSize({ width: 1024, height: 768 }); await ready(page);
  await tap(page, 520, 440);
  const ring = page.locator('#actor-context'), eat = ring.locator('[data-slot=eat]');
  await expect(eat).toBeEnabled();
  const bia = (await read(page)).actors.find(a => a.id === 'bia')!;
  const feet = await page.locator('canvas').evaluate((c, p) => { const r = c.getBoundingClientRect(), s = r.width / Number(c.dataset.viewWidth); return { x: r.x + (p.x - Number(c.dataset.viewX) - Number(c.dataset.cameraX)) * s, y: r.y + (p.y - Number(c.dataset.viewY)) * s }; }, bia);
  // Right above her: centred on her and clear of her body (the floor and the people beside her stay free).
  const box = (await ring.boundingBox())!;
  expect(box.x).toBeLessThanOrEqual(feet.x); expect(box.x + box.width).toBeGreaterThanOrEqual(feet.x);
  expect(box.y + box.height).toBeLessThan(feet.y - 150);
  for (const button of await ring.locator('button:visible').all()) { const b = (await button.boundingBox())!; expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(56); }
  const toggle = (await page.locator('#tray-toggle').boundingBox())!; expect(toggle.height).toBeGreaterThanOrEqual(56);
  await eat.click();
  await expect.poll(async () => (await read(page)).actors.find(a => a.id === 'bia')!.fed).toBe(true);
  await expect(page.locator('#play-tray')).toBeHidden();
  await ring.locator('#more-actions').click();
  await expect(ring.locator('[data-slot=play]')).toBeVisible();
});

