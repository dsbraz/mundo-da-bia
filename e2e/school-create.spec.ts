import { expect, test } from '@playwright/test';
import { openSchool, seatAt, tapBoard, chooseSubject } from './school-helpers';
import { closeTray, readTown, tray } from './helpers';

test('Criar fecha a escolha da aula; voltar a Brincar permite escolher novamente', async ({ page }) => {
  await openSchool(page); await seatAt(page, 'bia', 0); await tapBoard(page);
  await expect(page.locator('#subject-chooser')).toBeVisible();
  await page.locator('#build-toggle').click();
  await expect(page.locator('#subject-chooser')).toBeHidden();
  await page.locator('#play-mode').click(); await tapBoard(page);
  await expect(page.locator('#subject-chooser')).toBeVisible();
});

for (const reduced of [false, true]) test(`Criar encerra aula antes de editar, sem entregar folha tardia: reduzido=${reduced}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await openSchool(page); await seatAt(page, 'bia', 0); await tapBoard(page); await chooseSubject(page);
  await expect(page.locator('canvas')).toHaveAttribute('data-lesson', 'sol:drawing');
  await page.locator('#build-toggle').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-lesson', '');
  await tray(page, 'Atividades');
  await page.getByRole('button', { name: 'Adicionar Letreiro Palco Neon' }).click(); await closeTray(page);
  await page.clock.fastForward(21_000); await page.clock.runFor(32);
  expect((await readTown(page)).items.filter(i => i.kind === 'papel')).toEqual([]);
  await page.locator('#undo').click();
  await page.locator('#play-mode').click();
  await tapBoard(page); await chooseSubject(page);
  await page.clock.fastForward(21_000); await page.clock.runFor(32);
  await expect.poll(async () => (await readTown(page)).items.filter(i => i.kind === 'papel').length).toBe(1);
});
