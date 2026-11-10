import { afterEach, describe, expect, it, vi } from 'vitest';
import { framing, openingX, screenToWorld, streetFrame, viewport, worldToScreen } from './viewport';
// Drawn height of a human (hair to shoes) in logical units, measured on the rendered capture: 131 px at scale .768.
const human = 170;
// The scene area of a 768x1024 tablet in portrait, below the header and above the panel.
const tablet = { width: 768, height: 582 };
it('o interior preenche a altura da cena: humano com 150 px ou mais a 768 e nenhuma faixa vazia', () => {
  const view = framing(tablet.width, tablet.height, 1000, { x: 500, y: 300 });
  expect(view.scale).toBeCloseTo(582 / 600);
  expect(human * view.scale).toBeGreaterThanOrEqual(150);
  expect(view.y).toBe(0); expect(tablet.height / view.scale).toBeCloseTo(600);
  expect(view.x).toBeCloseTo(500 - 768 / view.scale / 2);
});
it('a rua aproxima a câmera com fachadas e pessoas na mesma escala, sem faixa de asfalto', () => {
  const view = framing(tablet.width, tablet.height, 1000, { x: 500, y: 360 }, streetFrame);
  expect(human * .6 * view.scale).toBeGreaterThanOrEqual(110);
  expect(view.y + tablet.height / view.scale).toBeCloseTo(600);
  expect((600 - 565) / (tablet.height / view.scale)).toBeLessThanOrEqual(.2);
  expect(768 / view.scale).toBeGreaterThanOrEqual(440);
});
it('em paisagem larga a vista nunca passa da largura do cômodo e acompanha o centro na vertical', () => {
  const view = framing(1400, 700, 1000, { x: 900, y: 580 });
  expect(view.scale).toBeCloseTo(1.4);
  expect(view.x).toBeCloseTo(0); expect(view.y).toBeCloseTo(100);
});
it('mantém navegação lateral em cômodos maiores', () => {
  const view = framing(tablet.width, tablet.height, 1400, { x: 1200, y: 300 });
  expect(view.scale).toBeCloseTo(582 / 600);
  expect(view.x).toBeCloseTo(1400 - 768 / view.scale);
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
  it('chega e para: a menos de meio ponto do alvo, encosta nele em vez de deslizar para sempre', () => {
    const { view, views } = camera(false);
    for (let t = 1000; t < 4000; t += 16) view.follow({ x: 700, y: 430 }, t, 0);
    expect(views.at(-1)).toBe(200);
  });
  it('sem folga, centra o ponto (a amarelinha enquadra o tabuleiro, não só a criança)', () => {
    const { view, views } = camera(true);
    view.follow({ x: 700, y: 430 }, 1000);
    expect(views.at(-1)).toBe(0);
    view.follow({ x: 700, y: 430 }, 1016, 0);
    expect(views.at(-1)).toBe(200);
  });
});

