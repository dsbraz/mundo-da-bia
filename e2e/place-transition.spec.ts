import { expect, test, type Page } from '@playwright/test';
import { points, read, readTown } from './helpers';
import { touchDrag } from './touch';

// W3L-04: a place change is never a dry cut. The new place is painted under a cover: closing, painted, opening.
async function open(page: Page, reduced = false) {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-01-01T10:00:00Z') });
  await page.setViewportSize({ width: 1024, height: 768 }); await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await page.clock.pauseAt(new Date('2026-01-01T10:02:00Z'));
  // Every phase, with the (fake) time it started.
  await page.evaluate(() => {
    const w = window as unknown as { phases: [string, number][] }; w.phases = [];
    new MutationObserver(() => w.phases.push([document.querySelector('canvas')!.dataset.transition ?? '', performance.now()]))
      .observe(document.querySelector('canvas')!, { attributes: true, attributeFilter: ['data-transition'] });
  });
}
const phases = (page: Page) => page.evaluate(() => (window as unknown as { phases: [string, number][] }).phases);
/** Bia, held by the chest, dropped on the "Rua" door: she crosses at once. */
async function cross(page: Page) {
  const bia = (await read(page)).actors.find(a => a.id === 'bia')!, [a, b] = await points(page, [[bia.x, bia.y - 90], [550, 320]]);
  await touchDrag(page, a!, b!);
}

test('porta: íris fecha na porta, a rua é pintada coberta, a íris abre; tudo em menos de 600 ms', async ({ page }) => {
  await open(page); await cross(page);
  await expect(page.locator('canvas')).toHaveAttribute('data-transition', 'closing');
  await expect(page.locator('.place-cover')).toHaveAttribute('data-kind', 'iris');
  expect((await readTown(page)).actors.find(a => a.id === 'bia')!.location).toEqual({ kind: 'street' });
  // While covered, the old room is still what is drawn.
  await expect(page.locator('canvas')).toHaveAttribute('data-street', 'false');
  await page.clock.runFor(230);
  await expect(page.locator('canvas')).toHaveAttribute('data-street', 'true');
  await page.clock.runFor(300);
  await expect(page.locator('canvas')).toHaveAttribute('data-transition', '');
  const seen = await phases(page);
  expect(seen.map(p => p[0])).toEqual(['closing', 'painted', 'opening', '']);
  expect(seen.at(-1)![1] - seen[0]![1]).toBeLessThan(600);
  await page.screenshot({ path: 'reports/wave3-life-1a/transition-door-end-1024.png' });
});

test('movimento reduzido: nenhuma íris, um fade de no máximo 120 ms', async ({ page }) => {
  await open(page, true); await cross(page);
  await expect(page.locator('canvas')).toHaveAttribute('data-transition', /closing|painted|opening/);
  await expect(page.locator('.place-cover')).toHaveAttribute('data-kind', 'fade');
  await page.clock.runFor(200);
  await expect(page.locator('canvas')).toHaveAttribute('data-transition', '');
  const seen = await phases(page);
  expect(seen.map(p => p[0])).toEqual(['closing', 'painted', 'opening', '']);
  expect(seen.at(-1)![1] - seen[0]![1]).toBeLessThanOrEqual(120 + 20);
});

const floorSpot = async (page: Page) => { const w = (await page.locator('#world').boundingBox())!; return { x: w.x + w.width * .3, y: w.y + w.height * .85 }; };
test('um toque durante o fechamento é guardado e aplicado quando o novo lugar aparece', async ({ page }) => {
  await open(page); await cross(page);
  await expect(page.locator('canvas')).toHaveAttribute('data-transition', 'closing');
  const spot = await floorSpot(page);
  await page.touchscreen.tap(spot.x, spot.y);
  await expect(page.locator('canvas')).not.toHaveAttribute('data-walking', 'bia');
  await page.clock.runFor(240);
  await expect(page.locator('canvas')).toHaveAttribute('data-transition', 'opening');
  await expect(page.locator('canvas')).toHaveAttribute('data-walking', 'bia');
});
test('um toque durante a abertura funciona na hora', async ({ page }) => {
  await open(page); await cross(page);
  await page.clock.runFor(240);
  await expect(page.locator('canvas')).toHaveAttribute('data-transition', 'opening');
  const spot = await floorSpot(page);
  await page.touchscreen.tap(spot.x, spot.y); await page.clock.runFor(40);
  await expect(page.locator('canvas')).toHaveAttribute('data-walking', 'bia');
  await expect(page.locator('canvas')).toHaveAttribute('data-transition', 'opening');
});
