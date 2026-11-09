import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { test, expect } from '@playwright/test';
import { ready, readTown, tray, closeTray } from './helpers';
for (const size of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 1792, height: 768 }]) {
  test(`enquadramento integral e alvos acessíveis coincidem em ${size.width}`, async ({ page }) => {
    if (size.width === 1792) {
      const world = initialWorld(); world.layout.rooms.sala.size = 'large';
      await page.addInitScript(value => localStorage.setItem('mundo-da-bia:neighborhood:v2', value), encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
    }
    await page.setViewportSize(size); await ready(page);
    const saved = await readTown(page);
    const canvas = page.locator('canvas');
    const inspect = () => canvas.evaluate(c => {
      const box = c.getBoundingClientRect(), parent = c.parentElement!;
      const scale = box.width / Number(c.dataset.viewWidth);
      return { rasterWidth: c.width, rasterHeight: c.height, width: box.width, height: box.height, parentWidth: parent.clientWidth, parentHeight: parent.clientHeight,
        scale, x: Number(c.dataset.viewX), y: Number(c.dataset.viewY), visibleWidth: Number(c.dataset.viewWidth), visibleHeight: Number(c.dataset.viewHeight) };
    });
    const frame = await inspect();
    expect(frame.rasterWidth / 2).toBeCloseTo(frame.visibleWidth, 0);
    expect(frame.rasterHeight / 2).toBeCloseTo(frame.visibleHeight, 0);
    expect(frame.width).toBe(frame.parentWidth); expect(frame.height).toBe(frame.parentHeight);
    expect(frame.scale).toBeCloseTo(Math.min(frame.width / 1000, frame.height / 600));
    expect(frame.x).toBeLessThanOrEqual(0); expect(frame.y).toBeLessThanOrEqual(0);
    expect(frame.x + frame.visibleWidth).toBeGreaterThanOrEqual(999.9);
    expect(frame.y + frame.visibleHeight).toBeGreaterThanOrEqual(599.9);
    await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
    expect(await inspect()).toEqual(frame);
    const error = await page.locator('[data-world-x]').evaluateAll(buttons => {
      const c = document.querySelector('canvas')!, box = c.getBoundingClientRect(), scale = box.width / Number(c.dataset.viewWidth);
      return Math.max(...buttons.map(node => {
        const b = node as HTMLElement;
        return Math.abs(parseFloat(b.style.left) - box.left - (Number(b.dataset.worldX) - Number(c.dataset.viewX) - Number(c.dataset.cameraX)) * scale);
      }));
    });
    expect(error).toBeLessThan(.1);
    expect(await readTown(page)).toEqual(saved);
    await page.screenshot({ path: `reports/framing-${size.width}.png` });
  });
}
