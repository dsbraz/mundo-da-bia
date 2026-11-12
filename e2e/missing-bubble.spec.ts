import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { onPiece, points, read, ready, tap } from './helpers';
import { touchDrag } from './touch';

// W3L-02: a refusal shows what is missing as a drawing (and who has it), never as a sentence on screen.
const saveKey = 'mundo-da-bia:neighborhood:v3';
async function ruiOnSofa(page: Page) {
  const world = initialWorld();
  world.actors = world.actors.map(a => a.id === 'rui' ? { ...a, x: 150, y: 405, seat: 'sofa-left' } : a);
  await open(page, migrateNeighborhood(initialAlbum(world)));
}
async function open(page: Page, town: ReturnType<typeof migrateNeighborhood>) {
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, [saveKey, encodeNeighborhood(town)]);
  // Every bubble added to the page, and every sentence written on the canvas, from the first frame.
  await page.addInitScript(() => {
    const w = window as unknown as { bubbles: { images: string[]; text: string }[]; written: string[] };
    w.bubbles = []; w.written = [];
    new MutationObserver(records => records.forEach(r => {
      r.addedNodes.forEach(n => { if (n instanceof HTMLElement && /bubble/.test(n.className)) w.bubbles.push({ images: [...n.querySelectorAll('img')].map(i => i.getAttribute('src')!), text: n.innerText.trim() }); });
      if (r.attributeName === 'data-said' && r.target instanceof HTMLElement && r.target.dataset.said) w.written.push(r.target.dataset.said);
    })).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-said'] });
  });
  await ready(page);
}
type Seen = { bubbles: { images: string[]; text: string }[]; written: string[] };
async function drawnOnly(page: Page) {
  await expect(page.locator('.missing-bubble')).toBeVisible();
  const seen = await page.evaluate(() => { const w = window as unknown as Seen; return { bubbles: w.bubbles, written: w.written }; });
  expect(seen.bubbles.length).toBeGreaterThan(0);
  for (const bubble of seen.bubbles) { expect(bubble.images.some(src => src.startsWith('/art/needs.svg#'))).toBe(true); expect(bubble.text).toBe(''); }
  expect(seen.written).toEqual([]);
}
const bia = async (page: Page) => (await read(page)).actors.find(a => a.id === 'bia')!;

for (const [width, height] of [[1024, 768], [768, 1024]] as const) test(`soltar a Bia no sofá do Rui mostra o rosto do Rui e deixa a Bia ao lado, nunca no ponto de partida (${width})`, async ({ page }) => {
  await page.setViewportSize({ width, height }); await ruiOnSofa(page);
  const start = await bia(page), seat = await onPiece(page, 'sofa', 150, 405);
  const [a, b] = await points(page, [[start.x - 10, start.y - 14], [seat[0] - 10, seat[1] - 14]]);
  await touchDrag(page, a!, b!);
  const bubble = page.locator('.missing-bubble');
  await expect(bubble).toBeVisible();
  await expect(bubble.locator('img.need')).toHaveAttribute('src', '/art/needs.svg#seat');
  await expect(bubble.locator('img.face')).toHaveAttribute('src', '/icons/rui.svg');
  expect(await bubble.innerText()).toBe('');
  await expect(page.locator('#announcement')).toContainText('Rui');
  const after = await bia(page), sofa = (await read(page)).layout.pieces.find(p => p.kind === 'sofa')!;
  expect(after.seat).toBeNull();
  expect({ x: after.x, y: after.y }).not.toEqual({ x: start.x, y: start.y });
  // Beside the sofa, on the floor: just past one of its sides.
  expect(after.y).toBe(480);
  expect(Math.min(Math.abs(after.x - sofa.x), Math.abs(after.x - (sofa.x + 270)))).toBeLessThanOrEqual(60);
  const scene = (await page.locator('#world').boundingBox())!, box = (await bubble.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(scene.x); expect(box.x + box.width).toBeLessThanOrEqual(scene.x + scene.width);
  expect(box.y).toBeGreaterThanOrEqual(scene.y);
  await page.screenshot({ path: `reports/wave3-life-1a/missing-seat-${width}.png` });
});

test('nenhuma recusa produz texto sem desenho: sofá ocupado', async ({ page }) => {
  await ruiOnSofa(page);
  const start = await bia(page), seat = await onPiece(page, 'sofa', 150, 405);
  const [a, b] = await points(page, [[start.x - 10, start.y - 14], [seat[0] - 10, seat[1] - 14]]);
  await touchDrag(page, a!, b!);
  await drawnOnly(page);
});
test('nenhuma recusa produz texto sem desenho: balanço ocupado na praça', async ({ page }) => {
  // The same plaza as touch-feedback.spec: only the sofa inside, the Turma spread out.
  const world = initialWorld(); world.layout.pieces = world.layout.pieces.filter(p => p.kind === 'sofa');
  world.actors = world.actors.map((a, i) => ({ ...a, room: 'sala', x: 130 + i * 125, y: 530, seat: null }));
  const town = migrateNeighborhood(initialAlbum(world));
  town.location = { kind: 'street' };
  town.actors = town.actors.map(a => a.id === 'luna' ? { ...a, location: { kind: 'street' }, x: 400, y: 445 } : a.id === 'bia' ? { ...a, location: { kind: 'street' }, x: 250, y: 520 } : a);
  town.outdoor.swing = 'luna';
  await open(page, town);
  await tap(page, 400, 490);
  await drawnOnly(page);
  await expect(page.locator('.missing-bubble img.face')).toHaveAttribute('src', '/icons/luna.svg');
});
