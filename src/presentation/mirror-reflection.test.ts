import { expect, it } from 'vitest';
import type { Piece } from '../domain/types';
import { visualPiecePoint } from './furniture-scale';
import { echoOf, frontOf, glassOf, reflectionPlace } from './mirror-reflection';

const mirror: Piece = { id: 9, kind: 'mirror', room: 'sala', x: 450, y: 140, color: 'original', flipped: false };

it('o vidro é o retângulo arredondado da arte, na escala desenhada do espelho', () => {
  const glass = glassOf(mirror), top = visualPiecePoint(mirror, { x: 469, y: 153 }), bottom = visualPiecePoint(mirror, { x: 531, y: 256 });
  expect(glass).toEqual({ x: top.x, y: top.y, width: bottom.x - top.x, height: bottom.y - top.y, radius: 22 });
});

it('quem está mais perto na frente do espelho (até 110 px do meio) é refletido', () => {
  expect(frontOf(mirror, [{ id: 'bia', x: 300 }, { id: 'luna', x: 560 }])).toBe('luna');
  expect(frontOf(mirror, [{ id: 'bia', x: 520 }, { id: 'luna', x: 470 }])).toBe('bia');
  expect(frontOf(mirror, [{ id: 'bia', x: 339 }, { id: 'luna', x: 661 }])).toBeUndefined();
  expect(frontOf(mirror, [{ id: 'leo', x: 390 }])).toBe('leo');
});

it('o reflexo é espelhado no eixo x, a três quartos do tamanho, e anda só um pouco para o lado em que ela está', () => {
  const glass = glassOf(mirror), middle = glass.x + glass.width / 2;
  expect(reflectionPlace(glass, middle)).toEqual({ x: middle, y: glass.y + glass.height + 62, scaleX: -.75, scale: .75 });
  expect(reflectionPlace(glass, middle + 40).x).toBeCloseTo(middle + 12);
  expect(reflectionPlace(glass, middle + 400).x).toBeCloseTo(middle + glass.width / 4);
  expect(reflectionPlace(glass, middle - 400).x).toBeCloseTo(middle - glass.width / 4);
});

it('o reflexo copia a pose de 100 ms atrás (ou a mais antiga que houver)', () => {
  const at = (t: number) => ({ t, x: t, rotation: 0, poseX: 0, poseY: 0, expression: 'neutral' as const });
  const history = [at(0), at(40), at(90), at(130), at(160)];
  expect(echoOf(history, 200)?.t).toBe(90);
  expect(echoOf(history, 230)?.t).toBe(130);
  expect(echoOf([at(500)], 520)?.t).toBe(500);
});
