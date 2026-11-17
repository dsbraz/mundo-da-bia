import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { buy } from '../src/domain/market';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import { drag, points, readTown, ready } from './helpers';

const fresh = () => migrateNeighborhood(initialAlbum(initialWorld()));
async function open(page: Page, town: Neighborhood) {
  await page.addInitScript(value => {
    if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value);
  }, encodeNeighborhood(town));
  await ready(page);
}

test('construir o décimo nono mercado e recarregar preserva o bairro', async ({ page }) => {
  let town = fresh();
  for (let plot = 1; plot <= 18; plot++) town = neighborhoodAction(town, { type: 'construct', plot, model: 'shop', plan: 'market' });
  await open(page, town);
  await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click(); await page.locator('#construct-plot').click();
  await page.locator('#plot-dialog .building-choice[data-plan="market"]').click(); await page.locator('#plot-dialog button').last().click();
  expect((await readTown(page)).buildings).toHaveLength(20);
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  expect((await readTown(page)).buildings).toHaveLength(20);
  expect(await page.evaluate(() => localStorage.getItem('mundo-da-bia:neighborhood:v3:recovery'))).toBeNull();
});

test('teclado para ao lado da mesa e permite afastar-se', async ({ page }) => {
  const world = initialWorld();
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 420, y: 530, seat: null }));
  await open(page, migrateNeighborhood(initialAlbum(world))); await page.locator('#world').focus();
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  expect((await readTown(page)).actors.find(a => a.id === 'bia')).toMatchObject({ x: 420, y: 530, seat: null });
  await page.keyboard.press('ArrowRight');
  expect((await readTown(page)).actors.find(a => a.id === 'bia')).toMatchObject({ x: 440, y: 530 });
});

for (const offset of [15, 100]) test(`banco recebe os pés com pegada a ${offset} unidades`, async ({ page }) => {
  const town = neighborhoodAction(fresh(), { type: 'transport', actor: 'bia', location: { kind: 'street' }, point: { x: 300, y: 520 } });
  await open(page, { ...town, items: town.items.map(i => i.kind === 'bola' ? { ...i, x: 1500 } : i) });
  if (offset === 15) await drag(page, [300, 520 - offset], [180, 445 - offset]);
  else {
    const [from, to] = await points(page, [[300, 520 - offset], [180, 445 - offset]]);
    const touch = await page.context().newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from!, id: 1 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...to!, id: 1 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await touch.detach();
  }
  await expect.poll(async () => (await readTown(page)).outdoor.bench).toBe('bia');
});

test('excluir mercado devolve a sacola não paga e permite voltar para casa', async ({ page }) => {
  let town = neighborhoodAction(fresh(), { type: 'construct', model: 'shop', plan: 'market', plot: 1 });
  town = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'interior', building: 2, room: 'sala' }, point: { x: 520, y: 540 } });
  const shelf = town.buildings[1]!.layout.pieces.find(p => p.kind === 'market-shelf')!;
  await open(page, buy(town, { actor: 'bia', piece: shelf.id, good: 'pao' }).town);
  await page.locator('#build-toggle').click(); await page.locator('#map-toggle').click();
  await page.getByRole('button', { name: 'Organizar', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir casa…', exact: true }).click();
  await page.getByRole('button', { name: 'Segure para excluir', exact: true }).click({ delay: 2100 });
  await expect.poll(async () => (await readTown(page)).buildings.length).toBe(1);
  expect((await readTown(page)).items.some(i => i.kind === 'sacola')).toBe(false);
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
  await page.locator('#play-mode').click(); await page.locator('#map-toggle').click();
  await page.getByRole('button', { name: 'Ir para Minha casa', exact: true }).click();
  await expect.poll(async () => (await readTown(page)).location).toEqual({ kind: 'interior', building: 1, room: 'sala' });
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  expect((await readTown(page)).actors.find(a => a.id === 'bia')!.location).toEqual({ kind: 'interior', building: 1, room: 'sala' });
});
