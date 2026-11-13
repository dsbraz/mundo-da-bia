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
  // Dusk comes after 12 minutes of play: then it is the first card of the Turma.
  await playMinutes(page, 12);
  const moon = page.getByRole('button', { name: 'Todos para a cama', exact: true });
  await expect(moon).toBeVisible();
  await expect(page.locator('#cast > :first-child #bedtime')).toHaveCount(1);
  await page.screenshot({ path: `reports/review/lot6b-bedtime-moon-${size.width}.png` });
  await moon.click();
  // The drawer closes; in view Léo walks to the free sofa seat; Rui finds no place and asks for a bed.
  await expect(page.locator('#tray-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('canvas')).toHaveAttribute('data-strolled', /leo/);
  await expect(page.locator('.missing-bubble:not(.thought)')).toHaveAttribute('data-need', 'bed');
  await page.clock.runFor(1500);
  await page.screenshot({ path: `reports/review/lot6b-bedtime-${size.width}.png` });
  const town = await readTown(page), who = (id: string) => town.actors.find(a => a.id === id)!;
  expect(who('bia')).toMatchObject({ room: 'quarto', seat: '8.0', resting: true });
  expect(who('leo')).toMatchObject({ room: 'sala', seat: '2.0', resting: true });
  expect(who('luna')).toMatchObject({ seat: '2.1', resting: true });
  expect(town.actors.filter(a => a.kind === 'cat').every(a => a.resting)).toBe(true);
  for (const id of ['rui', 'daniel', 'fabiana']) expect(who(id).resting).toBe(false);
  // The cats in the bedroom and the Bia in the bed, seen from there.
  await page.clock.runFor(4000);
  await page.keyboard.press('Escape');
});
