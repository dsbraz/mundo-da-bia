import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { plotStart } from '../domain/neighborhood-geometry';
import { arrivalStep, nearestFreePlot, placard, streetArrival, streetExit } from './street-opening';
import { openingX } from './viewport';

const town = () => neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'shop' });
it('acha o terreno livre mais perto, à direita no empate', () => {
  const t = town();
  expect(nearestFreePlot(t, 1)).toBe(2);
  expect(nearestFreePlot({ ...t, buildings: t.buildings.filter(b => b.plot !== 0) }, 1)).toBe(2);
  expect(nearestFreePlot({ ...t, buildings: t.buildings.filter(b => b.plot !== 0), plots: 2 }, 1)).toBe(0);
  expect(nearestFreePlot({ ...t, plots: 2 }, 1)).toBeUndefined();
});
it('quem sai de casa chega ao lado da porta, do lado da placa, e abre inteiro junto da placa inteira; no celular, quem saiu vem inteiro', () => {
  const t = town(), shop = t.buildings.find(b => b.plot === 1)!, exit = streetExit(t, shop.id), local = (x: number) => x - exit.camera;
  expect(streetArrival(t, 1)).toBe(plotStart(1) + 220 + arrivalStep);
  const sign = { left: local(placard(2).left), right: local(placard(2).right) }, ring = { left: local(plotStart(1) + 248), right: local(plotStart(1) + 332) };
  expect(exit.must).toEqual([{ left: ring.left, right: sign.right }, ring]);
  expect(exit.spans).toEqual([{ left: local(plotStart(1)), right: local(plotStart(1) + 440) }]);
  expect(exit.people).toEqual([ring]);
  // Visible street widths: 1024×768 (504), 768×1024 (553), older docks (628, 653), 1280×800 (657); margins are 24 px in units.
  const open = (visible: number, margin: number) => openingX(exit.spans, visible, 1000, exit.must!.map(m => ({ left: m.left - margin, right: m.right + margin })), exit.people);
  for (const [visible, margin] of [[504, 17.2], [553, 17.3], [628, 17], [653, 17], [657, 16.5]] as const) {
    const x = open(visible, margin);
    expect(x).toBeLessThanOrEqual(ring.left - margin); expect(x + visible).toBeGreaterThanOrEqual(sign.right + margin);
  }
  for (const [visible, margin] of [[375, 23], [410, 23]] as const) {
    const phone = open(visible, margin); expect(phone).toBeLessThanOrEqual(ring.left - margin); expect(phone + visible).toBeGreaterThanOrEqual(ring.right + margin);
  }
  // The sign on the left of the house mirrors it.
  const lone = { ...t, plots: 2, buildings: t.buildings.filter(b => b.plot !== 0) }, left = streetExit(lone, shop.id);
  expect(streetArrival(lone, 1)).toBe(plotStart(1) + 220 - arrivalStep);
  expect(left.must![0]).toEqual({ left: placard(0).left - left.camera, right: plotStart(1) + 192 - left.camera });
});
it('sem terreno livre, abre na porta da casa', () => {
  const t = { ...town(), plots: 2 }, exit = streetExit(t, t.buildings.find(b => b.plot === 1)!.id);
  expect(streetArrival(t, 1)).toBe(plotStart(1) + 220);
  expect(exit.must).toEqual([{ left: plotStart(1) + 178 - exit.camera, right: plotStart(1) + 262 - exit.camera }]); expect(exit.camera).toBe(Math.min(plotStart(1) + 220 - 500, 660 + 2 * 440 - 1000));
});
