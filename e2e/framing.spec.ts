import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { test, expect } from '@playwright/test';
import { ready, readTown, tray, closeTray, openPlay } from './helpers';
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
        scale, x: Number(c.dataset.viewX), y: Number(c.dataset.viewY), visibleWidth: Number(c.dataset.viewWidth), visibleHeight: Number(c.dataset.viewHeight), world: Number(c.dataset.logicalWidth) };
    });
    const frame = await inspect();
    expect(frame.rasterWidth / 2).toBeCloseTo(frame.visibleWidth, 0);
    expect(frame.rasterHeight / 2).toBeCloseTo(frame.visibleHeight, 0);
    expect(frame.width).toBe(frame.parentWidth); expect(frame.height).toBe(frame.parentHeight);
    // The scene is filled: no band above the ceiling, below the floor or beside the walls; the rest of a wide room is reached by panning.
    // W3L-03: the scene now takes the whole width, so on a screen wider than the room at full height (1280×800, 1792×768) the room
    // fills the width and a little of the ceiling and floor is cut evenly, never the floor where the turma stands.
    expect(frame.scale).toBeCloseTo(Math.max(frame.height / 600, frame.width / frame.world));
    if (frame.width / frame.world <= frame.height / 600) { expect(frame.y).toBeCloseTo(0); expect(frame.visibleHeight).toBeCloseTo(600); }
    else {
      expect(frame.visibleWidth).toBeCloseTo(frame.world); expect(frame.y).toBeGreaterThanOrEqual(0); expect(frame.y + frame.visibleHeight).toBeLessThanOrEqual(600.1);
      for (const actor of saved.actors) expect(actor.y, actor.id).toBeLessThanOrEqual(frame.y + frame.visibleHeight - 20);
    }
    expect(frame.x).toBeGreaterThanOrEqual(-.1); expect(frame.x + frame.visibleWidth).toBeLessThanOrEqual(frame.world + .1);
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

// Drawn human height (hair to shoes) in logical units indoors; the street draws people at 60%.
const human = 170;
for (const size of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
  test(`sem faixa morta: chão sob a turma até 15% e asfalto até 20% da cena a ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size); await ready(page);
    const view = () => page.locator('canvas').evaluate(c => ({ y: Number(c.dataset.viewY), height: Number(c.dataset.viewHeight), scale: c.getBoundingClientRect().width / Number(c.dataset.viewWidth) }));
    const inside = await view(), feet = Math.max(...(await readTown(page)).actors.map(a => a.y));
    expect((inside.y + inside.height - feet) / inside.height).toBeLessThanOrEqual(.15);
    if (size.width === 768) expect(human * inside.scale).toBeGreaterThanOrEqual(150);
    await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-street', 'true');
    if (await page.locator('#room-dialog').isVisible()) await page.locator('#close-map').click();
    const street = await view();
    expect(Math.max(0, street.y + street.height - 565) / street.height).toBeLessThanOrEqual(.2);
    if (size.width === 768) expect(human * .6 * street.scale).toBeGreaterThanOrEqual(110);
    await page.screenshot({ path: `reports/framing-street-${size.width}.png` });
  });
}

test('com a brincadeira aberta a 768, a cena fica estável e o humano com 150 px ou mais', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 }); await ready(page);
  await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
  const scale = () => page.locator('canvas').evaluate(c => c.getBoundingClientRect().width / Number(c.dataset.viewWidth));
  const docked = await scale();
  await openPlay(page);
  await page.getByRole('button', { name: 'Pular corda', exact: true }).click();
  await expect(page.locator('#game-panel')).toBeVisible();
  const playing = await scale();
  // W3L-03: while playing freely the dock is only the 84 px portrait strip, so the scene is bigger than before; the game panel needs
  // more room, so the scene gives it back while the game runs (without jumping again) and the characters stay big.
  expect(playing).toBeLessThanOrEqual(docked); expect(human * playing).toBeGreaterThanOrEqual(150);
  await page.waitForTimeout(1000); expect(await scale()).toBeCloseTo(playing, 3);
  const panel = (await page.locator('#game-panel').boundingBox())!;
  for (const id of ['#game-jump', '#game-stop']) {
    const button = (await page.locator(id).boundingBox())!;
    expect(button.y + button.height, id).toBeLessThanOrEqual(panel.y + panel.height);
  }
  await page.screenshot({ path: 'reports/framing-playing-768.png' });
});

// In portrait the dock below the scene (the portrait strip, then the game panel) holds its controls without a big empty band and
// without scrolling, and never covers the scene; the actions ring floats inside the scene.
for (const size of [{ width: 390, height: 844 }, { width: 768, height: 1024 }]) {
  test(`retrato a ${size.width}: painel abaixo da cena compacto, sem vão grande nem rolagem`, async ({ page }) => {
    await page.setViewportSize(size); await ready(page);
    const check = async (id: string) => {
      const dock = await page.locator(id).evaluate(panel => {
        const box = panel.getBoundingClientRect(), style = getComputedStyle(panel);
        const kids = [...panel.querySelectorAll<HTMLElement>('button, h2, p, img')].filter(n => n.checkVisibility() && n.getBoundingClientRect().height > 0 && n.textContent!.trim() + n.tagName !== 'P');
        const top = Math.min(...kids.map(n => n.getBoundingClientRect().top)), bottom = Math.max(...kids.map(n => n.getBoundingClientRect().bottom));
        return { top: box.top, overflow: panel.scrollHeight - panel.clientHeight, above: top - box.top - Number.parseFloat(style.paddingTop), below: box.bottom - bottom - Number.parseFloat(style.paddingBottom) };
      });
      const scene = (await page.locator('#world').boundingBox())!;
      expect(dock.overflow, `${id} rola`).toBeLessThanOrEqual(1);
      expect(dock.above, `${id}: vão acima`).toBeLessThanOrEqual(64); expect(dock.below, `${id}: vão abaixo`).toBeLessThanOrEqual(64);
      expect(scene.y + scene.height, `${id} sobre a cena`).toBeLessThanOrEqual(dock.top + 1);
    };
    await check('#play-hint');
    await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
    // W3L-03: the actions are a ring over the scene, beside the chosen character, inside it and without scrolling.
    const ring = (await page.locator('#actor-context').boundingBox())!, scene = (await page.locator('#world').boundingBox())!;
    expect(ring.y).toBeGreaterThanOrEqual(scene.y); expect(ring.y + ring.height).toBeLessThanOrEqual(scene.y + scene.height + 1);
    expect(ring.x).toBeGreaterThanOrEqual(scene.x); expect(ring.x + ring.width).toBeLessThanOrEqual(scene.x + scene.width + 1);
    await openPlay(page); await page.getByRole('button', { name: 'Amarelinha', exact: true }).click();
    await expect(page.locator('#game-panel')).toHaveAttribute('data-phase', 'playing'); await check('#game-panel');
  });
}
