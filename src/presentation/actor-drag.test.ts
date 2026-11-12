import { expect, it, vi } from 'vitest';
import { initialWorld } from '../domain/world';
import { createPlayGesture, destination } from './play-gesture';
it('mantém o ponto de pega, faz prévia e só confirma um movimento ao soltar', () => {
  const state = initialWorld(); const move = vi.fn(); const previewActor = vi.fn();
  const play = { dispatch: vi.fn(), preview: vi.fn(), previewActor, wardrobe: () => false, toggleWardrobe: vi.fn() };
  const gesture = createPlayGesture(() => state, vi.fn(), move, play);
  gesture.start(1, { x: 520, y: 400 });
  gesture.update(1, { x: 560, y: 390 });
  expect(move).not.toHaveBeenCalled();
  expect(previewActor).toHaveBeenLastCalledWith('bia', { x: 560, y: 520 });
  gesture.end(1, { x: 560, y: 390 });
  expect(move).toHaveBeenCalledExactlyOnceWith({ x: 560, y: 520 });
});
it('cancelar um personagem restaura sua posição e ignora eventos tardios', () => {
  const state = initialWorld(); const move = vi.fn();
  const gesture = createPlayGesture(() => state, vi.fn(), move);
  gesture.start(1, { x: 520, y: 400 }); gesture.update(1, { x: 560, y: 390 }); gesture.cancel();
  gesture.end(1, { x: 600, y: 400 });
  expect(move).not.toHaveBeenCalled();
});
it.each([
  ['esquerda', { x: -200, y: 400 }, { x: 60, y: 490 }], ['direita', { x: 1400, y: 400 }, { x: 940, y: 490 }],
  ['alto', { x: 500, y: 100 }, { x: 500, y: 410 }], ['pé da cena', { x: 500, y: 590 }, { x: 500, y: 540 }],
])('os pés encostam na borda %s em vez de congelar, seguindo o dedo no outro eixo', (_, finger, feet) => {
  expect(destination({ offset: { x: 0, y: 90 } }, finger, initialWorld())).toEqual(feet);
});
it('pega pela cabeça: soltar com os pés sobre o sofá livre faz sentar e conta como sentou', () => {
  const state = initialWorld(), dispatch = vi.fn(), outcome = vi.fn();
  const gesture = createPlayGesture(() => state, vi.fn(), vi.fn(), { dispatch, outcome, preview: vi.fn(), wardrobe: () => false, toggleWardrobe: vi.fn() });
  // Bia's feet are at 520, 530; held 150 above them, the finger stays over the wall while the feet reach the sofa (150, 405).
  gesture.start(1, { x: 520, y: 380 }); gesture.update(1, { x: 150, y: 255 }); gesture.end(1, { x: 150, y: 255 });
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'sit', actor: 'bia', seat: 'sofa-left' }); expect(outcome).toHaveBeenCalledWith('sat');
});
it('um arraste interrompido por Escape conta como cancelado, e um movimento comum como movido', () => {
  const state = initialWorld(), outcome = vi.fn(), move = vi.fn();
  const gesture = createPlayGesture(() => state, vi.fn(), move, { dispatch: vi.fn(), outcome, preview: vi.fn(), previewActor: vi.fn(), wardrobe: () => false, toggleWardrobe: vi.fn() });
  gesture.start(1, { x: 520, y: 440 }); gesture.update(1, { x: 600, y: 440 }); gesture.cancel('escape');
  expect(outcome).toHaveBeenLastCalledWith('cancelled:escape');
  gesture.start(2, { x: 520, y: 440 }); gesture.update(2, { x: 600, y: 440 }); gesture.end(2, { x: 600, y: 440 });
  expect(outcome).toHaveBeenLastCalledWith('moved'); expect(move).toHaveBeenCalledExactlyOnceWith({ x: 600, y: 530 });
});
