import { afterEach, expect, it, vi } from 'vitest';
import { neighborhoodGesture } from './neighborhood-gesture';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { localWorld, migrateNeighborhood } from '../domain/neighborhood';
import { createPlayGesture } from './play-gesture';
import { houseInput } from './house-input';
import { plotStart } from '../domain/neighborhood-geometry';
afterEach(() => vi.useRealTimers());
function setup(building = false) {
  vi.useFakeTimers();
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  const world = localWorld(town), dispatch = vi.fn(), preview = vi.fn(), progress = vi.fn();
  const base = { start: vi.fn(() => true), update: vi.fn(), end: vi.fn(), cancel: vi.fn() };
  const gesture = neighborhoodGesture(base, { town: () => town, world: () => world, building: () => building, dispatch, preview, progress, plot: vi.fn() });
  return { town, world, dispatch, preview, progress, base, gesture };
}
it('porta visita apenas ao soltar e cancela sem visitar', () => {
  const { gesture, dispatch } = setup();
  gesture.start(1, { x: 550, y: 300 }); expect(dispatch).not.toHaveBeenCalled();
  gesture.cancel(); gesture.end(1, { x: 550, y: 300 }); expect(dispatch).not.toHaveBeenCalled();
  gesture.start(2, { x: 550, y: 300 }); gesture.end(2, { x: 550, y: 300 });
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'visit', location: { kind: 'street' } });
});
it('espera 500ms, mostra prévia e só transfere uma vez ao soltar um objeto', () => {
  const { gesture, dispatch, preview } = setup();
  gesture.start(1, { x: 350, y: 382 }); gesture.update(1, { x: 550, y: 335 });
  vi.advanceTimersByTime(499); expect(preview).not.toHaveBeenCalled(); expect(dispatch).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1); expect(preview).toHaveBeenCalledWith(expect.objectContaining({ type: 'transport', item: '1:ursinho' }));
  gesture.end(1, { x: 550, y: 335 }); gesture.end(1, { x: 550, y: 335 }); expect(dispatch).toHaveBeenCalledTimes(1);
});
it('soltar a personagem com os pés na porta atravessa na hora, sem espera, e uma vez só', () => {
  const { gesture, dispatch, preview, base } = setup(), glow = vi.fn(), outcome = vi.fn();
  const town = migrateNeighborhood(initialAlbum(initialWorld())), world = localWorld(town);
  const lit = neighborhoodGesture(base, { town: () => town, world: () => world, building: () => false, dispatch, preview, progress: vi.fn(), plot: vi.fn(), glow, outcome });
  // Held by the chest (90 above the feet at 520, 530): the feet reach the door's sill when the finger is 90 above it.
  lit.start(1, { x: 520, y: 440 }); lit.update(1, { x: 550, y: 330 });
  expect(glow).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Rua' })); expect(preview).not.toHaveBeenCalled();
  lit.end(1, { x: 550, y: 330 }); lit.end(1, { x: 550, y: 330 });
  expect(dispatch).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'transport', actor: 'bia', location: { kind: 'street' } }));
  expect(outcome).toHaveBeenCalledExactlyOnceWith('crossed'); expect(glow).toHaveBeenLastCalledWith(null); expect(base.end).not.toHaveBeenCalled();
  void gesture;
});
it('a porta só acende sob os pés: perto dela, mas no meio do chão, a personagem só anda', () => {
  const { dispatch, preview, base } = setup(), glow = vi.fn();
  const town = migrateNeighborhood(initialAlbum(initialWorld())), world = localWorld(town);
  const lit = neighborhoodGesture(base, { town: () => town, world: () => world, building: () => false, dispatch, preview, progress: vi.fn(), plot: vi.fn(), glow });
  lit.start(1, { x: 520, y: 440 }); lit.update(1, { x: 560, y: 400 }); lit.end(1, { x: 560, y: 400 });
  expect(glow).not.toHaveBeenCalled(); expect(dispatch).not.toHaveBeenCalled(); expect(base.end).toHaveBeenCalledOnce();
});
it('sair da porta reinicia espera e cancelar a prévia não transfere', () => {
  const { gesture, dispatch, preview } = setup();
  gesture.start(1, { x: 350, y: 382 }); gesture.update(1, { x: 550, y: 335 }); vi.advanceTimersByTime(400);
  gesture.update(1, { x: 800, y: 335 }); vi.advanceTimersByTime(1000); expect(preview).not.toHaveBeenCalled();
  gesture.update(1, { x: 550, y: 335 }); vi.advanceTimersByTime(500); gesture.cancel(); gesture.end(1, { x: 550, y: 335 });
  expect(dispatch).not.toHaveBeenCalled(); expect(preview).toHaveBeenLastCalledWith(null);
});
it('segundo dedo antes do arraste cancela o toque pendente no móvel', () => {
  const state = initialWorld(), dispatch = vi.fn(), move = vi.fn();
  const play = createPlayGesture(() => state, vi.fn(), move, { dispatch, wardrobe: () => false, toggleWardrobe: vi.fn(), preview: vi.fn() });
  const canvas = { getBoundingClientRect: () => ({ width: 1000 }) } as HTMLCanvasElement;
  const input = houseInput(canvas, () => state, () => play, { building: () => false, wardrobe: () => false, dispatch, pan: vi.fn(), transfer: vi.fn(), progress: vi.fn() });
  const point = { x: 62.25, y: 238.4 };
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
  const start = { x: 350, y: 382 }, door = { x: 550, y: 335 }, edge = { x: 980, y: 400 };
  input.start(1, start, start); input.update(1, door, door); vi.advanceTimersByTime(500);
  input.update(1, edge, edge); vi.advanceTimersByTime(500); input.end(1, edge, edge);
  expect(edgeDispatch).not.toHaveBeenCalled(); expect(dispatch).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'transport', location: { kind: 'street' } }));
});
it('um arraste comum não repinta a cena ao terminar e preserva sua animação de encaixe', () => {
  const { gesture, preview, base } = setup();
  gesture.start(1, { x: 520, y: 450 }); gesture.update(1, { x: 600, y: 440 }); gesture.end(1, { x: 600, y: 440 });
  expect(base.end).toHaveBeenCalledOnce(); expect(preview).not.toHaveBeenCalled();
});

