import { test, expect, type Page } from '@playwright/test';
import { onPiece, points, read, readTown } from './helpers';
import { finger, touchDrag } from './touch';

// W3L-01: dragging a character with a finger, held by the head, the chest or the feet (offsets from the feet, in scene units).
const grips = { head: { x: 0, y: -150 }, chest: { x: 0, y: -90 }, feet: { x: -10, y: -14 } } as const;
const sizes = [[1024, 768]] as const;
type Grip = typeof grips[keyof typeof grips];
async function open(page: Page, width: number, height: number) {
  await page.clock.install({ time: new Date('2026-01-01T10:00:00Z') });
  await page.setViewportSize({ width, height }); await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await page.clock.pauseAt(new Date('2026-01-01T10:02:00Z'));
}
const bia = async (page: Page) => (await read(page)).actors.find(a => a.id === 'bia')!;
const world = async (page: Page) => (await page.locator('#world').boundingBox())!;
const data = (page: Page, name: string) => page.locator('canvas').getAttribute(`data-${name}`);
/** The screen pixel of the scene point `p`, without panning the view. */
const screen = (page: Page, p: { x: number; y: number }) => page.locator('canvas').evaluate((canvas, p) => {
  const box = canvas.getBoundingClientRect(), scale = box.width / Number(canvas.dataset.viewWidth);
  return { x: box.x + (p.x - Number(canvas.dataset.viewX) - Number(canvas.dataset.cameraX)) * scale, y: box.y + (p.y - Number(canvas.dataset.viewY)) * scale };
}, p);
const scene = (page: Page, p: { x: number; y: number }) => page.locator('canvas').evaluate((canvas, p) => {
  const box = canvas.getBoundingClientRect(), scale = box.width / Number(canvas.dataset.viewWidth);
  return { x: (p.x - box.x) / scale + Number(canvas.dataset.viewX) + Number(canvas.dataset.cameraX), y: (p.y - box.y) / scale + Number(canvas.dataset.viewY) };
}, p);