describe('onde o cômodo abre', () => {
  it('abre na janela que mostra mais móveis inteiros, com a criança escolhida sempre à vista', () => {
    const ward = [{ left: 14, right: 439 }, { left: 430, right: 540 }, { left: 600, right: 680 }], bia = { left: 478, right: 562 };
    const x = openingX(ward, 793, 1000, bia);
    expect(x).toBeLessThanOrEqual(14); expect(x + 793).toBeGreaterThanOrEqual(680);
    expect(openingX([{ left: 0, right: 300 }, { left: 700, right: 1000 }], 500, 1000, { left: 800, right: 880 })).toBe(500);
    expect(openingX([], 1200, 1000)).toBe(-100);
    // A list of musts: the first that fits stays whole; a phone too narrow for the first keeps the next.
    const both = { left: 300, right: 800 }, child = { left: 300, right: 400 };
    expect(openingX([], 600, 1000, [both, child])).toBeLessThanOrEqual(300); expect(openingX([], 600, 1000, [both, child]) + 600).toBeGreaterThanOrEqual(800);
    const phone = openingX([], 300, 1000, [both, child], [{ left: 900, right: 990 }]);
    expect(phone).toBeLessThanOrEqual(300); expect(phone + 300).toBeGreaterThanOrEqual(400);
    expect(openingX([{ left: 14, right: 439 }, { left: 640, right: 700 }, { left: 720, right: 780 }], 617, 1000, { left: 300, right: 384 })).toBeLessThanOrEqual(14);
  });
  it('abre centrada nas pessoas: a turma inteira antes dos móveis, com a escolhida sempre à vista', () => {
    const sala = [{ left: 90, right: 900 }, { left: 60, right: 330 }, { left: 292, right: 518 }, { left: 620, right: 765 }, { left: 0, right: 150 }, { left: 160, right: 400 }, { left: 830, right: 1000 }];
    const people = [203, 330, 420, 520, 610, 740, 830].map((x, i) => ({ left: x - (i === 1 || i >= 4 && i <= 5 ? 35 : 42), right: x + 42 }));
    const x = openingX(sala, 792, 1000, { left: 470, right: 570 }, people);
    expect(people.every(p => p.left >= x && p.right <= x + 792)).toBe(true);
    // Furniture alone would open on the left; whole people come first, even against a bed, and furniture breaks ties among them.
    expect(openingX([{ left: 0, right: 425 }], 500, 1000, undefined, [{ left: 600, right: 680 }, { left: 700, right: 780 }])).toBeGreaterThanOrEqual(280);
    expect(openingX([{ left: 0, right: 425 }], 500, 1000, undefined, [{ left: 300, right: 380 }])).toBeLessThanOrEqual(0);
    // The chosen character is a hard rule: kept in view even when the others are elsewhere.
    expect(openingX([], 500, 1000, { left: 40, right: 140 }, [{ left: 700, right: 780 }, { left: 800, right: 880 }])).toBeLessThanOrEqual(40);
  });
  it('a escolhida abre a 24 px ou mais da borda da cena', () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} });
    const canvas = { parentElement: { clientWidth: 390, clientHeight: 467 }, style: { setProperty() {} }, dataset: {} as Record<string, string> } as unknown as HTMLCanvasElement;
    const view = viewport(canvas, () => {});
    // A wide piece would open with her right on the left edge.
    view.scene('sala', 1000, 600, [{ left: 470, right: 960 }], { left: 470, right: 554 });
    const scale = 467 / 600, left = Number(canvas.dataset.viewX), right = left + Number(canvas.dataset.viewWidth);
    expect((470 - left) * scale).toBeGreaterThanOrEqual(24); expect((right - 554) * scale).toBeGreaterThanOrEqual(24);
    vi.unstubAllGlobals();
  });
  it('abre a cena com a cama da enfermaria inteira a 768', () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} });
    const canvas = { parentElement: { clientWidth: 768, clientHeight: 582 }, style: { setProperty() {} }, dataset: {} as Record<string, string> } as unknown as HTMLCanvasElement;
    const view = viewport(canvas, () => {});
    view.scene('enfermaria', 1000, 600, [{ left: 14, right: 439 }, { left: 430, right: 540 }], { left: 478, right: 562 });
    expect(Number(canvas.dataset.viewX)).toBeLessThanOrEqual(14);
    view.scene('enfermaria', 1000, 600, [{ left: 14, right: 439 }], { left: 900, right: 990 });
    expect(Number(canvas.dataset.viewX)).toBeLessThanOrEqual(14);
    vi.unstubAllGlobals();
  });
});
it('cada peça do cômodo atual vira uma faixa horizontal pelo seu desenho', async () => {
  const { initialWorld } = await import('../domain/world');
  const { pieceSpans } = await import('./viewport');
  const world = initialWorld();
  expect(pieceSpans(world)).toContainEqual({ left: 292, right: 518 });
  expect(pieceSpans(world)).toHaveLength(world.layout.pieces.filter(p => p.room === world.room).length);
});
it('cada personagem do cômodo atual vira uma faixa da largura do seu anel', async () => {
  const { initialWorld } = await import('../domain/world');
  const { peopleSpans } = await import('./viewport');
  const world = initialWorld();
  expect(peopleSpans(world)).toContainEqual({ left: 478, right: 562 });
  expect(peopleSpans(world)).toContainEqual({ left: 295, right: 365 });
  expect(peopleSpans({ ...world, actors: world.actors.map(a => a.id === 'bia' ? { ...a, room: 'quarto' } : a) })).toHaveLength(6);
});
