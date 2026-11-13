import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { plotSpots } from '../src/domain/garden';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import type { Piece } from '../src/domain/types';
import { visualPiecePoint } from '../src/presentation/furniture-scale';
import { onPiece, ready, readTown, tap } from './helpers';

const saveKey = 'mundo-da-bia:neighborhood:v3';
const stove: Piece = { id: 90, kind: 'stove', room: 'sala', x: 300, y: 250, color: 'original', flipped: false };
const noMilk = { farinha: 4, ovo: 4, acucar: 4, pao: 4, queijo: 4, peixe: 4, batata: 4, oleo: 4 };
async function open(page: Page, town: Neighborhood) {
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, [saveKey, encodeNeighborhood(town)]);
  await page.addInitScript(() => {
    const w = window as unknown as { bubbles: string[][] }; w.bubbles = [];
    new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => {
      if (n instanceof HTMLElement && /bubble/.test(n.className)) w.bubbles.push([...n.querySelectorAll('img')].map(i => i.getAttribute('src')!));
    }))).observe(document, { childList: true, subtree: true });
  });
  await ready(page);
}
const bubbles = (page: Page) => page.evaluate(() => (window as unknown as { bubbles: string[][] }).bubbles.flat());
/** Home with a stove in the living room, Bia there, the others in the bedroom; `stock` is the house's pantry. */
function home(stock: Record<string, number>): Neighborhood {
  const world = initialWorld();
  world.layout = { ...world.layout, pieces: [...world.layout.pieces.filter(p => p.kind !== 'wardrobe'), stove], nextId: 100 };
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 760, y: 520, seat: null }));
  const town = migrateNeighborhood(initialAlbum(world));
  return { ...town, buildings: town.buildings.map(b => b.id === 1 ? { ...b, stock } : b) };
}

test('W3L-23: com o leite zerado, a bancada mostra o leite em silhueta e tocar nele mostra a bolha do mercado (e o cartão Mercado brilha)', async ({ page }) => {
  await open(page, home(noMilk));
  await tap(page, ...await onPiece(page, 'stove', 355, 320));
  const bench = page.locator('#kitchen-bench');
  await expect(bench).toBeVisible();
  const milk = bench.locator('.bench-pantry [data-ingredient="leite"]');
  await expect(milk).toHaveAttribute('data-empty', 'true');
  await expect(bench.locator('.bench-pantry [data-ingredient="ovo"]')).not.toHaveAttribute('data-empty', 'true');
  expect(await milk.locator('img').evaluate(i => getComputedStyle(i).filter)).toContain('grayscale');
  await milk.click();
  await expect(bench).toHaveAttribute('data-bowl', '');
  await expect.poll(() => bubbles(page)).toContain('/art/market.svg#market');
  await expect(page.locator('#build-toggle')).toHaveClass(/wanted/);
  await page.screenshot({ path: 'reports/wave3-life-4/pantry-milk-out-1024.png' });
  await page.locator('#kitchen-bench .bench-close').click();
  await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
  await page.locator('#construct-plot').click();
  await expect(page.locator('#plot-dialog .building-choice[data-plan="market"]')).toHaveClass(/wanted/);
});

test('W3L-23: depois da primeira colheita, as sementes de milho aparecem na prateleira do mercado', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-11T15:00:00') });
  let town = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
  town = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'street' }, point: { x: 680, y: 525 } });
  town = { ...town, items: town.items.map(i => i.kind === 'bola' ? { ...i, x: 1500 } : i),
    progress: { ...town.progress, plaza: { 'praca-1': { crop: 'alface', stage: 4, since: 0, watered: false } } } };
  await open(page, town);
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  await tap(page, plotSpots['praca-1'].x, plotSpots['praca-1'].y - 40);
  for (let t = 0; t < 15000 && !(await readTown(page)).progress.shelves.length; t += 50) await page.clock.runFor(50);
  expect((await readTown(page)).progress.shelves).toEqual(['semente-milho']);
  await page.clock.resume();
  const market = (await readTown(page)).buildings.at(-1)!;
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: `Ir para ${market.name}`, exact: true }).click();
  await expect.poll(async () => (await readTown(page)).actors[0]!.location).toMatchObject({ kind: 'interior', building: market.id });
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
  // The hall's last shelf carries what has been revealed.
  const shelves = market.layout.pieces.filter(p => p.kind === 'market-shelf').sort((a, b) => a.id - b.id), last = shelves.at(-1)!;
  await tap(page, ...onPieceAt(last));
  await expect(page.locator('#market-panel .market-good[data-good="semente-milho"]')).toBeVisible();
  await page.screenshot({ path: 'reports/wave3-life-4/market-seeds-1024.png' });
});
/** The middle of a piece's lower half, on screen. */
function onPieceAt(piece: Piece): [number, number] {
  const point = visualPiecePoint(piece, { x: piece.x + 85, y: piece.y + 110 });
  return [point.x, point.y];
}
