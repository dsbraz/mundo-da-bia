import { expect, it, vi } from 'vitest';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { throughStep } from './place-change';

const home = () => migrateNeighborhood(initialAlbum(initialWorld()));
const room = (id: 'sala' | 'quarto' | 'room-3') => ({ kind: 'interior' as const, building: 1, room: id });
it('lote 8A: pela beirada do chão a vista desliza para o cômodo do lado, como no deslizar; porta e escada fecham a íris', () => {
  const slide = vi.fn(), at = { x: 10, y: 20 };
  const right = throughStep(home(), room('quarto'), at, slide);
  expect(right.kind).toBe('swipe'); right.during!(200);
  expect(slide).toHaveBeenCalledWith('quarto', -.001, 200);
  const quarto = neighborhoodAction(home(), { type: 'visit', location: room('quarto') });
  throughStep(quarto, room('sala'), at, slide).during!(200);
  expect(slide).toHaveBeenLastCalledWith('sala', .001, 200);
  expect(throughStep(home(), { kind: 'street' }, at, slide)).toEqual({ kind: 'door', at });
  const upstairs = neighborhoodAction(home(), { type: 'add-floor', building: 1 });
  expect(throughStep(upstairs, room('room-3'), at, slide)).toEqual({ kind: 'door', at });
});
