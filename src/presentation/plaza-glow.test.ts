import { expect, it } from 'vitest';
import { migrateNeighborhood } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { nearbyHotspots } from './plaza-glow';
import { outdoorTargets } from './outdoor-controls';

const street = () => {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  return { ...town, location: { kind: 'street' as const }, actors: town.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'street' as const }, x: 380, y: 510 } : a) };
};
it('only plaza spots near the selected actor glow', () => {
  expect(nearbyHotspots(street(), 'bia').map(t => t.target)).toEqual(['bench', 'swing', 'water']);
  const far = street(); far.actors = far.actors.map(a => a.id === 'bia' ? { ...a, x: 900 } : a);
  expect(nearbyHotspots(far, 'bia').map(t => t.target)).not.toContain('bench');
  expect(nearbyHotspots(street(), 'luna')).toEqual([]);
});
it('equipment names say who is on it, relative to the selected actor', () => {
  const town = street(); town.outdoor = { ...town.outdoor, swing: 'bia', bench: 'luna' };
  const names = outdoorTargets(town, 'bia').map(t => t.name);
  expect(names).toContain('Descer do balanço'); expect(names).toContain('Banco com Luna');
  expect(names.join()).not.toMatch(/ocupado|Sair do equipamento/);
});
