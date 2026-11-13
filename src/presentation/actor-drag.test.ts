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
  ['esquerda', { x: -200, y: 400 }, { x: 60, y: 490 }], ['direita', { x: 1400, y: 400 }, { x: 1140, y: 490 }],
  ['alto', { x: 500, y: 100 }, { x: 500, y: 410 }], ['pé da cena', { x: 500, y: 590 }, { x: 500, y: 540 }],
])('os pés encostam na borda %s em vez de congelar, seguindo o dedo no outro eixo', (_, finger, feet) => {
  expect(destination({ offset: { x: 0, y: 90 } }, finger, initialWorld())).toEqual(feet);
});
it('pega pela cabeça: soltar com os pés sobre o sofá livre faz sentar e conta como sentou', () => {
  const state = initialWorld(), dispatch = vi.fn(), outcome = vi.fn();
  const gesture = createPlayGesture(() => state, vi.fn(), vi.fn(), { dispatch, outcome, preview: vi.fn(), wardrobe: () => false, toggleWardrobe: vi.fn() });
  // Bia's feet are at 520, 530; held 150 above them, the finger stays over the wall while the feet reach the sofa (150, 405).
  gesture.start(1, { x: 520, y: 380 }); gesture.update(1, { x: 150, y: 255 }); gesture.end(1, { x: 150, y: 255 });
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'sit', actor: 'bia', seat: '2.0' }); expect(outcome).toHaveBeenCalledWith('sat');
});
it('um arraste interrompido por Escape conta como cancelado, e um movimento comum como movido', () => {
  const state = initialWorld(), outcome = vi.fn(), move = vi.fn();
  const gesture = createPlayGesture(() => state, vi.fn(), move, { dispatch: vi.fn(), outcome, preview: vi.fn(), previewActor: vi.fn(), wardrobe: () => false, toggleWardrobe: vi.fn() });
  gesture.start(1, { x: 520, y: 440 }); gesture.update(1, { x: 600, y: 440 }); gesture.cancel('escape');
  expect(outcome).toHaveBeenLastCalledWith('cancelled:escape');
  // An empty spot between Pipoca (610) and Nino (740): over someone's feet the drop would be a hug (W3L-14).
  gesture.start(2, { x: 520, y: 440 }); gesture.update(2, { x: 680, y: 440 }); gesture.end(2, { x: 680, y: 440 });
  expect(outcome).toHaveBeenLastCalledWith('moved'); expect(move).toHaveBeenCalledExactlyOnceWith({ x: 680, y: 530 });
});
it('um toque perto do corpo, fora do desenho, continua sendo um toque no chão; só o arraste leva a personagem', () => {
  // 20 px right of Bia's body box: inside the grab capsule, off the drawing.
  const state = { ...initialWorld(), grabSlack: 28 }, near = { x: 520 + 43 + 15, y: 400 };
  const walk = vi.fn(), move = vi.fn(), select = vi.fn();
  const play = { dispatch: vi.fn(), preview: vi.fn(), previewActor: vi.fn(), wardrobe: () => false, toggleWardrobe: vi.fn(), walk, selected: () => 'leo' as const };
  const tapGesture = createPlayGesture(() => state, select, move, play);
  tapGesture.start(1, near); tapGesture.end(1, near);
  expect(walk).toHaveBeenCalledWith(near); expect(select).not.toHaveBeenCalled();
  const dragGesture = createPlayGesture(() => state, select, move, play);
  dragGesture.start(2, near); dragGesture.update(2, { x: near.x - 60, y: near.y }); dragGesture.end(2, { x: near.x - 60, y: near.y });
  expect(select).toHaveBeenCalledWith('bia'); expect(move).toHaveBeenCalledWith({ x: 460, y: 530 });
});
it('soltar a Bia com os pés sobre os do Léo é um abraço, não um passo (W3L-14)', () => {
  const state = initialWorld(), outcome = vi.fn(), move = vi.fn(), dispatch = vi.fn();
  const gesture = createPlayGesture(() => state, vi.fn(), move, { dispatch, outcome, preview: vi.fn(), previewActor: vi.fn(), wardrobe: () => false, toggleWardrobe: vi.fn() });
  gesture.start(1, { x: 520, y: 440 }); gesture.update(1, { x: 420, y: 440 }); gesture.end(1, { x: 420, y: 440 });
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'hug', actor: 'bia', other: 'leo' });
  expect(outcome).toHaveBeenLastCalledWith('hugged'); expect(move).not.toHaveBeenCalled();
});
