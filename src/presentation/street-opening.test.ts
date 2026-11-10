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
it('ao sair de casa a placa do terreno livre abre inteira junto da casa, de 600 a 1000 unidades visíveis', () => {
  const t = town(), shop = t.buildings.find(b => b.plot === 1)!, exit = streetExit(t, shop.id);
  expect(exit.must).toEqual({ left: placard(2).left - exit.camera, right: placard(2).right - exit.camera });
  expect(exit.spans).toEqual([{ left: plotStart(1) - exit.camera, right: plotStart(1) + 440 - exit.camera }]);
  for (const visible of [500, 628, 653]) {
    const margin = 24, must = { left: exit.must!.left - margin, right: exit.must!.right + margin };
    const x = openingX(exit.spans, visible, 1000, must);
    expect(x).toBeLessThanOrEqual(must.left); expect(x + visible).toBeGreaterThanOrEqual(must.right);
    // Part of the house of origin is in view beside the sign.
    expect(x).toBeLessThan(exit.spans[0]!.right);
  }
});
it('sem terreno livre, abre na porta da casa', () => {
  const t = { ...town(), plots: 2 }, exit = streetExit(t, t.buildings.find(b => b.plot === 1)!.id);
  expect(exit.must).toBeUndefined(); expect(exit.camera).toBe(Math.min(plotStart(1) + 220 - 500, 660 + 2 * 440 - 1000));
});
