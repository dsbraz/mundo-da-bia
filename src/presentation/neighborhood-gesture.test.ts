import { afterEach, expect, it, vi } from 'vitest';
import { neighborhoodGesture } from './neighborhood-gesture';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { localWorld, migrateNeighborhood } from '../domain/neighborhood';
import { createPlayGesture } from './play-gesture';
import { houseInput } from './house-input';
afterEach(() => vi.useRealTimers());
function setup() {
  vi.useFakeTimers();
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  const world = localWorld(town), dispatch = vi.fn(), preview = vi.fn(), progress = vi.fn();
  const base = { start: vi.fn(() => true), update: vi.fn(), end: vi.fn(), cancel: vi.fn() };
  const gesture = neighborhoodGesture(base, { town: () => town, world: () => world, building: () => false, dispatch, preview, progress, plot: vi.fn() });
  return { town, world, dispatch, preview, progress, base, gesture };
}
it('porta visita apenas ao soltar e cancela sem visitar', () => {
  const { gesture, dispatch } = setup();
  gesture.start(1, { x: 550, y: 300 }); expect(dispatch).not.toHaveBeenCalled();
  gesture.cancel(); gesture.end(1, { x: 550, y: 300 }); expect(dispatch).not.toHaveBeenCalled();
  gesture.start(2, { x: 550, y: 300 }); gesture.end(2, { x: 550, y: 300 });
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'visit', location: { kind: 'street' } });
});
it.each([[520, 450, 'actor', 'bia'], [350, 382, 'item', '1:ursinho']] as const)('espera 500ms, mostra prévia e só transfere uma vez ao soltar %s', (x, y, key, id) => {
  const { gesture, dispatch, preview } = setup();
  gesture.start(1, { x, y }); gesture.update(1, { x: 550, y: 335 });
  vi.advanceTimersByTime(499); expect(preview).not.toHaveBeenCalled(); expect(dispatch).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1); expect(preview).toHaveBeenCalledWith(expect.objectContaining({ type: 'transport', [key]: id }));
  gesture.end(1, { x: 550, y: 335 }); gesture.end(1, { x: 550, y: 335 }); expect(dispatch).toHaveBeenCalledTimes(1);
});
it('sair da porta reinicia espera e cancelar a prévia não transfere', () => {
  const { gesture, dispatch, preview } = setup();
  gesture.start(1, { x: 520, y: 450 }); gesture.update(1, { x: 550, y: 335 }); vi.advanceTimersByTime(400);
  gesture.update(1, { x: 800, y: 335 }); vi.advanceTimersByTime(1000); expect(preview).not.toHaveBeenCalled();
  gesture.update(1, { x: 550, y: 335 }); vi.advanceTimersByTime(500); gesture.cancel(); gesture.end(1, { x: 550, y: 335 });
  expect(dispatch).not.toHaveBeenCalled(); expect(preview).toHaveBeenLastCalledWith(null);
});
it('segundo dedo antes do arraste cancela o toque pendente no móvel', () => {
  const state = initialWorld(), dispatch = vi.fn(), move = vi.fn();
  const play = createPlayGesture(() => state, vi.fn(), move, { dispatch, wardrobe: () => false, toggleWardrobe: vi.fn(), preview: vi.fn() });
  const canvas = { getBoundingClientRect: () => ({ width: 1000 }) } as HTMLCanvasElement;
  const input = houseInput(canvas, () => state, () => play, { building: () => false, wardrobe: () => false, dispatch, pan: vi.fn(), transfer: vi.fn(), progress: vi.fn() });
  const point = { x: 60, y: 200 };
  input.start(1, point, point); expect(dispatch).not.toHaveBeenCalled();
  input.start(2, point, point); input.end(1, point, point); input.end(2, point, point); expect(dispatch).not.toHaveBeenCalled();
  input.start(3, point, point); input.end(3, point, point); expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'interact', target: 'lamp' });
  expect(move).not.toHaveBeenCalled();
});
it('após a prévia da porta, outra borda não pode tomar a mesma travessia', () => {
  const { gesture, world, dispatch } = setup();
  const edgeDispatch = vi.fn();
  const canvas = { getBoundingClientRect: () => ({ width: 1000 }) } as HTMLCanvasElement;
  const input = houseInput(canvas, () => world, () => gesture, { building: () => false, wardrobe: () => false, dispatch: edgeDispatch, pan: vi.fn(), transfer: vi.fn(), progress: vi.fn() });
  const start = { x: 520, y: 450 }, door = { x: 550, y: 335 }, edge = { x: 980, y: 400 };
  input.start(1, start, start); input.update(1, door, door); vi.advanceTimersByTime(500);
  input.update(1, edge, edge); vi.advanceTimersByTime(500); input.end(1, edge, edge);
  expect(edgeDispatch).not.toHaveBeenCalled(); expect(dispatch).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'transport', location: { kind: 'street' } }));
});
it('um arraste comum não repinta a cena ao terminar e preserva sua animação de encaixe', () => {
  const { gesture, preview, base } = setup();
  gesture.start(1, { x: 520, y: 450 }); gesture.update(1, { x: 600, y: 440 }); gesture.end(1, { x: 600, y: 440 });
  expect(base.end).toHaveBeenCalledOnce(); expect(preview).not.toHaveBeenCalled();
});
