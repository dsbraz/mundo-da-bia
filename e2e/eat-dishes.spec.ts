import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { RecipeId } from '../src/domain/progress';
import type { World } from '../src/domain/types';
import { closeTray, drag, point, readTown, ready, tray } from './helpers';

const spots = { bia: 760, luna: 300, mimi: 480 } as Record<string, number>;
/** The living room with Bia, Luna and Mimi and one dish on the floor at x 600 (v3 save); clock installed before loading. */
async function table(page: Page, recipe: RecipeId) {
  const world: World = initialWorld();
  world.layout = { ...world.layout, pieces: world.layout.pieces.filter(p => p.room !== 'sala'), nextId: 100 };
  world.actors = world.actors.map(a => ({ ...a, room: a.id in spots ? 'sala' : 'quarto', x: spots[a.id] ?? 500, y: 520, seat: null }));
  world.items = world.items.map(i => ({ ...i, room: 'quarto', spot: 'floor', x: 500, y: 520 }));
  const town = migrateNeighborhood(initialAlbum(world));
  const dish = { id: '20:prato' as const, kind: 'prato' as const, recipe, room: 'sala' as const, location: { kind: 'interior' as const, building: 1, room: 'sala' as const },
    x: 620, y: 500, holder: null, spot: 'floor' as const };
  await page.clock.install({ time: new Date('2026-01-01T09:00:00Z') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood({ ...town, nextItem: 21, items: [...town.items, dish] }));
  await page.setViewportSize({ width: 1280, height: 800 }); await ready(page);
}
const canvas = (page: Page) => page.locator('canvas');
const dishes = async (page: Page) => (await readTown(page)).items.filter(i => i.kind === 'prato');
const actor = async (page: Page, id: string) => (await readTown(page)).actors.find(a => a.id === id)!;
async function clip(page: Page, x: number) {
  const a = await point(page, x - 170, 230), b = await point(page, x + 170, 560);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}

for (const reduced of [false, true]) test(`soltar a pizza na Luna: ela come, o prato some e o favorito dá dança e coração${reduced ? ' (movimento reduzido: braços para cima, sem confete)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await table(page, 'pizza');
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  await drag(page, [620, 490], [300, 420]);
  await expect.poll(() => dishes(page)).toEqual([]);
  expect((await actor(page, 'luna')).fed).toBe(true);
  await expect(canvas(page)).toHaveAttribute('data-favorite', 'luna');
  await expect(canvas(page)).toHaveAttribute('data-heart', 'luna');
  await expect(canvas(page)).toHaveAttribute('data-reaction', /^luna:/);
  await page.clock.runFor(300);
  if (reduced) await expect(canvas(page)).not.toHaveAttribute('data-confetti', 'on'); else await expect(canvas(page)).toHaveAttribute('data-confetti', 'on');
  await page.screenshot({ path: `reports/eat-favorite${reduced ? '-reduced' : ''}.png`, clip: await clip(page, 300) });
  await expect(page.locator('#announcement')).not.toContainText(/\d/);
});

test('soltar a pizza na Mimi: ela cheira, prefere peixinho e o prato fica', async ({ page }) => {
  await table(page, 'pizza');
  await drag(page, [620, 490], [480, 470]);
  await expect(page.locator('#announcement')).toHaveText('Miau? (Mimi: prefiro peixinho)');
  expect((await dishes(page)).map(d => d.id)).toEqual(['20:prato']);
  expect((await actor(page, 'mimi')).fed).toBe(false);
});

test('pegar o ovo mexido pela bandeja e usar Comer: o botão mostra o prato, a Bia come e a mão fica livre', async ({ page }) => {
  await table(page, 'ovo-mexido');
  await tray(page, 'Objetos');
  const card = page.getByRole('button', { name: 'Ovo mexido', exact: true });
  await expect(card.locator('img')).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await card.click(); await closeTray(page);
  await expect.poll(async () => (await dishes(page))[0]?.holder).toBe('bia');
  const eat = page.getByRole('button', { name: 'Comer', exact: true });
  await expect(eat).toBeEnabled();
  await expect(eat.locator('img')).toHaveAttribute('src', /^data:image\/svg\+xml/);
  for (const width of [768, 1024, 1280]) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : width === 1024 ? 768 : 800 });
    await page.clock.runFor(150);
    await page.screenshot({ path: `reports/eat-panel-${width}.png` });
  }
  await eat.click();
  await expect.poll(() => dishes(page)).toEqual([]);
  expect((await actor(page, 'bia')).fed).toBe(true);
});
