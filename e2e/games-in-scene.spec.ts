import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { playUntil, point, read, tap, openPlay } from './helpers';

/** An empty living room: Bia at x 700, the others watching at x 200 and 330; paused clock; every scene reaction recorded in order. */
async function playground(page: Page, game: 'Pular corda' | 'Amarelinha') {
  const world = initialWorld(); world.layout.pieces = [];
  world.items.forEach(i => { i.spot = 'floor'; i.x = 100; });
  world.actors.forEach(a => { a.x = a.id === 'bia' ? 700 : a.id === 'luna' ? 330 : 200; a.y = a.kind === 'cat' ? 540 : 530; a.seat = null; });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await page.setViewportSize({ width: 1280, height: 800 }); await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => {
    const seen: string[] = []; Reflect.set(window, 'reactions', seen);
    const canvas = document.querySelector('canvas')!;
    // Records arrive batched: each one's old value is the previous set, so the sequence is rebuilt from them.
    new MutationObserver(records => { records.slice(1).forEach(r => seen.push(r.oldValue ?? '')); seen.push(canvas.dataset.reaction ?? ''); })
      .observe(canvas, { attributeFilter: ['data-reaction'], attributeOldValue: true });
  });
  await tapActor(page, 700);
  await openPlay(page);
  await page.getByRole('button', { name: game, exact: true }).click();
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await playUntil(page, () => page.locator('#game-panel').getAttribute('data-phase'), 'playing', 100);
}
async function tapActor(page: Page, x: number) { const p = await point(page, x, 450); await page.mouse.click(p.x, p.y); }
const canvas = (page: Page) => page.locator('canvas');
/** A floor spot in view, well away from Bia and not under the game panel (W3L-03: the scene takes the full width and the panel floats
 *  over its right side, so the old fixed x = 900 landed on the panel). */
async function floor(page: Page) {
  const bia = (await read(page)).actors.find(a => a.id === 'bia')!, panel = (await page.locator('#game-panel').boundingBox())!;
  for (const x of [bia.x - 250, bia.x + 250, bia.x - 180, bia.x + 180]) {
    const at = await point(page, x, 500), scene = (await page.locator('#world').boundingBox())!;
    const free = at.x > scene.x + 20 && at.x < scene.x + scene.width - 20 && !(at.x >= panel.x && at.x <= panel.x + panel.width && at.y >= panel.y && at.y <= panel.y + panel.height);
    if (free) return x;
  }
  throw new Error('no free floor beside Bia');
}
const reactions = (page: Page) => page.evaluate(() => Reflect.get(window, 'reactions') as string[]);
async function clip(page: Page, x: number) { const a = await point(page, x - 200, 250), b = await point(page, x + 200, 570); return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y }; }

for (const reduced of [false, true]) test(`a corda se joga olhando só a cena: o chão pisca no "Agora!" e errar faz careta${reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await playground(page, 'Pular corda');
  // The panel is covered: only the scene tells when to jump.
  await page.addStyleTag({ content: '#game-panel{opacity:0!important}' });
  await playUntil(page, () => canvas(page).getAttribute('data-rope-cue'), '', 30);
  await tap(page, await floor(page), 500);
  await expect.poll(async () => (await reactions(page)).at(-1)).toBe('bia:Ops! Quase, Bia!');
  await page.clock.runFor(200);
  await page.screenshot({ path: `reports/games-rope-goof${reduced ? '-reduced' : ''}.png`, clip: await clip(page, 700) });
  await page.clock.runFor(250); // past the 400 ms between two jumps
  await playUntil(page, () => canvas(page).getAttribute('data-rope-cue'), 'now', 30);
  await page.screenshot({ path: `reports/games-rope-cue${reduced ? '-reduced' : ''}.png`, clip: await clip(page, 700) });
  const before = (await reactions(page)).length;
  await tap(page, await floor(page), 500);
  await expect(page.locator('#game-message')).toContainText('Isso!');
  expect((await reactions(page)).length).toBe(before);
});

for (const reduced of [false, true]) test(`tocar na Luna durante a amarelinha não encerra: ela bate palmas; no fim, braços para cima e torcida${reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await playground(page, 'Amarelinha');
  await tapActor(page, 330);
  await expect.poll(async () => (await reactions(page)).at(-1)).toBe('luna:Vai, Bia!');
  await expect(page.locator('#game-panel')).toBeVisible();
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing');
  await page.clock.runFor(150);
  await page.screenshot({ path: `reports/games-luna-claps${reduced ? '-reduced' : ''}.png`, clip: await clip(page, 330) });
  for (let i = 0; i < 11; i++) { await page.keyboard.press('Space'); await page.clock.runFor(450); }
  await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'complete');
  const seen = await reactions(page);
  expect(seen).toContain('bia:Uhuu, Bia! Ida e volta!');
  expect(seen.slice(seen.indexOf('bia:Uhuu, Bia! Ida e volta!'))).toContain('luna:Vai, Bia!');
  // Confetti only with full motion (no particles when reduced).
  if (reduced) await expect(canvas(page)).not.toHaveAttribute('data-confetti', 'on');
  else await expect(canvas(page)).toHaveAttribute('data-confetti', 'on');
  if (!reduced) await page.screenshot({ path: 'reports/games-hopscotch-cheer.png' });
  await page.clock.runFor(reduced ? 300 : 200);
  if (reduced) await page.screenshot({ path: 'reports/games-hopscotch-cheer-reduced.png' });
});
