import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { Actor, ActorId, LookId } from '../src/domain/types';
import { drag, point, readTown, ready, tap } from './helpers';

// Review captures: the grown-ups' clothes fit, the arms come out of the sleeves. Close crops at twice the pixels of each grown-up in
// each look, standing, seated and with the arms up; and the family in the living room at 1024 and 1280 (FIT_LABEL: before/after).
test.use({ deviceScaleFactor: 2 });
const label = process.env.FIT_LABEL ?? 'after';
const adults: ActorId[] = ['daniel', 'fabiana', 'laura'];
const looks: LookId[] = ['sol', 'outing', 'market', 'office', 'doctor', 'firefighter', 'police'];
const who = async (page: Page, id: string) => (await readTown(page)).actors.find(a => a.id === id)!;
async function start(page: Page, size: { width: number; height: number }, spots: Partial<Record<ActorId, Partial<Actor>>>) {
  const world = initialWorld();
  world.actors = world.actors.map((a, n) => (spots[a.id] ? { ...a, room: 'sala', y: 530, seat: null, ...spots[a.id] } : { ...a, room: 'quarto', x: 120 + n * 85, y: 530, seat: null }) as Actor);
  await page.setViewportSize(size);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') });
  await page.addInitScript(value => { localStorage.setItem('mundo-da-bia:autonomy', 'off'); if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-13T10:01:30'));
  await page.clock.runFor(300);
}
async function crop(page: Page, id: string, name: string, prefix = `adult-fit-${label}-`) {
  const actor = await who(page, id), top = await point(page, actor.x - 110, actor.y - 330), bottom = await point(page, actor.x + 110, actor.y + 20);
  await page.screenshot({ path: `reports/review/${prefix}${name}.png`, clip: { x: top.x, y: top.y, width: bottom.x - top.x, height: bottom.y - top.y } });
}

for (const size of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }]) test(`adultos: a roupa veste, a ${size.width}`, async ({ page }) => {
  await start(page, size, { bia: { x: 330 }, daniel: { x: 490 }, fabiana: { x: 650 }, laura: { x: 810 } });
  await page.screenshot({ path: `reports/review/adult-fit-${label}-family-${size.width}.png` });
});

for (const [n, look] of looks.entries()) test(`adultos: de perto, em pé, sentado e com os braços para cima — ${look}`, async ({ page }) => {
  test.setTimeout(120_000);
  const sitter = adults[n % 3]!, others = adults.filter(a => a !== sitter);
  await start(page, { width: 1280, height: 800 }, { daniel: { x: 480, look }, fabiana: { x: 650, look }, laura: { x: 820, look } });
  for (const id of adults) await crop(page, id, `${id}-${look}-standing`);
  const seated = await who(page, sitter);
  await drag(page, [seated.x, seated.y - 150], [170, 380]);
  await expect.poll(async () => (await who(page, sitter)).seat).toBe('2.0');
  await page.clock.runFor(600);
  await crop(page, sitter, `${sitter}-${look}-seated`);
  for (const id of others) {
    const actor = await who(page, id);
    await drag(page, [actor.x, actor.y - 150], [170, 380]);
    await expect(page.locator('.missing-bubble')).toBeVisible();
    await page.clock.runFor(100);
    await crop(page, id, `${id}-${look}-raised`);
    await page.clock.runFor(1500);
    const now = await who(page, id);
    await drag(page, [now.x, now.y - 150], [actor.x, actor.y - 20]);
    await page.clock.runFor(1500);
  }
});

// The owner saw Fabiana in one outfit on the street and another in the market: the look she wears at home goes with her everywhere.
test('adultos: a Fabiana veste a mesma roupa em casa, na rua e no mercado', async ({ page }) => {
  test.setTimeout(120_000);
  const world = initialWorld();
  world.actors = world.actors.map((a, n) => ({ ...a, room: a.id === 'fabiana' || a.id === 'bia' ? 'sala' : 'quarto', x: a.id === 'fabiana' ? 650 : 120 + n * 85, y: 530, seat: null, look: a.id === 'fabiana' ? 'outing' : a.look }) as Actor);
  const town = neighborhoodAction(migrateNeighborhood(initialAlbum(world)), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(value => { localStorage.setItem('mundo-da-bia:autonomy', 'off'); if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); }, encodeNeighborhood(town));
  await ready(page);
  const market = town.buildings.find(b => b.model === 'shop')!, looks: string[] = [];
  const shot = async (place: string) => { looks.push((await who(page, 'fabiana')).look); await crop(page, 'fabiana', place, 'adult-fit-places-'); };
  const fabiana = await who(page, 'fabiana');
  await tap(page, fabiana.x, fabiana.y - 150);
  await expect(page.locator('#selected')).toHaveText('Fabiana');
  await shot('home');
  await page.locator('#map-toggle').click();
  await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click();
  await expect.poll(async () => (await who(page, 'fabiana')).location.kind).toBe('street');
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
  await page.waitForTimeout(800);
  await shot('street');
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: `Ir para ${market.name}`, exact: true }).click();
  await expect.poll(async () => (await who(page, 'fabiana')).location).toMatchObject({ kind: 'interior', building: market.id });
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
  await page.waitForTimeout(800);
  await shot('market');
  expect(looks).toEqual(['outing', 'outing', 'outing']);
});
