import { afterEach, describe, expect, it, vi } from 'vitest';
import { framing, screenToWorld, viewport, worldToScreen } from './viewport';
it('acomoda o cômodo inteiro em retrato sem deformar e sem faixa vazia acima do teto', () => {
  const view = framing(768, 1024, 1000, { x: 500, y: 300 });
  expect(view.scale).toBeCloseTo(.768);
  expect(view.x).toBe(0);
  expect(view.y).toBe(0);
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

describe('acompanhamento da câmera', () => {
  afterEach(() => vi.unstubAllGlobals());
  function camera(reduced: boolean) {
    vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
    vi.stubGlobal('ResizeObserver', class { observe() {} });
    const views: number[] = [];
    const canvas = { parentElement: { clientWidth: 1000, clientHeight: 600 }, style: { setProperty() {} }, dataset: {} } as unknown as HTMLCanvasElement;
    const view = viewport(canvas, (_w, _h, x) => views.push(x));
    view.scene('sala', 1400);
    return { view, views };
  }
  it('com movimento reduzido corta direto para o enquadramento final', () => {
    const { view, views } = camera(true);
    view.follow({ x: 1100, y: 430 }, 1000);
    expect(views.at(-1)).toBe(350);
    view.follow({ x: 1100, y: 430 }, 1016);
    expect(views.at(-1)).toBe(350);
  });
  it('desliza pelo tempo decorrido, não pela quantidade de quadros', () => {
    const { view, views } = camera(false);
    view.follow({ x: 1100, y: 430 }, 1000);
    // A wide room opens on its 1000-wide core (x = 0, center 500); following eases toward x = 350.
    expect(views[0]).toBe(0);
    expect(views.at(-1)).toBeCloseTo((600 - 250) * .12);
    view.follow({ x: 1100, y: 430 }, 1000 + 2000 / 60);
    expect(views.at(-1)).toBeCloseTo(42 + (558 - 250) * (1 - .88 ** 2));
    view.follow({ x: 1100, y: 430 }, 5000);
    const afterPause = views.at(-1)!;
    expect(afterPause - views.at(-2)!).toBeCloseTo((350 - views.at(-2)!) * .12);
  });
});
