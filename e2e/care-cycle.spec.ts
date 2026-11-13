import { expect, test, type Page } from '@playwright/test';
import { closeTray, point, read, ready, tray } from './helpers';

const canvas = (page: Page) => page.locator('canvas');
async function clip(page: Page) {
  const bia = (await read(page)).actors[0]!, a = await point(page, bia.x - 140, bia.y - 260), b = await point(page, bia.x + 140, bia.y + 20);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}
/** Bia takes the snack from the fridge (a short walk, in running time). */
async function holdSnack(page: Page) {
  await tray(page, 'Objetos'); await page.getByRole('button', { name: 'Lanche', exact: true }).click(); await closeTray(page);
  await expect.poll(async () => (await read(page)).items.find(i => i.id === '1:lanche')!.holder).toBe('bia');
}

for (const reduced of [false, true]) test(`comer mostra um coração que some; descansar e acordar deixa comer de novo${reduced ? ' (movimento reduzido: só esmaece)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.setViewportSize({ width: 1280, height: 800 }); await ready(page);
  await holdSnack(page);
  // The heart runs on scene time: pause the clock, eat (no actionability wait, it needs animation frames) and step through it.
  await page.clock.pauseAt(new Date('2026-01-01T00:10:00Z'));
  await page.getByRole('button', { name: 'Comer', exact: true }).click({ force: true });
  expect((await read(page)).actors[0]!.fed).toBe(true);
  await expect(canvas(page)).toHaveAttribute('data-heart', 'bia');
  await page.clock.runFor(400);
  await page.screenshot({ path: `reports/care-heart${reduced ? '-reduced' : ''}.png`, clip: await clip(page) });
  await page.clock.runFor(800);
  await expect(canvas(page)).toHaveAttribute('data-heart', '');
  await page.clock.resume();
  // Still fed (the panel says so), but nothing stays drawn over the head.
  await expect(page.locator('#actor-status img[alt="Bia está de barriga cheia"]')).toHaveCount(1);
  await expect(page.locator('#app')).not.toContainText('Já comeu');
  await page.getByRole('button', { name: 'Descansar', exact: true }).click();
  // W3L-15: she walks to the free sofa seat first and lies down when she gets there.
  await expect.poll(async () => (await read(page)).actors[0], { timeout: 15_000 }).toMatchObject({ resting: true, fed: true });
  await page.getByRole('button', { name: 'Acordar', exact: true }).click();
  expect((await read(page)).actors[0]).toMatchObject({ resting: false, fed: false });
  await expect(page.locator('#actor-status img[alt="Bia está de barriga cheia"]')).toHaveCount(0);
  await holdSnack(page);
  await page.getByRole('button', { name: 'Comer', exact: true }).click();
  expect((await read(page)).actors[0]!.fed).toBe(true);
  await expect(canvas(page)).toHaveAttribute('data-heart', 'bia');
});
