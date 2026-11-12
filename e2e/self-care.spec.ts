import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { readTown, ready, tray, closeTray } from './helpers';
import { playMinutes, playUntilTrue } from './session';

const shots = 'reports/wave3-life-2';
/** A new save (cats Nino and Pipoca in the bedroom), optionally a dish on the living-room floor; the autonomy switch as given. */
async function seed(page: Page, { dish = false, autonomy = true } = {}) {
  const world = initialWorld();
  world.actors = world.actors.map(a => ['nino', 'pipoca'].includes(a.id) ? { ...a, room: 'quarto', seat: null, x: 400, y: 520 } : a);
  const town = migrateNeighborhood(initialAlbum(world)), where = town.actors.find(a => a.id === 'bia')!.location;
  const items = dish ? [...town.items, { id: '20:prato' as const, kind: 'prato' as const, recipe: 'ovo-mexido', room: 'sala' as const, location: where, x: 700, y: 540, holder: null, spot: 'floor' as const }] : town.items;
  await page.clock.install({ time: new Date('2026-11-12T10:00:00') });
  await page.addInitScript(([value, on]) => {
    if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value!);
    if (on === 'off') localStorage.setItem('mundo-da-bia:autonomy', 'off');
  }, [encodeNeighborhood({ ...town, nextItem: 21, items }), autonomy ? 'on' : 'off']);
  await ready(page);
}
const face = async (page: Page, id: string) => Object.fromEntries((await page.locator('canvas').getAttribute('data-faces'))!.split(' ').map(f => f.split(':')))[id];
const actor = async (page: Page, id: string) => (await readTown(page)).actors.find(a => a.id === id)!;
async function chooseLuna(page: Page) { await tray(page); await page.locator('#cast [data-actor=luna]').click(); await closeTray(page); }

for (const autonomy of [true, false]) test(`com fome (pede) e um prato no cômodo, a Bia ${autonomy ? 'pega o prato e senta para comer' : 'fica quieta com o interruptor desligado'}`, async ({ page }) => {
  test.setTimeout(90_000);
  await seed(page, { dish: true, autonomy });
  await chooseLuna(page);
  await playMinutes(page, 4);
  await page.clock.runFor(4000);
  const dishes = (await readTown(page)).items.filter(i => i.kind === 'prato');
  if (autonomy) {
    expect(dishes).toEqual([]);
    expect((await actor(page, 'bia')).seat).not.toBeNull();
    await page.screenshot({ path: `${shots}/self-care-bia-eats-1024.png` });
  } else {
    expect(dishes.map(d => d.id)).toEqual(['20:prato']);
    expect((await actor(page, 'bia')).seat).toBeNull();
  }
});

for (const autonomy of [true, false]) test(`com a Mimi triste, a Luna ${autonomy ? 'vai até ela e abraça' : 'não sai do sofá com o interruptor desligado'}`, async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page, { autonomy });
  // The cats turn sad at 12:30 (hunger and sleep); the Luna cares on that tick.
  await playMinutes(page, 12);
  if (autonomy) await playUntilTrue(page, async () => (await actor(page, 'luna')).seat === null, 1.5); else await playMinutes(page, 1);
  await page.clock.runFor(1500);
  const luna = await actor(page, 'luna'), mimi = await actor(page, 'mimi');
  if (autonomy) {
    expect(Math.abs(luna.x - mimi.x)).toBeLessThanOrEqual(110);
    expect(luna.seat).toBeNull();
    expect(await face(page, 'mimi')).not.toBe('sad');
    await page.screenshot({ path: `${shots}/self-care-luna-hugs-1024.png` });
  } else {
    expect(luna.seat).toBe('2.1');
    expect(await face(page, 'mimi')).toBe('sad');
  }
});
