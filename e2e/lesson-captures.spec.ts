import { expect, test } from '@playwright/test';
import { chooseSubject, openSchool, seatAt, tapBoard } from './school-helpers';

// Captures of lot 8D for the art review, landscape only: 1024×768 and 1280×800.
const sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
const name = (view: string, size: typeof sizes[number]) => `reports/review/lot8d-${view}-${size.width}.png`;
const subjects = [['Desenho', 'drawing'], ['Escrita', 'writing'], ['Matemática', 'math']] as const;

for (const size of sizes) for (const [subject, view] of subjects) test(`capturas da aula de ${subject} a ${size.width}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(size);
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await openSchool(page);
  await seatAt(page, 'bia', 0); await seatAt(page, 'leo', 1);
  await page.clock.runFor(3000);
  await tapBoard(page);
  await expect(page.locator('#subject-chooser')).toBeVisible();
  if (view === 'drawing') await page.screenshot({ path: name('chooser', size) });
  await chooseSubject(page, subject);
  await page.clock.runFor(9000);
  await page.screenshot({ path: name(`${view}-mid`, size) });
  if (view !== 'math') return;
  await page.clock.runFor(9800);
  await page.screenshot({ path: name('math-end', size) });
});
