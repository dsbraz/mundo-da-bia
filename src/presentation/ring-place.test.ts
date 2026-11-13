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
it('o anel não cobre a placa de uma prateleira do mercado: sobe para o alto da cena, ainda centrado em quem está selecionado', () => {
  const tall = { left: 0, top: 84, right: 1024, bottom: 768 }, sign = { left: 140, top: 340, right: 335, bottom: 381 };
  // Above the head it would cover the sign (y 270-354): it goes to the top of the scene instead.
  expect(ringPlace({ x: 300, y: 700 }, size, 346, 186, tall, [sign])).toEqual({ x: 120, y: 92 });
  // A sign away from the ring changes nothing.
  expect(ringPlace({ x: 800, y: 700 }, size, 346, 186, tall, [sign])).toEqual({ x: 620, y: 270 });
});
