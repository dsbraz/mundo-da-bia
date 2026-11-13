import { expect, it } from 'vitest';
import { ringPlace } from './controls';

const world = { left: 0, top: 80, right: 844, bottom: 390 }, size = { width: 360, height: 84 };

it('o anel flutua acima da cabeça e da fala, centrado em quem está selecionado', () => {
  expect(ringPlace({ x: 400, y: 380 }, size, 150, 75, world)).toEqual({ x: 220, y: 146 });
});
it('sem espaço acima (assento alto numa tela baixa), o anel vai para o lado da cabeça e deixa a fala à vista (W3L-15)', () => {
  // Feet at y 260: above would be y 26, out of the scene. Right of the head does not fit (300 + 75 + 360 > 836): to the left.
  expect(ringPlace({ x: 600, y: 260 }, size, 150, 75, world)).toEqual({ x: 165, y: 88 });
  // Room on the right: there.
  expect(ringPlace({ x: 200, y: 260 }, size, 150, 75, world)).toEqual({ x: 275, y: 88 });
});
