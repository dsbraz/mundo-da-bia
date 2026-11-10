import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { read, ready, tap } from './helpers';
const saveKey = 'mundo-da-bia:neighborhood:v2';
function spreadTown() {
  const world = initialWorld(); world.layout.pieces = world.layout.pieces.filter(p => p.kind === 'sofa');
  world.actors = world.actors.map((a, i) => ({ ...a, room: 'sala', x: 130 + i * 125, y: 530, seat: null }));
  world.items = world.items.map((i, n) => ({ ...i, room: 'sala', spot: 'floor', x: 400 + n * 80, y: 300 }));
  return migrateNeighborhood(initialAlbum(world));
}
async function seed(page: Page, town = spreadTown()) {
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, [saveKey, encodeNeighborhood(town)]);
  await ready(page);
}
async function watchReactions(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { lastUp: number; reactedAt: number };
    window.addEventListener('pointerup', () => { w.lastUp = performance.now(); }, { capture: true });
    new MutationObserver(() => { w.reactedAt = performance.now(); }).observe(document.querySelector('canvas')!, { attributeFilter: ['data-reaction'] });
  });
}
const latency = (page: Page) => page.evaluate(() => { const w = window as unknown as { lastUp: number; reactedAt: number }; return w.reactedAt - w.lastUp; });
async function body(page: Page, i: number) { const a = (await read(page)).actors[i]!; return { x: a.x, y: a.y - (a.kind === 'cat' ? 40 : 90) }; }

test('cada um dos 7 personagens reage ao segundo toque em até 150 ms', async ({ page }) => {
  await seed(page); await watchReactions(page);
  expect((await read(page)).actors.map(a => a.x)).toEqual([130, 255, 380, 505, 630, 755, 880]);
  const ids = ['bia', 'luna', 'leo', 'rui', 'mimi', 'nino', 'pipoca'];
  for (const [i, id] of ids.entries()) {
    const { x, y } = await body(page, i);
    if (id !== 'bia') { await tap(page, x, y); await expect(page.locator('canvas')).not.toHaveAttribute('data-reaction', new RegExp(`^${id}:`)); }
    await tap(page, x, y);
    await expect(page.locator('canvas')).toHaveAttribute('data-reaction', new RegExp(`^${id}:`));
    expect(await latency(page)).toBeLessThan(150);
  }
});

test('cinco toques seguidos não repetem a reação nem gravam o save', async ({ page }) => {
  await seed(page);
  const before = await page.evaluate(key => localStorage.getItem(key), saveKey);
  const seen: string[] = [], at = await body(page, 4);
  await tap(page, at.x, at.y); await expect(page.locator('canvas')).not.toHaveAttribute('data-reaction', /^mimi:/);
  for (let n = 0; n < 5; n++) {
    await tap(page, at.x, at.y);
    await expect.poll(async () => await page.locator('canvas').getAttribute('data-reaction')).not.toBe(seen.at(-1) ?? null);
    seen.push((await page.locator('canvas').getAttribute('data-reaction'))!);
  }
  expect(seen.every(r => r.startsWith('mimi:'))).toBe(true);
  for (let n = 1; n < seen.length; n++) expect(seen[n]).not.toBe(seen[n - 1]);
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(before);
});

test('tocar em quem está andando reage sem interromper a caminhada', async ({ page }) => {
  await seed(page);
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await tap(page, 630, 410);
  await page.clock.runFor(300);
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-walking', 'bia');
  const x = Number(await canvas.getAttribute('data-walk-x')), y = Number(await canvas.getAttribute('data-walk-y'));
  await tap(page, x, y - 90);
  await expect(canvas).toHaveAttribute('data-reaction', /^bia:/);
  await expect(canvas).toHaveAttribute('data-walking', 'bia');
  await page.clock.runFor(4000);
  await expect(canvas).toHaveAttribute('data-walking', '');
});

test('o som fica no cabeçalho, começa ligado e lembra a escolha fora do save', async ({ page }) => {
  await seed(page);
  const sound = page.locator('header #sound-toggle');
  await expect(sound).toBeVisible(); await expect(sound).toHaveAttribute('aria-pressed', 'true');
  const before = await page.evaluate(key => localStorage.getItem(key), saveKey);
  await sound.click(); await expect(sound).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('mundo-da-bia:sound'))).toBe('off');
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(before);
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('header #sound-toggle')).toHaveAttribute('aria-pressed', 'false');
});

test('o retorno vai para a cena: o anúncio é só para leitor de tela e não há rodapé', async ({ page }) => {
  await seed(page);
  const status = (await page.locator('#announcement').boundingBox())!;
  expect(status.width).toBeLessThanOrEqual(1); expect(status.height).toBeLessThanOrEqual(1);
  await expect(page.locator('#announcement')).toHaveAttribute('role', 'status');
  const world = (await page.locator('#world').boundingBox())!, dock = (await page.locator('#play-hint').boundingBox())!;
  const viewport = page.viewportSize()!;
  if (dock.y > world.y) expect(dock.y + dock.height).toBeCloseTo(viewport.height, 0);
  else expect(world.y + world.height).toBeCloseTo(viewport.height, 0);
});

test('tocar no balanço ocupado mostra quem está nele, junto do balanço', async ({ page }) => {
  const town = spreadTown();
  town.location = { kind: 'street' };
  town.actors = town.actors.map(a => a.id === 'luna' ? { ...a, location: { kind: 'street' }, x: 400, y: 445 } : a.id === 'bia' ? { ...a, location: { kind: 'street' }, x: 250, y: 520 } : a);
  town.outdoor.swing = 'luna';
  await seed(page, town);
  await tap(page, 400, 490);
  await expect(page.locator('canvas')).toHaveAttribute('data-said', /Luna/);
  await expect(page.locator('canvas')).toHaveAttribute('data-said-face', 'luna');
  await expect(page.locator('#announcement')).toHaveText(/Luna/);
  expect(Math.abs(Number(await page.locator('canvas').getAttribute('data-said-x')) - 400)).toBeLessThan(60);
  await page.screenshot({ path: 'reports/plaza-swing-occupied.png' });
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:neighborhood:v2')!).town.outdoor.swing))).toBe('luna');
});

test('a praça responde no desenho: sem lista de botões no painel e tocar no balanço faz descer', async ({ page }) => {
  const town = spreadTown();
  town.location = { kind: 'street' };
  town.actors = town.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'street' }, x: 400, y: 445 } : a);
  town.outdoor.swing = 'bia';
  await seed(page, town); await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#actor-context button', { hasText: /balanço|banco|Regar|Campainha|Correio|Sair do equipamento/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Descer do balanço', exact: true })).toHaveCount(1);
  await page.screenshot({ path: 'reports/plaza-swing.png' });
  await tap(page, 400, 400);
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:neighborhood:v2')!).town.outdoor.swing))).toBeNull();
});
