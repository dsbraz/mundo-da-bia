import { expect, it } from 'vitest';
import { placeTimes } from './place-transition';

it('porta: íris de 220 ms fechando e 260 ms abrindo; mapa e Ir: 180 + 220; deslize: 200 antes de repintar; sempre abaixo de 600 ms', () => {
  expect(placeTimes('door', false)).toEqual({ close: 220, open: 260 });
  expect(placeTimes('fade', false)).toEqual({ close: 180, open: 220 });
  expect(placeTimes('swipe', false)).toEqual({ close: 200, open: 0 });
  for (const kind of ['door', 'fade', 'swipe'] as const) { const t = placeTimes(kind, false); expect(t.close + t.open + 16).toBeLessThan(600); }
});
it('movimento reduzido: um só fade de no máximo 120 ms, sem fechar devagar', () => {
  for (const kind of ['door', 'fade', 'swipe'] as const) expect(placeTimes(kind, true)).toEqual({ close: 0, open: 120 });
});
