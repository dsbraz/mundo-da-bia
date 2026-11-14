import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { lookIds, type Actor, type ActorId, type LookId } from '../src/domain/types';
import { drag, point, readTown, ready } from './helpers';

// Lot 8B review: with the arms up (the shrug of a refused seat) the sleeves go up with them. One close crop per child look, each look in
// both cuts (on Bia and Léo, or on Luna and Rui), and per grown-up.
test.use({ deviceScaleFactor: 2 });
const kids: ActorId[] = ['bia', 'luna', 'leo', 'rui'];
const batches = Array.from({ length: Math.ceil(lookIds.length / 2) }, (_, n) => [lookIds[2 * n]!, lookIds[2 * n + 1] ?? lookIds[0]!]);
const who = async (page: Page, id: string) => (await readTown(page)).actors.find(a => a.id === id)!;
async function start(page: Page, looks: Partial<Record<ActorId, LookId>>, standing: ActorId[], sitter: ActorId = 'daniel') {
  const world = initialWorld(), spots = Object.fromEntries(standing.map((id, n) => [id, 480 + n * 150]));
  world.actors = world.actors.map((a, n) => (spots[a.id] ? { ...a, room: 'sala', x: spots[a.id], y: 530, seat: null, look: looks[a.id] ?? a.look }
    : a.id === sitter ? { ...a, room: 'sala', x: 330, y: 530, seat: null } : { ...a, room: 'quarto', x: 120 + n * 85, y: 530, seat: null }) as Actor);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') });
  await page.addInitScript(value => { localStorage.setItem('mundo-da-bia:autonomy', 'off'); if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-13T10:01:30'));
  await page.clock.runFor(300);
  // One takes the sofa; whoever is dropped on his seat is refused and shrugs, arms up.
  const seated = await who(page, sitter);
  await drag(page, [seated.x, seated.y - 150], [170, 380]);
  await expect.poll(async () => (await who(page, sitter)).seat).toBe('2.0');
}
async function raise(page: Page, id: string, name: string) {
  const actor = await who(page, id), adult = ['daniel', 'fabiana', 'laura'].includes(id);
  await drag(page, [actor.x, actor.y - 150], [170, 380]);
  await expect(page.locator('.missing-bubble')).toBeVisible();
  await page.clock.runFor(100);
  const back = await who(page, id), top = await point(page, back.x - 120, back.y - (adult ? 330 : 280)), bottom = await point(page, back.x + 120, back.y + 20);
  await page.screenshot({ path: `reports/review/lot8b-raised-${name}.png`, clip: { x: top.x, y: top.y, width: bottom.x - top.x, height: bottom.y - top.y } });
  await page.clock.runFor(1500);
  // Back to its spot, out of the way of the next one.
  const now = await who(page, id);
  await drag(page, [now.x, now.y - 150], [actor.x, actor.y - 20]);
  await page.clock.runFor(1500);
}

for (const [girls, boys] of batches) test(`lote 8B: a manga sobe com o braço — ${girls} e ${boys}`, async ({ page }) => {
  // Four crops at twice the pixels, each with clock steps that render slowly: more than the 90 s of the other batches.
  test.setTimeout(180_000);
  await start(page, { bia: girls, luna: boys, leo: girls, rui: boys }, kids);
  for (const [id, look] of [['bia', girls], ['luna', boys], ['leo', girls], ['rui', boys]] as const) await raise(page, id, `${id}-${look}`);
});

test('lote 8B: a manga sobe com o braço — Daniel e Laura', async ({ page }) => {
  test.setTimeout(90_000);
  await start(page, {}, ['daniel', 'laura'], 'fabiana');
  for (const id of ['daniel', 'laura']) await raise(page, id, id);
});

test('lote 8B: a manga sobe com o braço — Fabiana', async ({ page }) => {
  test.setTimeout(90_000);
  await start(page, {}, ['fabiana']);
  await raise(page, 'fabiana', 'fabiana');
});
