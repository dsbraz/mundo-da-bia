import { expect, it, vi } from 'vitest';
import { plaza } from './plaza';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { migrateNeighborhood } from '../domain/neighborhood';
import { outdoorPoints } from '../domain/outdoor';
import type { Neighborhood } from '../domain/neighborhood-types';

/** The plaza with the Bia on the bench. */
function setup(selected: 'bia' | 'leo' = 'bia') {
  const base = migrateNeighborhood(initialAlbum(initialWorld()));
  const town: Neighborhood = { ...base, location: { kind: 'street' }, outdoor: { ...base.outdoor, bench: 'bia' } };
  const deps = { town: () => town, selected: () => selected, walker: { cancel: vi.fn(), start: vi.fn() } as never, dispatch: vi.fn(), refuse: vi.fn(), push: vi.fn(),
    garden: { touch: vi.fn(), can: vi.fn(), drop: vi.fn() } };
  return { actions: plaza(deps), deps };
}

it('arrastar alguém para o banco ocupado é recusado como o toque: a bolha com o rosto de quem está sentado', () => {
  const { actions, deps } = setup();
  expect(actions.drop('leo', outdoorPoints.bench)).toBe(true);
  expect(deps.dispatch).not.toHaveBeenCalled();
  expect(deps.refuse).toHaveBeenCalledWith('seat', 'Bia está aqui agora!', { x: outdoorPoints.bench.x, y: outdoorPoints.bench.y - 60 }, 'bia');
  const leo = setup('leo');
  leo.actions.use({ name: 'Banco com Bia', target: 'bench', point: outdoorPoints.bench });
  expect(leo.deps.refuse).toHaveBeenCalledWith('seat', 'Bia está aqui agora!', { x: outdoorPoints.bench.x, y: outdoorPoints.bench.y - 60 }, 'bia');
  expect(leo.deps.dispatch).not.toHaveBeenCalled();
});

it('quem já está no banco, arrastado para ele, senta de novo sem recusa', () => {
  const { actions, deps } = setup();
  expect(actions.drop('bia', outdoorPoints.bench)).toBe(true);
  expect(deps.refuse).not.toHaveBeenCalled();
  expect(deps.dispatch).toHaveBeenCalledWith({ type: 'outdoor', actor: 'bia', target: 'bench' });
});
