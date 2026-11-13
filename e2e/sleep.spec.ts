import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { World } from '../src/domain/types';
import { closeTray, readTown, ready, tray } from './helpers';
import { playMinutes } from './session';

const shots = 'reports/wave3-life-3';
/** `world` as the v3 save, the fake clock first (paused after loading: scene time moves only with `runFor`). */
async function seed(page: Page, world: World) {
  await page.clock.install({ time: new Date('2026-11-12T10:00:00') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-12T10:00:30'));
}
const actor = async (page: Page, id: string) => (await readTown(page)).actors.find(a => a.id === id)!;
const sleep = async (page: Page) => Object.fromEntries((await page.locator('#app').getAttribute('data-sleep') ?? '').split(' ').filter(Boolean).map(f => f.split(':')));
/** Selects the Bia in the cast and presses `name` in her action ring (behind "Mais ações" when the ring is short). */
async function press(page: Page, name: string) {
  await tray(page); await page.locator('#cast [data-actor=bia]').click(); await closeTray(page);
  const button = page.getByRole('button', { name, exact: true });
  if (!await button.isVisible()) await page.getByRole('button', { name: 'Mais ações', exact: true }).click();
  await button.click();
}
const night = (page: Page) => page.locator('canvas').getAttribute('data-night');

for (const reduced of [false, true]) test(`à noite, deitar a Bia leva à manhã em até 3 s de cena e zera o sono de quem está deitado${reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  const world = initialWorld();
  // The Bia and the Léo in the bedroom, the Luna on the living-room sofa (she sleeps through too), the Rui standing (he does not).
  world.actors = world.actors.map(a => a.id === 'bia' ? { ...a, room: 'quarto', x: 400, y: 520 } : a.id === 'leo' ? { ...a, room: 'quarto', x: 250, y: 530 } : a);
  world.room = 'quarto';
  await seed(page, world);
  await playMinutes(page, 12);
  await page.clock.runFor(1500);
  expect(await night(page)).toMatch(/^noite:/);
  await press(page, 'Deitar');
  // The walk to the pillow, then the fade: from the moment she lies down, the morning comes within 3 s of scene time.
  for (let t = 0; t < 15_000 && !(await actor(page, 'bia')).resting; t += 100) await page.clock.runFor(100);
  expect(await actor(page, 'bia')).toMatchObject({ seat: '8.0', resting: true });
  await page.clock.runFor(reduced ? 100 : 1200);
  if (!reduced) await page.screenshot({ path: `${shots}/sleep-fade-1024.png` });
  let waited = reduced ? 100 : 1200;
  for (; waited < 3000 && !(await night(page))!.startsWith('manha'); waited += 100) await page.clock.runFor(100);
  expect(waited).toBeLessThanOrEqual(3000);
  expect(await night(page)).toMatch(/^manha:/);
  await page.clock.runFor(1500);
  // Who slept wakes up (out of bed, on the floor in front of it) and says good morning: that line replaces her "rested" one.
  expect(await actor(page, 'bia')).toMatchObject({ seat: null, resting: false, y: 530 });
  await expect(page.locator('canvas')).toHaveAttribute('data-reaction', 'bia:Bom dia! Já é de manhã.');
  const after = await sleep(page);
  expect([after.bia, after.luna]).toEqual(['0', '0']);
  expect(Number(after.rui)).toBeGreaterThan(40);
  const suffix = reduced ? '-reduced' : '';
  await page.screenshot({ path: `${shots}/sleep-morning-bed-1024${suffix}.png` });
  await page.setViewportSize({ width: 844, height: 390 }); await page.clock.runFor(300);
  await page.screenshot({ path: `${shots}/sleep-morning-bed-844${suffix}.png` });
  expect(JSON.stringify(await readTown(page))).not.toMatch(/"needs"|sono/);
});

for (const [width, height] of [[1024, 768], [844, 390]] as const) test(`numa cozinha, Descansar mostra a bolha da cama com a porta, e tocar nela leva a Bia até o quarto (${width})`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width, height });
  const world = initialWorld();
  world.layout = { ...world.layout, rooms: { ...world.layout.rooms, sala: { ...world.layout.rooms.sala, template: 'kitchen' } }, pieces: world.layout.pieces.filter(p => p.kind !== 'sofa') };
  world.actors = world.actors.map(a => ({ ...a, seat: null, y: 530 }));
  await seed(page, world);
  await press(page, 'Descansar');
  const bubble = page.locator('.missing-bubble:not(.thought)');
  await expect(bubble).toHaveAttribute('data-need', 'bed');
  await expect(bubble).toHaveAttribute('data-door', 'true');
  await expect(bubble.locator('img.need')).toHaveAttribute('src', '/art/needs.svg#bed');
  expect(await actor(page, 'bia')).toMatchObject({ resting: false, room: 'sala' });
  await page.clock.runFor(200);
  await page.screenshot({ path: `${shots}/sleep-no-bed-bubble-${width}.png` });
  // The bubble takes a touch now: it never covers the open action ring.
  const [b, ring] = [await bubble.boundingBox(), await page.locator('#actor-context').boundingBox()];
  if (b && ring) expect(b.x + b.width <= ring.x || b.x >= ring.x + ring.width || b.y + b.height <= ring.y || b.y >= ring.y + ring.height).toBe(true);
  await bubble.click();
  for (let t = 0; t < 8000 && (await actor(page, 'bia')).room !== 'quarto'; t += 100) await page.clock.runFor(100);
  expect((await actor(page, 'bia')).location).toMatchObject({ kind: 'interior', room: 'quarto' });
});
