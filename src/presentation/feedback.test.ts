import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { bubbleDuration, bubblePlace, pokeFigure, refuseAt, speechBubble } from './feedback';
afterEach(() => vi.unstubAllGlobals());

function fakeScene() {
  const tweens: Record<string, unknown>[] = [], destroyed: string[] = [], texts: { text: string; style: Record<string, unknown> }[] = [], images: string[] = [];
  const canvas = { dataset: {} as Record<string, string> };
  const object = (name = '') => {
    const o: Record<string, unknown> = { x: 0, y: 0, active: true, width: 100, height: 30, scaleX: 1, scaleY: 1, data: {} as Record<string, unknown> };
    for (const m of ['setOrigin', 'setDepth', 'setScale', 'setName', 'setDisplaySize', 'setX', 'setY', 'setPosition', 'fillStyle', 'fillRoundedRect', 'fillTriangle', 'lineStyle', 'strokeRoundedRect', 'add']) o[m] = () => o;
    o.destroy = () => { o.active = false; destroyed.push(name); };
    o.setData = (k: string, v: unknown) => { (o.data as Record<string, unknown>)[k] = v; return o; };
    o.getData = (k: string) => (o.data as Record<string, unknown>)[k];
    o.getByName = () => o;
    return o;
  };
  const scene = {
    game: { canvas }, cameras: { main: { scrollX: 0, scrollY: 0, width: 2000, height: 1200, zoom: 2 } },
    add: {
      text: (_x: number, _y: number, text: string, style: Record<string, unknown>) => { texts.push({ text, style }); return object(text); },
      image: (_x: number, _y: number, key: string) => { images.push(key); return object(key); },
      graphics: () => object('graphics'), container: (x: number, y: number) => Object.assign(object('bubble'), { x, y }),
    },
    tweens: { add: (config: Record<string, unknown>) => { tweens.push(config); }, killTweensOf() {} },
    textures: { exists: (key: string) => key.startsWith('face-') },
  };
  return { scene: scene as unknown as Phaser.Scene, tweens, destroyed, texts, images, canvas, object };
}

it('o balão dura 1800 ms mais 60 ms por caractere', () => {
  expect(bubbleDuration('Oi!')).toBe(1800 + 180);
});

it('fala com fonte de 22 px ou mais e mostra um balão por personagem', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const s = fakeScene();
  speechBubble(s.scene, { x: 100, y: 400 }, 'Hummm! Bia adorou!', 'bia');
  expect(Number.parseInt(String(s.texts[0]!.style.fontSize), 10)).toBeGreaterThanOrEqual(22);
  expect(s.canvas.dataset.said).toBe('Hummm! Bia adorou!');
  speechBubble(s.scene, { x: 100, y: 400 }, 'Oba! Bia pegou!', 'bia');
  expect(s.destroyed).toContain('bubble');
  speechBubble(s.scene, { x: 300, y: 400 }, 'Oi!', 'luna');
  expect(s.destroyed.filter(d => d === 'bubble')).toHaveLength(1);
  const exit = s.tweens.filter(t => t.alpha === 0).at(-1)!;
  expect(Number(exit.duration) + Number(exit.delay)).toBe(bubbleDuration('Oi!'));
});

it('com movimento reduzido o balão não sobe e some por fade de 120 ms', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const s = fakeScene();
  speechBubble(s.scene, { x: 100, y: 400 }, 'Oi!', 'bia');
  expect(s.tweens).toHaveLength(1);
  expect(s.tweens[0]).toMatchObject({ alpha: 0, duration: 120 });
});

it('recusa é um tremor suave com balão neutro perto do alvo', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const s = fakeScene(), figure = s.object('figure');
  refuseAt(s.scene, { x: 500, y: 300 }, 'Lia está aqui agora!', figure as unknown as Phaser.GameObjects.Container);
  expect(s.canvas.dataset.said).toBe('Lia está aqui agora!');
  expect(s.tweens.some(t => t.targets !== undefined && JSON.stringify(t).includes('"yoyo":true'))).toBe(true);
  expect(s.texts[0]!.style.color).not.toBe('#a25240');
});

it('recusa no lugar ocupado mostra o rosto de quem está lá, dentro do balão', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const s = fakeScene();
  refuseAt(s.scene, { x: 400, y: 380 }, 'Luna está aqui agora!', undefined, 'luna');
  expect(s.images).toEqual(['face-luna']); expect(s.canvas.dataset.saidFace).toBe('luna');
  refuseAt(s.scene, { x: 400, y: 380 }, 'Hmm, por aqui não passa.');
  expect(s.images).toEqual(['face-luna']); expect(s.canvas.dataset.saidFace).toBe('');
});

it('o toque de reação anima a pose, fala e marca a reação no canvas', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const s = fakeScene(), figure = s.object('figure');
  Object.assign(figure, { name: 'bia', x: 200, y: 520 });
  pokeFigure(s.scene, figure as unknown as Phaser.GameObjects.Container, 'hop', 'Oba! Bia pulou alto!', 220);
  expect(s.canvas.dataset.reaction).toBe('bia:Oba! Bia pulou alto!');
  expect(s.tweens.length).toBeGreaterThanOrEqual(2);
  const motion = s.tweens.find(t => 'onUpdate' in t)!;
  (motion.onUpdate as () => void)();
  expect(typeof (figure as { getData: (k: string) => unknown }).getData('hop')).toBe('number');
});

it('com movimento reduzido a reação só fala, sem pulos', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const s = fakeScene(), figure = Object.assign(s.object('figure'), { name: 'mimi' });
  pokeFigure(s.scene, figure as unknown as Phaser.GameObjects.Container, 'purr', 'Rrrron…', 120);
  expect(s.canvas.dataset.reaction).toBe('mimi:Rrrron…');
  expect(s.tweens).toHaveLength(1);
});

it('um aceno sem fala só pula: nenhum balão e nada dito no canvas', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const s = fakeScene(), figure = Object.assign(s.object('figure'), { name: 'luna', x: 300, y: 520 });
  pokeFigure(s.scene, figure as unknown as Phaser.GameObjects.Container, 'hop', '', 196);
  expect(s.texts).toHaveLength(0);
  expect(s.canvas.dataset.said).toBeUndefined();
  expect(s.tweens).toHaveLength(1);
});

it('o balão fica acima do ponto, inteiro na área visível, com o rabinho apontando para o ponto', () => {
  const view = { left: 270, right: 770 };
  const centred = bubblePlace({ x: 520, y: 360 }, 200, 80, view);
  expect(centred).toEqual({ x: 520, base: 0, tip: 0, center: -14 - 40 });
  const slid = bubblePlace({ x: 400, y: 360 }, 440, 82, view);
  expect(slid.x - 220).toBeGreaterThanOrEqual(270); expect(slid.x + 220).toBeLessThanOrEqual(770);
  expect(slid.x + slid.tip).toBe(400); expect(Math.abs(slid.base)).toBeLessThanOrEqual(220 - 24);
  // The whole box is above the tip, so it never covers what the tip points at.
  expect(slid.center + 41).toBeLessThanOrEqual(-14);
  expect(bubblePlace({ x: 400, y: 360 }, 700, 82, view).x - 350).toBe(278);
});
it('o balão marca no canvas a sua caixa no mundo', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const s = fakeScene();
  speechBubble(s.scene, { x: 30, y: 400 }, 'Oi!', 'bia');
  const [left, top, width, height] = s.canvas.dataset.saidBox!.split(',').map(Number);
  expect(left).toBe(8); expect(width).toBe(132); expect(top! + height!).toBe(400 - 14);
});