for (const [width, height] of sizes) test.describe(`${width}×${height}`, () => {
  for (const [name, grip] of Object.entries(grips) as [string, Grip][]) {
    test(`pega ${name}: os pés sobre o sofá livre fazem sentar`, async ({ page }) => {
      await open(page, width, height);
      const seat = await onPiece(page, 'sofa', 150, 405), start = await bia(page);
      const [a, b] = await points(page, [[start.x + grip.x, start.y + grip.y], [seat[0] + grip.x, seat[1] + grip.y]]);
      await touchDrag(page, a!, b!);
      await expect.poll(async () => (await bia(page)).seat).toBe('2.0');
    });
    test(`pega ${name}: soltar 40 px além da borda da cena leva até a borda`, async ({ page }) => {
      await open(page, width, height);
      const start = await bia(page), box = await world(page), landscape = width > height;
      const [a] = await points(page, [[start.x + grip.x, start.y + grip.y]]);
      const out = landscape ? { x: box.x + box.width + 40, y: a!.y } : { x: a!.x, y: box.y + box.height + 40 };
      await touchDrag(page, a!, out, 12);
      const after = await bia(page);
      if (landscape) {
        const edge = await scene(page, { x: box.x + box.width, y: a!.y });
        expect(after.x).toBeGreaterThan(Math.min(edge.x - grip.x, 940) - 40);
      } else expect(after.y).toBe(540);
    });
    test(`pega ${name}: no pé da cena o boneco encosta no chão e segue o x do dedo`, async ({ page }) => {
      await open(page, width, height);
      const start = await bia(page), [a] = await points(page, [[start.x + grip.x, start.y + grip.y]]);
      const low = await screen(page, { x: start.x + grip.x, y: 590 }), side = await screen(page, { x: start.x + grip.x - 120, y: 590 });
      const f = await finger(page);
      await f.down(a!); await f.move(low, 10); await f.move(side, 6);
      expect(Number(await data(page, 'walk-y'))).toBe(540);
      expect(Math.abs(Number(await data(page, 'walk-x')) - (start.x - 120))).toBeLessThanOrEqual(3);
      await f.up(); await f.detach();
      expect(await bia(page)).toMatchObject({ x: expect.closeTo(start.x - 120, 0), y: 540 });
    });
  }
  test('um toque 20 px ao lado do braço arrasta a Bia e não move a vista', async ({ page }) => {
    await open(page, width, height);
    const start = await bia(page), [chest] = await points(page, [[start.x, start.y - 95]]), [arm] = await points(page, [[start.x + armEdge, start.y - 95]]);
    const a = { x: arm!.x + 20, y: chest!.y }, view = await data(page, 'view-x');
    await touchDrag(page, a, { x: a.x - 90, y: a.y + 10 });
    expect(await data(page, 'view-x')).toBe(view);
    expect((await bia(page)).x).toBeLessThan(start.x - 40);
  });
  for (const [name, grip] of Object.entries(grips) as [string, Grip][]) test(`pega ${name}: soltar na porta da Rua sem pausa atravessa`, async ({ page }) => {
    await open(page, width, height);
    const start = await bia(page), [a, b] = await points(page, [[start.x + grip.x, start.y + grip.y], [550 + grip.x, 410 + grip.y]]);
    await touchDrag(page, a!, b!);
    await expect.poll(async () => (await readTown(page)).actors.find(x => x.id === 'bia')!.location.kind).toBe('street');
  });
  test('segurar 1 s na borda sem porta não troca de cômodo e desliza a vista', async ({ page }) => {
    await open(page, width, height);
    const start = await bia(page), box = await world(page), [a] = await points(page, [[start.x, start.y - 90]]);
    const view = Number(await data(page, 'view-x')), f = await finger(page);
    await f.down(a!); await f.move({ x: box.x + box.width - 10, y: a!.y }, 12);
    await page.clock.runFor(1000);
    await f.up(); await f.detach();
    const after = await read(page);
    expect(after.actors.find(x => x.id === 'bia')!.room).toBe('sala');
    expect(Number(await data(page, 'view-x'))).toBeGreaterThan(view + 20);
  });
  test('um segundo dedo que sobe fora da cena não trava o arraste seguinte', async ({ page }) => {
    await open(page, width, height);
    const start = await bia(page), box = await world(page), [palm, a] = await points(page, [[300, 200], [start.x, start.y - 90]]);
    const f = await finger(page);
    await f.down(palm!, 2); await f.down(a!, 1);
    await f.move({ x: box.x + box.width + 30, y: box.y + box.height + 30 }, 6, 2); await f.up(2);
    await f.move({ x: a!.x - 60, y: a!.y }, 4, 1); await f.up(1); await f.detach();
    const [again] = await points(page, [[(await bia(page)).x, (await bia(page)).y - 90]]);
    await touchDrag(page, again!, { x: again!.x - 120, y: again!.y });
    expect((await bia(page)).x).toBeLessThan(start.x - 60);
  });
});
/** Half the width of Bia's drawing at the chest, arms included (scene units), measured on the art. */
const armEdge = 34;
// D9: choosing someone new by touching them must not repaint the whole scene under the finger (it cost 130-220 ms of one frame on a
// 4x slower CPU); only the ring moves, and the panels follow when the finger lifts.
test('escolher outra pessoa ao tocar não repinta tudo antes do fim do gesto', async ({ page }) => {
  await open(page, 1024, 768);
  const leo = (await read(page)).actors.find(a => a.id === 'leo')!, [a] = await points(page, [[leo.x, leo.y - 90]]);
  await expect(page.locator('#selected')).toHaveText('Bia');
  const f = await finger(page);
  await f.down(a!); await f.move({ x: a!.x + 40, y: a!.y }, 4);
  await expect(page.locator('#selected')).toHaveText('Bia');
  await expect(page.locator('canvas')).toHaveAttribute('data-chosen', 'leo');
  await f.up(); await f.detach();
  await expect(page.locator('#selected')).toHaveText('Léo');
  expect((await read(page)).actors.find(a => a.id === 'leo')!.x).toBeGreaterThan(leo.x + 20);
});
