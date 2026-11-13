import { expect, test } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { readTown, ready, tray } from './helpers';
import { playMinutes } from './session';

// Lot 6B: "Todos para a cama": at night a moon in the Turma drawer sends everyone of the house to a free bed or sofa (the cats to their
// bed, or the rug); in view they walk there; whoever is left with no place asks for a bed with the missing bubble.
for (const size of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }]) test(`todos para a cama, à noite, pela Turma, a ${size.width}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(size);
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') });
  await page.addInitScript(value => { localStorage.setItem('mundo-da-bia:autonomy', 'off'); if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(initialWorld()))));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-13T10:01:30'));
  // In the morning the moon is not there.
  await tray(page, 'Turma');
  await expect(page.locator('#bedtime')).toBeHidden();
  // Dusk comes after 12 minutes of play: then it shows at the top of the Turma.
  await playMinutes(page, 12);
  const moon = page.getByRole('button', { name: 'Todos para a cama', exact: true });
  await expect(moon).toBeVisible();
  // Above the Turma cards (outside them, so the cards keep their order).
  await expect(page.locator('.bedtime-card + #cast')).toHaveCount(1);
  await page.screenshot({ path: `reports/review/lot6b-bedtime-moon-${size.width}.png` });
  await moon.click();
  // Right away: everyone of the house in a bed or on a sofa (the cats in the cat bed or on the rug); no place for Rui and the grown-ups.
  const town = await readTown(page), who = (id: string) => town.actors.find(a => a.id === id)!;
  expect(who('bia')).toMatchObject({ room: 'quarto', seat: '8.0', resting: true });
  expect(who('leo')).toMatchObject({ room: 'sala', seat: '2.0', resting: true });
  expect(who('luna')).toMatchObject({ seat: '2.1', resting: true });
  expect(town.actors.filter(a => a.kind === 'cat').every(a => a.resting)).toBe(true);
  for (const id of ['rui', 'daniel', 'fabiana']) expect(who(id).resting).toBe(false);
  // The drawer closes; in view Léo walks to the free sofa seat; Rui asks for a bed (the door: there is one in the bedroom, taken now).
  await expect(page.locator('#tray-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('canvas')).toHaveAttribute('data-strolled', /leo/);
  await expect(page.locator('.missing-bubble:not(.thought)')).toHaveAttribute('data-need', 'bed');
  await page.clock.runFor(1000);
  await page.screenshot({ path: `reports/review/lot6b-bedtime-${size.width}.png` });
  // The selected Bia lies in the bedroom's bed: the night passes as when she lies down herself, even seen from the living room.
  for (let t = 0; t < 4000 && !(await page.locator('canvas').getAttribute('data-night'))!.startsWith('manha'); t += 100) await page.clock.runFor(100);
  expect(await page.locator('canvas').getAttribute('data-night')).toMatch(/^manha:/);
  await page.clock.runFor(1500);
  await expect(page.locator('#bedtime')).toBeHidden();
});
