import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { plotSpots } from '../src/domain/garden';
import { plazaPlots } from '../src/domain/progress';
import { point, ready } from './helpers';

const lawn = [0xcb, 0xd8, 0xad], wood = [0xcb, 0xa8, 0x81], wetSoil = [0x86, 0x66, 0x4c], drySoil = [0xb0, 0x8b, 0x69];
/** The colour drawn at plaza point (x, y): the centre pixel of a small capture around it. */
async function colourAt(page: Page, x: number, y: number) {
  const at = await point(page, x, y), shot = await page.screenshot({ clip: { x: at.x - 2, y: at.y - 2, width: 5, height: 5 } });
  return page.evaluate(async png => {
    const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const g = canvas.getContext('2d')!; g.drawImage(image, 0, 0);
    return Array.from(g.getImageData(Math.floor(image.width / 2), Math.floor(image.height / 2), 1, 1).data.slice(0, 3));
  }, shot.toString('base64'));
}
const distance = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i]!)));

test('a 1024 os quatro canteiros da horta (caixa e terra) e uma planta regada ficam na frente do gramado', async ({ page }) => {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  town.location = { kind: 'street' };
  town.actors = town.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'street' }, x: 200, y: 540 } : a);
  town.items = town.items.map(i => i.kind === 'bola' ? { ...i, x: 1500 } : i);
  town.progress = { ...town.progress, plaza: { 'praca-1': { crop: 'tomate', stage: 2, since: Date.parse('2026-01-01T00:00:00Z'), watered: true } } };
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); }, encodeNeighborhood(town));
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.setViewportSize({ width: 1024, height: 768 }); await ready(page);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await page.keyboard.press('Shift'); await page.clock.runFor(100);
  await page.screenshot({ path: 'reports/plaza-flowerbed-1024.png' });
  // The front of every box is wood; the watered plot's soil is darker than a dry one's; its plant's leaf is green over the box.
  for (const plot of plazaPlots) {
    const { x, y } = plotSpots[plot], seen = await colourAt(page, x - 25, y - 9);
    expect(distance(seen, lawn), `${plot} (${x - 25}, ${y - 9}) = ${seen}`).toBeGreaterThan(30);
    expect(distance(seen, wood), `${plot} (${x - 25}, ${y - 9}) = ${seen}`).toBeLessThanOrEqual(16);
  }
  const soil = (plot: 'praca-1' | 'praca-2') => colourAt(page, plotSpots[plot].x + 22, plotSpots[plot].y - 30);
  expect(distance(await soil('praca-1'), wetSoil), `${await soil('praca-1')}`).toBeLessThanOrEqual(16);
  expect(distance(await soil('praca-2'), drySoil), `${await soil('praca-2')}`).toBeLessThanOrEqual(16);
  const leaf = await colourAt(page, plotSpots['praca-1'].x - 9, plotSpots['praca-1'].y - 36);
  expect(distance(leaf, [0x7f, 0xb0, 0x69]), `${leaf}`).toBeLessThanOrEqual(16);
});
