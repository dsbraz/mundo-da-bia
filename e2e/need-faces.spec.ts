import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { closeTray, readTown, ready, tray } from './helpers';
import { playMinutes } from './session';

const shots = 'reports/wave3-life-2';
/** The living room as a new save, Luna in the bedroom, and Bia holding a plate of scrambled eggs (not her favourite); clock first. */
async function seed(page: Page) {
  const world = initialWorld();
  world.actors = world.actors.map(a => a.id === 'luna' ? { ...a, room: 'quarto', seat: null, x: 400, y: 520 } : a);
  const town = migrateNeighborhood(initialAlbum(world)), bia = town.actors.find(a => a.id === 'bia')!;
  const dish = { id: '20:prato' as const, kind: 'prato' as const, recipe: 'ovo-mexido', room: 'sala' as const, location: bia.location, x: bia.x, y: bia.y, holder: 'bia' as const, spot: 'floor' as const };
  await page.clock.install({ time: new Date('2026-11-12T10:00:00') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood({ ...town, nextItem: 21, items: [...town.items, dish] }));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-12T10:00:30'));
}
/** Plays `minutes` with the Bia taking a step every tick, so she is never idle: her sadness here comes from hunger and sleep, not from
 *  standing still (lot 3: boredom reaches `precisa` at 14 min for whoever stands still). */
async function playWalking(page: Page, minutes: number) {
  await page.locator('#world').focus();
  for (let n = 0; n < minutes * 2; n++) { await page.keyboard.press(n % 2 ? 'ArrowLeft' : 'ArrowRight'); await playMinutes(page, .5); }
}
const face = async (page: Page, id: string) => Object.fromEntries((await page.locator('canvas').getAttribute('data-faces'))!.split(' ').map(f => f.split(':')))[id];
const thought = (page: Page) => page.locator('.missing-bubble.thought:not([hidden])');
/** At most one bubble in the room, and nothing written: no digit, no bar or meter anywhere in the needs' drawings. */
async function oneDrawnBubble(page: Page) {
  expect(await page.locator('.missing-bubble:not([hidden])').count()).toBeLessThanOrEqual(1);
  const text = await page.locator('.missing-bubble, [data-actor] .portrait-need').evaluateAll(all => all.map(e => e.textContent ?? '').join(''));
  expect(text).not.toMatch(/\d/);
  expect(await page.locator(':is(.missing-bubble, #cast, .hint-cast) :is(meter, progress, [role=progressbar], [role=meter])').count()).toBe(0);
}

test('6 min sem comer: a bolha de prato na Bia, uma só por cômodo, e a bolha pequena da Luna no retrato', async ({ page }) => {
  test.setTimeout(180_000);
  await seed(page);
  await playMinutes(page, 6);
  // `pede` shows the bubble 4 s in every 40 s: within the next 40 s of play it comes.
  for (let t = 0; t < 41_000 && !await thought(page).count(); t += 1000) { await page.clock.runFor(1000); await oneDrawnBubble(page); }
  await expect(thought(page)).toHaveAttribute('data-actor', 'bia');
  await expect(thought(page)).toHaveAttribute('data-need', 'fome');
  await expect(thought(page).locator('img')).toHaveAttribute('src', '/art/needs.svg#food');
  await oneDrawnBubble(page);
  await page.screenshot({ path: `${shots}/thought-plate-1024.png` });
  await page.setViewportSize({ width: 844, height: 390 }); await page.clock.runFor(200);
  await page.screenshot({ path: `${shots}/thought-plate-844.png` });
  await expect(page.locator('#cast [data-actor=luna] .portrait-need')).toHaveAttribute('src', '/art/needs.svg#food');
  await expect(page.locator('#cast [data-actor=bia] .portrait-need')).toHaveCount(0);
  await tray(page); await page.clock.runFor(300);
  await page.screenshot({ path: `${shots}/turma-portrait-need-844.png` });
  await page.locator('#cast [data-actor=luna]').screenshot({ path: `${shots}/turma-portrait-luna-zoom.png` });
  await page.clock.runFor(5000); await oneDrawnBubble(page);
});

for (const reduced of [false, true]) test(`13 min 20 s: rosto de fome; com sono alto também, triste (sem lágrima); um prato devolve o rosto feliz no mesmo segundo${reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page);
  // Hunger +3/min from breakfast at 30: `precisa` at 13 min 20 s of play, before her sleep (14 min 30 s).
  await playWalking(page, 12.5);
  for (let n = 0; n < 4 && await face(page, 'bia') !== 'hungry'; n++) await playWalking(page, .5);
  await expect.poll(() => face(page, 'bia')).toBe('hungry');
  // `precisa`: the bubble stays.
  await expect(thought(page)).toHaveAttribute('data-band', 'precisa');
  const suffix = reduced ? '-reduced' : '';
  await page.screenshot({ path: `${shots}/face-hungry-1024${suffix}.png` });
  // Sleep reaches `precisa` at 14 min 30 s of play (dusk and night add +12/min).
  for (let n = 0; n < 6 && await face(page, 'bia') !== 'sad'; n++) await playWalking(page, .5);
  expect(await face(page, 'bia')).toBe('sad');
  await oneDrawnBubble(page);
  await page.screenshot({ path: `${shots}/face-sad-1024${suffix}.png` });
  await page.setViewportSize({ width: 844, height: 390 }); await page.clock.runFor(200);
  await page.screenshot({ path: `${shots}/face-sad-844${suffix}.png` });
  await tray(page); await page.locator('#cast [data-actor=bia]').click(); await closeTray(page);
  await page.getByRole('button', { name: 'Comer', exact: true }).click();
  // She walks to the free sofa seat and eats there; the moment the dish is gone her face is happy again.
  for (let t = 0; t < 8000 && (await readTown(page)).items.some(i => i.kind === 'prato'); t += 100) await page.clock.runFor(100);
  expect((await readTown(page)).items.some(i => i.kind === 'prato')).toBe(false);
  for (let t = 0; t < 1000 && await face(page, 'bia') !== 'happy'; t += 100) await page.clock.runFor(100);
  expect(await face(page, 'bia')).toBe('happy');
  await page.screenshot({ path: `${shots}/face-happy-after-dish-844${suffix}.png` });
});