it('em Decorar a porta não captura o gesto da peça à sua frente', () => {
  const { gesture, base, dispatch } = setup(true);
  const point = { x: 550, y: 300 };
  gesture.start(1, point); gesture.end(1, point);
  expect(base.start).toHaveBeenCalledExactlyOnceWith(1, point);
  expect(base.end).toHaveBeenCalledExactlyOnceWith(1, point);
  expect(dispatch).not.toHaveBeenCalled();
});
it('um equipamento visível diante da porta recebe o clique em Brincar', () => {
  const { gesture, world, base, dispatch } = setup();
  Object.assign(world, { occludingDepth: () => 400 });
  const point = { x: 550, y: 300 }; gesture.start(1, point); gesture.end(1, point);
  expect(base.start).toHaveBeenCalledExactlyOnceWith(1, point);
  expect(base.end).toHaveBeenCalledExactlyOnceWith(1, point); expect(dispatch).not.toHaveBeenCalled();
});
it('a porta do fim da parede, desenhada diante do palco, recebe o toque; o que está na frente dela, não', () => {
  const { gesture, world, base, dispatch } = setup(), enter = vi.fn(() => false);
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  const door = neighborhoodGesture(base, { town: () => town, world: () => world, building: () => false, dispatch, preview: vi.fn(), progress: vi.fn(), plot: vi.fn(), enter });
  Object.assign(world, { occludingDepth: () => 400 });
  const point = { x: 932, y: 300 }; door.start(1, point); door.end(1, point);
  expect(base.start).not.toHaveBeenCalled(); expect(enter).toHaveBeenCalledExactlyOnceWith({ kind: 'interior', building: 1, room: 'quarto' });
  Object.assign(world, { occludingDepth: () => 410 });
  gesture.start(2, point); gesture.end(2, point);
  expect(base.start).toHaveBeenCalledExactlyOnceWith(2, point); expect(enter).toHaveBeenCalledTimes(1);
});
it('no modo brincar, tocar no terreno livre abre o seletor de construção; o chão da rua continua andando', () => {
  vi.useFakeTimers();
  const town = { ...migrateNeighborhood(initialAlbum(initialWorld())), location: { kind: 'street' as const } };
  const world = localWorld(town), plot = vi.fn(), base = { start: vi.fn(() => true), update: vi.fn(), end: vi.fn(), cancel: vi.fn() };
  const gesture = neighborhoodGesture(base, { town: () => town, world: () => world, building: () => false, dispatch: vi.fn(), preview: vi.fn(), progress: vi.fn(), plot });
  const sign = { x: plotStart(2) + 125, y: 330 };
  gesture.start(1, sign); gesture.end(1, sign);
  expect(plot).toHaveBeenCalledExactlyOnceWith(2); expect(base.end).not.toHaveBeenCalled();
  gesture.start(2, { x: plotStart(2) + 150, y: 520 }); gesture.end(2, { x: plotStart(2) + 150, y: 520 });
  gesture.start(3, { x: plotStart(0) + 150, y: 330 }); gesture.end(3, { x: plotStart(0) + 150, y: 330 });
  expect(plot).toHaveBeenCalledOnce(); expect(base.end).toHaveBeenCalledTimes(2);
});
