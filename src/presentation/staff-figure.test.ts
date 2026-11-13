import { describe, expect, it } from 'vitest';
import { facing, staffScale, visit } from './staff-figure';
import { artPoint, hoseArc, hoseDrops, tradeMs } from './staff-effects';
import { staffParts } from './staff-art';
import { figureHeight } from './pose';

describe('os profissionais na cena (lote 7)', () => {
  it('têm a altura de um adulto, maior que a de uma criança', () => {
    expect(264 * staffScale()).toBeCloseTo(figureHeight({ id: 'daniel', kind: 'human' }) * .86);
    expect(264 * staffScale()).toBeGreaterThan(figureHeight({ id: 'bia', kind: 'human' }) * .86);
  });
  it('olham para o meio do cômodo, ou para a criança até onde vão', () => {
    expect(facing(900, 600)).toBe(-1);
    expect(facing(300, 600)).toBe(1);
  });
  it('a médica chega em 400 ms, fica e volta no fim; com movimento reduzido, salta', () => {
    expect([0, 200, 400, tradeMs / 2, tradeMs - 200, tradeMs].map(t => visit(t, false))).toEqual([0, .5, 1, 1, .5, 0]);
    expect([0, tradeMs - 1, tradeMs].map(t => visit(t, true))).toEqual([1, 1, 0]);
  });
  it('a água sai do bico da mangueira, sobe e cai à frente de quem esguicha; parada com movimento reduzido', () => {
    const right = { x: 500, y: 465, side: 1, k: 1 }, left = { ...right, side: -1 };
    expect(hoseArc(right, 0)).toEqual(artPoint(right, 141, 119));
    expect(hoseArc(right, .5).y).toBeLessThan(hoseArc(right, 0).y);
    expect(hoseArc(right, 1).x).toBeGreaterThan(500);
    expect(hoseArc(left, 1).x).toBeLessThan(500);
    expect(hoseDrops(right, 0, true)).toEqual(hoseDrops(right, 900, true));
    expect(hoseDrops(right, 0, false).every(d => d.x === hoseArc(right, 0).x)).toBe(true);
  });
  it('cada profissional tem corpo, braço parado e braço trabalhando, com o rosto das crianças', () => {
    expect(staffParts('doctor')).toEqual({ body: ['staff-doctor-back', 'staff-doctor', 'face', 'staff-doctor-hair', 'eyes', 'brows', 'mouth-happy', 'staff-doctor-hat'], arm: ['staff-doctor-arm'], act: ['staff-doctor-act'] });
  });
});
