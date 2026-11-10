import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { bringHere, point, read, ready, visitNeighbor } from './helpers';

async function seedShow(page: Page) {
  const world = initialWorld(); world.show = true;
  world.actors = world.actors.map((a, i) => ({ ...a, x: 160 + i * 110, y: 530, seat: null }));
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await ready(page);
}
const faces = async (page: Page) => Object.fromEntries((await page.locator('canvas').getAttribute('data-faces'))!.split(' ').map(f => f.split(':')));

for (const reduced of [false, true]) test(`no show a turma ri${reduced ? ', também com movimento reduzido (rosto sem dança)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 }); await seedShow(page);
  await expect.poll(async () => (await faces(page)).bia).toBe('laugh');
  const shown = await faces(page);
  for (const id of ['bia', 'luna', 'leo', 'rui', 'mimi', 'nino', 'pipoca']) expect(shown[id], id).toBe('laugh');
  await page.screenshot({ path: `reports/faces-show-laugh${reduced ? '-reduced' : ''}.png` });
});

test('entrar num cômodo mostra surpresa por cerca de 1,2 s', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await ready(page); await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await visitNeighbor(page); await bringHere(page);
  await page.clock.runFor(50);
  await expect.poll(async () => (await faces(page)).bia).toBe('surprise');
  await page.screenshot({ path: 'reports/faces-room-surprise.png' });
  await page.clock.runFor(1000); expect((await faces(page)).bia).toBe('surprise');
  await page.clock.runFor(400); expect((await faces(page)).bia).not.toBe('surprise');
});

test('a 1280 px os olhos da Bia medem 5 px ou mais na captura', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.setViewportSize({ width: 1280, height: 800 }); await ready(page); await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await page.screenshot({ path: 'reports/faces-eyes-1280.png' });
  const bia = (await read(page)).actors[0]!;
  // Bia's left eye sits about 11 left of and 130 above her feet (art 140 × 220 at scale 0.86); measure the tallest run of eye-dark pixels near it.
  const eye = await point(page, bia.x - 11, bia.y - 130), shot = await page.screenshot({ clip: { x: eye.x - 16, y: eye.y - 20, width: 32, height: 40 } });
  const tallest = await page.evaluate(async png => {
    const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const g = canvas.getContext('2d')!; g.drawImage(image, 0, 0); const d = g.getImageData(0, 0, canvas.width, canvas.height).data;
    let best = 0;
    for (let x = 0; x < canvas.width; x++) for (let y = 0, run = 0; y < canvas.height; y++) {
      const i = (y * canvas.width + x) * 4; run = d[i]! < 90 && d[i + 1]! < 90 && d[i + 2]! < 90 ? run + 1 : 0; best = Math.max(best, run);
    }
    return best;
  }, shot.toString('base64'));
  expect(tallest).toBeGreaterThanOrEqual(5);
});
