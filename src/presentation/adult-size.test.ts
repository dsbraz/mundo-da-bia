import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { artHeight, figureHeight, figureWidth, lyingShift, posePoint, ringClearance, stature } from './pose';
import { selectionLayout } from './selection-art';

const world = initialWorld(), who = (id: string) => world.actors.find(a => a.id === id)!;
it('os adultos são claramente adultos: 1,25 a 1,35 vez a altura das crianças (lote 6B)', () => {
  for (const id of ['daniel', 'fabiana']) {
    expect(figureHeight(who(id)) / figureHeight(who('bia'))).toBeGreaterThanOrEqual(1.25);
    expect(figureHeight(who(id)) / figureHeight(who('bia'))).toBeLessThanOrEqual(1.35);
  }
});
it('o desenho do adulto cresce por inteiro, sem esticar: a largura acompanha a altura na proporção da arte', () => {
  expect(artHeight(who('daniel'))).toBe(264);
  expect(figureWidth(who('daniel')) / figureHeight(who('daniel'))).toBeCloseTo(140 / 264);
  expect([figureWidth(who('bia')), figureHeight(who('bia'))]).toEqual([140, 220]);
  expect([figureWidth(who('mimi')), figureHeight(who('mimi'))]).toEqual([140, 120]);
});
it('o menu do personagem fica acima da estrela de quem está selecionado, adulto ou criança', () => {
  for (const id of ['bia', 'daniel', 'mimi']) {
    const actor = who(id), star = -selectionLayout(actor).star + 14;
    expect(ringClearance(actor)).toBeGreaterThan(star);
  }
  expect(ringClearance(who('bia'))).toBe(300);
  expect(ringClearance(who('mimi'))).toBe(170);
  expect(stature(who('daniel'))).toBeCloseTo(1.3);
});
it('deitado na cama, o adulto põe a cabeça no travesseiro como a criança: o corpo maior vai para o pé da cama', () => {
  const lie = (id: string) => ({ ...who(id), seat: '8.0' as const, x: 790, y: 350, resting: true, lying: true as const });
  const head = (id: string) => posePoint(lie(id), { x: 0, y: -figureHeight(lie(id)) });
  expect(head('daniel').x).toBeCloseTo(head('bia').x, 0);
  expect(lyingShift(lie('bia'))).toBe(0);
  expect(lyingShift(lie('daniel'))).toBeCloseTo(66 * .86);
  expect(lyingShift(who('daniel'))).toBe(0);
});
