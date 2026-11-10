import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { plotStart } from '../domain/neighborhood-geometry';
import { nearestFreePlot, placard, streetExit } from './street-opening';
import { openingX } from './viewport';

const town = () => neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'shop' });
it('acha o terreno livre mais perto, à direita no empate', () => {
  const t = town();
  expect(nearestFreePlot(t, 1)).toBe(2);
  expect(nearestFreePlot({ ...t, buildings: t.buildings.filter(b => b.plot !== 0) }, 1)).toBe(2);
  expect(nearestFreePlot({ ...t, buildings: t.buildings.filter(b => b.plot !== 0), plots: 2 }, 1)).toBe(0);
  expect(nearestFreePlot({ ...t, plots: 2 }, 1)).toBeUndefined();
});
it('ao sair de casa a placa do terreno livre abre inteira junto da casa e de quem saiu; no celular, quem saiu vem primeiro', () => {
  const t = town(), shop = t.buildings.find(b => b.plot === 1)!, exit = streetExit(t, shop.id), local = (x: number) => x - exit.camera;
  const sign = { left: local(placard(2).left), right: local(placard(2).right) };
  expect(exit.must).toEqual({ left: local(plotStart(1) + 250), right: sign.right });
  expect(exit.spans).toEqual([{ left: local(plotStart(1)), right: local(plotStart(1) + 440) }]);
  expect(exit.people).toEqual([{ left: local(plotStart(1) + 178), right: local(plotStart(1) + 262) }]);
  const ring = exit.people[0]!, margin = 17;
  const open = (visible: number) => openingX(exit.spans, visible, 1000, { left: exit.must!.left - margin, right: exit.must!.right + margin }, exit.people);
  for (const visible of [504, 628, 653]) {
    const x = open(visible);
    expect(x).toBeLessThanOrEqual(sign.left - margin); expect(x + visible).toBeGreaterThanOrEqual(sign.right + margin);
    expect(x).toBeLessThan(ring.right);
  }
  for (const visible of [628, 653]) expect(open(visible)).toBeLessThanOrEqual(ring.left);
  const phone = open(410); expect(phone).toBeLessThanOrEqual(ring.left); expect(phone + 410).toBeGreaterThanOrEqual(ring.right);
  // The sign on the left of the house mirrors it.
  const left = streetExit({ ...t, plots: 2, buildings: t.buildings.filter(b => b.plot !== 0) }, shop.id);
  expect(left.must!.right).toBe(plotStart(1) + 190 - left.camera);
});
it('sem terreno livre, abre na porta da casa', () => {
  const t = { ...town(), plots: 2 }, exit = streetExit(t, t.buildings.find(b => b.plot === 1)!.id);
  expect(exit.must).toBeUndefined(); expect(exit.camera).toBe(Math.min(plotStart(1) + 220 - 500, 660 + 2 * 440 - 1000));
});
