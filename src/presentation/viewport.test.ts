import { expect, it } from 'vitest';
import { framing, screenToWorld, worldToScreen } from './viewport';
it('acomoda o cômodo inteiro em retrato sem deformar', () => {
  const view = framing(768, 1024, 1000, { x: 500, y: 300 });
  expect(view.scale).toBeCloseTo(.768);
  expect(view.x).toBe(0);
  expect(view.y).toBeCloseTo((600 - 1024 / .768) / 2);
});
it('acomoda o cômodo inteiro em paisagem', () => {
  const view = framing(1400, 700, 1000, { x: 900, y: 580 });
  expect(view.scale).toBeCloseTo(700 / 600);
  expect(view.x).toBeCloseTo(-100); expect(view.y).toBe(0);
});
it('mantém navegação lateral em cômodos maiores', () => {
  const view = framing(768, 1024, 1400, { x: 1200, y: 300 });
  expect(view.scale).toBeCloseTo(.768);
  expect(view.x).toBeCloseTo(400);
});

it('converte ponteiro e controles pela mesma câmera, incluindo sobras e rua', () => {
  const canvas = { dataset: { viewWidth: '1200', viewX: '-100', viewY: '-50', cameraX: '660' },
    getBoundingClientRect: () => ({ left: 20, top: 80, width: 600, height: 350 }) } as unknown as HTMLCanvasElement;
  const world = { x: 800, y: 445 };
  expect(worldToScreen(canvas, world)).toEqual({ x: 140, y: 327.5 });
  expect(screenToWorld(canvas, worldToScreen(canvas, world))).toEqual(world);
});
