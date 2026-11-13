import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { point, readTown, ready } from './helpers';
import { playMinutes } from './session';

const shots = 'reports/wave3-life-3';
/** The bedroom in view with the Bia (selected) and the Nino, the cat bed (piece 10) free; everyone else in the living room. */
async function seed(page: Page, autonomy = true) {
  const world = initialWorld();
  world.room = 'quarto';
  world.actors = world.actors.map(a => a.id === 'bia' ? { ...a, room: 'quarto', seat: null, x: 380, y: 530 } : a.id === 'nino' ? { ...a, room: 'quarto', seat: null, x: 560, y: 535 } : a);
  await page.clock.install({ time: new Date('2026-11-12T10:00:00') });
  await page.addInitScript(([value, on]) => {
    if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value!);
    if (on === 'off') localStorage.setItem('mundo-da-bia:autonomy', 'off');
  }, [encodeNeighborhood(migrateNeighborhood(initialAlbum(world))), autonomy ? 'on' : 'off']);
  await ready(page);
}
const nino = async (page: Page) => (await readTown(page)).actors.find(a => a.id === 'nino')!;

test('com o Nino com sono, em 2 min ele vai para a caminha', async ({ page }) => {
  test.setTimeout(150_000);
  await seed(page);
  // The cats' sleep (x1.5) reaches `precisa` at 12:30 of play; from then on, within 2 min he lies down in his bed.
  await playMinutes(page, 12);
  expect((await nino(page)).seat).toBeNull();
  for (let n = 0; n < 6 && (await nino(page)).seat !== '10.0'; n++) { await playMinutes(page, .5); await page.clock.runFor(6000); }
  expect(await nino(page)).toMatchObject({ seat: '10.0', resting: true });
  await page.screenshot({ path: `${shots}/autonomy-nino-cat-bed-1024.png` });
  await page.setViewportSize({ width: 844, height: 390 }); await page.clock.runFor(300);
  await page.screenshot({ path: `${shots}/autonomy-nino-cat-bed-844.png` });
});

test('com um arraste em curso, nada se mexe sozinho', async ({ page }) => {
  test.setTimeout(150_000);
  await seed(page);
  await playMinutes(page, 12);
  const before = await readTown(page);
  // A finger holds the Bia (a drag in progress) through 2.5 min of sleepy Nino.
  const at = await point(page, 380, 470); await page.mouse.move(at.x, at.y); await page.mouse.down();
  const away = await point(page, 330, 470); await page.mouse.move(away.x, away.y, { steps: 4 });
  for (let n = 0; n < 5; n++) { await playMinutes(page, .5); await page.clock.runFor(6000); }
  const during = await readTown(page);
  expect(during.actors.find(a => a.id === 'nino')).toEqual(before.actors.find(a => a.id === 'nino'));
  await page.mouse.up();
});

test('com o interruptor de autonomia desligado, o Nino com sono fica onde está', async ({ page }) => {
  test.setTimeout(150_000);
  await seed(page, false);
  await playMinutes(page, 12);
  for (let n = 0; n < 5; n++) { await playMinutes(page, .5); await page.clock.runFor(6000); }
  expect(await nino(page)).toMatchObject({ seat: null, x: 560, resting: false });
});
