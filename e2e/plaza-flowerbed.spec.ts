import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { point, ready } from './helpers';

const lawn = [0xcb, 0xd8, 0xad];
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

test('a 1024 o canteiro da praça (caixa e folhas) fica na frente do gramado', async ({ page }) => {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  town.location = { kind: 'street' }; town.outdoor = { ...town.outdoor, watered: true };
  town.actors = town.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'street' }, x: 200, y: 540 } : a);
  town.items = town.items.map(i => i.kind === 'bola' ? { ...i, x: 1500 } : i);
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(town));
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.setViewportSize({ width: 1024, height: 768 }); await ready(page);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await page.keyboard.press('Shift'); await page.clock.runFor(100);
  await page.screenshot({ path: 'reports/plaza-flowerbed-1024.png' });
  // Points inside both the lawn ellipse and the flowerbed: the brown box and two watered leaves.
  for (const [x, y, colour] of [[560, 446, [0xbe, 0x9c, 0x79]], [540, 452, [0xbe, 0x9c, 0x79]], [526, 417, [0x92, 0xba, 0x87]], [556, 417, [0x92, 0xba, 0x87]]] as const) {
    const seen = await colourAt(page, x, y);
    expect(distance(seen, lawn), `(${x}, ${y}) = ${seen}`).toBeGreaterThan(30);
    expect(distance(seen, [...colour]), `(${x}, ${y}) = ${seen}`).toBeLessThanOrEqual(16);
  }
});
