import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import type { Piece, World } from '../src/domain/types';
import { onPiece, ready, tap } from './helpers';

const stove: Piece = { id: 1, kind: 'stove', room: 'sala', x: 300, y: 250, color: 'original', flipped: false };
/** A v3 save with a stove in a small living room and Bia alone at x 760; `change` adjusts the neighborhood before saving. */
async function start(page: Page, change: (town: Neighborhood) => Neighborhood = town => town) {
  const world: World = initialWorld();
  world.layout = { ...world.layout, pieces: [stove], nextId: 100, rooms: { ...world.layout.rooms, sala: { ...world.layout.rooms.sala!, size: 'small' } } };
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 760, y: 520, seat: null }));
  world.items = world.items.map(i => ({ ...i, room: 'quarto', spot: 'floor', x: 500, y: 520 }));
  await page.clock.install({ time: new Date('2026-01-01T09:00:00Z') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(change(migrateNeighborhood(initialAlbum(world)))));
  await ready(page);
}
const book = (page: Page) => page.locator('#recipe-book');
const entry = (page: Page, recipe: string) => book(page).locator(`.book-entry[data-recipe="${recipe}"]`);
async function turnTo(page: Page, id: string) { await book(page).locator(`.book-tab[data-page="${id}"]`).click(); await expect(book(page)).toHaveAttribute('data-page', id); }
/** Every text and every label in the book, to check that no digit shows anywhere. */
const words = (page: Page) => book(page).evaluate(node => [node.textContent ?? '', ...Array.from(node.querySelectorAll('[aria-label],[title],img[alt]'),
  n => `${n.getAttribute('aria-label') ?? ''} ${n.getAttribute('title') ?? ''} ${n.getAttribute('alt') ?? ''}`)].join(' '));

for (const reduced of [false, true]) test(`num save novo, a página do forno mostra o bolo colorido e o pão de queijo em silhueta, sem página de segredos${reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await page.locator('#book-toggle').click();
  await expect(book(page)).toBeVisible();
  await expect(page.locator('#book-toggle')).toHaveAttribute('aria-expanded', 'true');
  await turnTo(page, 'forno');
  await expect(entry(page, 'bolo-simples')).toHaveAttribute('data-known', 'true');
  await expect(entry(page, 'bolo-simples')).toHaveAttribute('aria-label', 'Bolo simples');
  await expect(entry(page, 'pao-de-queijo')).toHaveAttribute('data-known', 'false');
  await expect(entry(page, 'pao-de-queijo').locator('[data-ingredient]')).toHaveCount(1);
  await expect(entry(page, 'pao-de-queijo').locator('[data-ingredient="queijo"]')).toHaveCount(1);
  await expect(book(page).locator('.book-tab')).toHaveCount(4);
  await expect(book(page).locator('[data-page="segredos"]')).toHaveCount(0);
  await expect(entry(page, 'chocolate-quente')).toHaveCount(0);
  expect(await words(page)).not.toMatch(/\d/);
  for (const width of [1024, 1280]) {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 800 });
    await page.clock.runFor(150);
    await page.screenshot({ path: `reports/recipe-book-${width}${reduced ? '-reduced' : ''}.png` });
  }
  await book(page).locator('.book-close').click();
  await expect(book(page)).toBeHidden();
  // One thing over the scene at a time: the tray and the book take turns.
  await page.locator('#tray-toggle').click();
  await expect(page.locator('#tray-toggle')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#book-toggle').click();
  await expect(page.locator('#tray-toggle')).toHaveAttribute('aria-expanded', 'false');
  await page.locator('#tray-toggle').click();
  await expect(book(page)).toBeHidden();
});

test('depois de cozinhar o pão de queijo, o livro da bancada mostra ele colorido; o livro some em Criar', async ({ page }) => {
  await start(page);
  await tap(page, ...await onPiece(page, 'stove', 355, 320));
  const bench = page.locator('#kitchen-bench');
  for (const id of ['farinha', 'queijo', 'ovo']) await bench.locator(`.bench-pantry [data-ingredient="${id}"]`).click();
  await bench.locator('[data-utensil="forno"]').click();
  await bench.locator('.bench-book').click();
  await turnTo(page, 'forno');
  await expect(entry(page, 'pao-de-queijo')).toHaveAttribute('data-known', 'true');
  await expect(entry(page, 'pao-de-queijo').locator('[data-ingredient]')).toHaveCount(3);
  await expect(book(page).locator('[data-page="segredos"]')).toHaveCount(0);
  await page.locator('#build-toggle').click();
  await expect(book(page)).toBeHidden();
  await expect(page.locator('#book-toggle')).toBeHidden();
});

test('a página de segredos aparece com o primeiro segredo; o caprichado tem fita e o cartão revela os ingredientes', async ({ page }) => {
  await start(page, town => ({ ...town, progress: { ...town.progress, recipes: ['chocolate-quente'], fancy: ['chocolate-quente', 'torrada'], revealed: ['pizza'] } }));
  await page.locator('#book-toggle').click();
  await turnTo(page, 'segredos');
  await expect(book(page).locator('.book-entry')).toHaveCount(1);
  await expect(entry(page, 'chocolate-quente')).toHaveAttribute('data-fancy', 'true');
  await expect(entry(page, 'chocolate-quente').locator('.book-ribbon')).toBeVisible();
  await page.screenshot({ path: 'reports/recipe-book-secrets.png' });
  await turnTo(page, 'forno');
  await expect(entry(page, 'torrada').locator('.book-ribbon')).toBeVisible();
  await expect(entry(page, 'pizza')).toHaveAttribute('data-known', 'false');
  await expect(entry(page, 'pizza').locator('[data-ingredient]')).toHaveCount(3);
  expect(await words(page)).not.toMatch(/\d/);
});
