import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { spawnItem } from '../src/domain/portable';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { Actor, ActorId, LookId } from '../src/domain/types';
import { drag, point, points, readTown, ready } from './helpers';

// Lot 8 polish review: close crops of the arm that goes around in a hug, with its garment's sleeve (short and long cuts, a child's and a
// grown-up's), and of the raised child garments' waist.
test.use({ deviceScaleFactor: 2 });
const who = async (page: Page, id: string) => (await readTown(page)).actors.find(a => a.id === id)!;
async function start(page: Page, spots: Partial<Record<ActorId, { x: number; look?: LookId }>>, extra = (town: Neighborhood) => town) {
  const world = initialWorld();
  world.actors = world.actors.map((a, n) => spots[a.id] ? { ...a, room: 'sala', y: 530, seat: null, x: spots[a.id]!.x, look: spots[a.id]!.look ?? a.look } as Actor
    : { ...a, room: 'quarto', x: 120 + n * 85, y: 530, seat: null });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') });
  await page.addInitScript(value => { localStorage.setItem('mundo-da-bia:autonomy', 'off'); if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(extra(migrateNeighborhood(initialAlbum(world)))));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-13T10:01:30'));
  await page.clock.runFor(300);
}
/** `id` is dropped on `other`: its arm goes around them; a close crop of the two while they hold the hug. */
async function hug(page: Page, id: ActorId, other: ActorId, name: string) {
  const from = await who(page, id), to = await who(page, other);
  await drag(page, [from.x, from.y - 80], [to.x, to.y - 80]);
  await expect(page.locator('canvas')).toHaveAttribute('data-embrace', new RegExp(`^${id}:${other}:`));
  await page.clock.runFor(100);
  const a = await who(page, id), b = await who(page, other), mid = (a.x + b.x) / 2;
  const top = await point(page, mid - 130, a.y - 340), bottom = await point(page, mid + 130, a.y + 10);
  await page.screenshot({ path: `reports/review/lot8-polish-hug-${name}.png`, clip: { x: top.x, y: top.y, width: bottom.x - top.x, height: bottom.y - top.y } });
  await page.clock.runFor(1500);
}

test('polimento do lote 8: a manga no braço do abraço — crianças', async ({ page }) => {
  test.setTimeout(90_000);
  await start(page, { bia: { x: 400 }, leo: { x: 520, look: 'office' }, luna: { x: 760, look: 'spiderman' }, rui: { x: 880, look: 'chef' } });
  await hug(page, 'bia', 'leo', 'bia-sol');
  await hug(page, 'leo', 'bia', 'leo-office');
  await hug(page, 'luna', 'rui', 'luna-spiderman');
  await hug(page, 'rui', 'luna', 'rui-chef');
});

test('polimento do lote 8: a manga no braço do abraço — adultos', async ({ page }) => {
  test.setTimeout(90_000);
  await start(page, { bia: { x: 380 }, fabiana: { x: 500 }, leo: { x: 760 }, daniel: { x: 880, look: 'outing' }, laura: { x: 1080 } });
  await hug(page, 'fabiana', 'bia', 'fabiana-sol');
  await hug(page, 'daniel', 'leo', 'daniel-outing');
  await hug(page, 'bia', 'fabiana', 'bia-on-fabiana');
  await hug(page, 'laura', 'daniel', 'laura-sol');
});

/** The Bia holds a book (lot 8C: sitting with it is reading). */
function withBook(town: Neighborhood): Neighborhood {
  const bia = town.actors.find(a => a.id === 'bia')!, spawned = spawnItem(town, { kind: 'livro', location: bia.location, point: { x: bia.x, y: bia.y } });
  return { ...spawned, items: spawned.items.map(i => i.kind === 'livro' ? { ...i, holder: 'bia' } : i) };
}
test('polimento do lote 8: tirada do sofá, a leitora fecha o livro na hora', async ({ page }) => {
  test.setTimeout(90_000);
  await start(page, { bia: { x: 480 } }, withBook);
  const bia = await who(page, 'bia');
  await drag(page, [bia.x, bia.y - 150], [170, 380]);
  await expect(page.locator('canvas')).toHaveAttribute('data-reading', 'bia');
  await page.clock.runFor(300);
  const seated = await who(page, 'bia'), crop = async (name: string, x: number, y: number) => {
    const top = await point(page, x - 160, y - 300), bottom = await point(page, x + 160, y + 40);
    await page.screenshot({ path: `reports/review/lot8-polish-book-${name}.png`, clip: { x: top.x, y: top.y, width: bottom.x - top.x, height: bottom.y - top.y } });
  };
  await crop('reading', seated.x, seated.y);
  // Held up off the sofa, not yet let go: the book is closed in her hand.
  const [from, to] = await points(page, [[seated.x, seated.y - 120], [seated.x + 220, seated.y - 160]]);
  await page.mouse.move(from!.x, from!.y); await page.mouse.down();
  await page.mouse.move(to!.x, to!.y, { steps: 8 }); await page.clock.runFor(100);
  await crop('lifted', seated.x + 220, seated.y - 40);
  await page.mouse.up();
});

test('polimento do lote 8: com os braços para cima, a cintura do vestido sem degrau', async ({ page }) => {
  test.setTimeout(90_000);
  await start(page, { daniel: { x: 330 }, bia: { x: 520, look: 'festa' }, luna: { x: 700, look: 'aurora' }, leo: { x: 880, look: 'spiderman' } });
  // Daniel takes the sofa; whoever is dropped on his seat is refused and shrugs, arms up.
  const daniel = await who(page, 'daniel');
  await drag(page, [daniel.x, daniel.y - 150], [170, 380]);
  await expect.poll(async () => (await who(page, 'daniel')).seat).toBe('2.0');
  for (const id of ['bia', 'luna', 'leo'] as const) {
    const actor = await who(page, id);
    await drag(page, [actor.x, actor.y - 150], [170, 380]);
    await expect(page.locator('.missing-bubble')).toBeVisible();
    await page.clock.runFor(100);
    const back = await who(page, id), top = await point(page, back.x - 70, back.y - 140), bottom = await point(page, back.x + 70, back.y - 20);
    await page.screenshot({ path: `reports/review/lot8-polish-waist-${id}.png`, clip: { x: top.x, y: top.y, width: bottom.x - top.x, height: bottom.y - top.y } });
    await page.clock.runFor(1500);
    const now = await who(page, id);
    await drag(page, [now.x, now.y - 150], [actor.x, actor.y - 20]);
    await page.clock.runFor(1500);
  }
});
