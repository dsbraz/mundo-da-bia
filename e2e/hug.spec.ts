import { expect, test, type Page } from '@playwright/test';
import { drag, readTown, ready } from './helpers';
import { playMinutes, playUntilTrue } from './session';

const shots = 'reports/wave3-life-2';
/** A new save with the autonomy switched off (the Luna would hug a sad Léo on her own), clock installed first. */
async function start(page: Page) {
  await page.clock.install({ time: new Date('2026-11-12T10:00:00') });
  await page.addInitScript(() => localStorage.setItem('mundo-da-bia:autonomy', 'off'));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-12T10:00:30'));
}
const face = async (page: Page, id: string) => Object.fromEntries((await page.locator('canvas').getAttribute('data-faces'))!.split(' ').map(f => f.split(':')))[id];
/** Bia (feet at 520, 530) dragged by her body onto Léo (feet at 420, 530). */
const hugLeo = (page: Page) => drag(page, [520, 450], [420, 450]);

test('soltar a Bia sobre o Léo: os dois se abraçam e o save só registra a posição', async ({ page }) => {
  await start(page);
  const before = await readTown(page);
  await hugLeo(page);
  await expect(page.locator('canvas')).toHaveAttribute('data-drop-outcome', 'hugged');
  await expect(page.locator('canvas')).toHaveAttribute('data-hug', 'bia:leo:hug');
  await page.clock.runFor(300);
  await page.screenshot({ path: `${shots}/hug-bia-leo-1024.png` });
  const after = await readTown(page), strip = (town: typeof after) => ({ ...town, actors: town.actors.map(a => a.id === 'bia' ? { ...a, x: 0, y: 0, seat: null } : a) });
  expect(strip(after)).toEqual(strip(before));
  const bia = after.actors.find(a => a.id === 'bia')!;
  expect([bia.x, bia.y]).toEqual([490, 530]);
  expect(JSON.stringify(after)).not.toMatch(/"needs"|alegria|tedio/);
});

for (const reduced of [false, true]) test(`com o Léo triste, o abraço da Bia devolve o rosto dele${reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await playMinutes(page, 13);
  await playUntilTrue(page, async () => await face(page, 'leo') === 'sad', 1.5);
  await page.setViewportSize({ width: 844, height: 390 }); await page.clock.runFor(200);
  await page.screenshot({ path: `${shots}/hug-leo-sad-844${reduced ? '-reduced' : ''}.png` });
  await hugLeo(page);
  await expect(page.locator('canvas')).toHaveAttribute('data-hug', 'bia:leo:hug');
  await page.clock.runFor(200);
  expect(await face(page, 'leo')).not.toBe('sad');
  await page.screenshot({ path: `${shots}/hug-leo-after-844${reduced ? '-reduced' : ''}.png` });
});
