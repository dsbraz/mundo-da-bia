import type Phaser from 'phaser';
import type { Phase } from '../domain/clock';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { World } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { floorCount } from '../domain/modules';
import { plotStart, streetWidth } from '../domain/neighborhood-geometry';
import { architectureKey, facadeSvg, hallShift, roomArchitecture } from './architecture-art';
import { schoolBellPoint } from './panoramic-facade';

/** How a phase of the session's day looks (W3L-11): a tinted veil over the backdrop only (furniture and faces keep their colors), the
 *  moon and stars at night, and lit windows from dusk on. A lamp on keeps a room brighter. Never saved: the session starts in the morning. */
export interface Light { veil: number; color: number; stars: boolean; lit: boolean }
const tints: Record<Phase, [number, number]> = {
  manha: [0, 0x15206a], tarde: [0, 0x15206a], entardecer: [.24, 0x6e4a86], noite: [.5, 0x15206a], amanhecer: [.16, 0xe0907a],
};
export function lightOf(phase: Phase, lamp: boolean): Light {
  const [veil, color] = tints[phase];
  return { veil: lamp ? veil * .7 : veil, color, stars: phase === 'noite', lit: phase === 'entardecer' || phase === 'noite' };
}
export interface Rect { x: number; y: number; width: number; height: number }
/** The glass panes of an architecture drawing (its `url(#glass)` rectangles): the windows that light up or show the night. */
export function glassRects(svg: string): Rect[] {
  return [...svg.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"[^>]*fill="url\(#glass\)"/g)]
    .map(([, x, y, width, height]) => ({ x: Number(x), y: Number(y), width: Number(width), height: Number(height) }));
}
/** Fixed stars over `width` of sky (the same on every repaint). */
export function starsAt(width: number) {
  return Array.from({ length: Math.ceil(width / 55) }, (_, i) => ({ x: (i * 137.5 + 31) % width, y: 26 + (i * 53) % 200, r: 1.6 + (i % 3) * .7 }));
}
/** A star's brightness this frame; with reduced motion they shine without blinking. */
export function twinkle(time: number, index: number, reduced: boolean) { return reduced ? 1 : .55 + .45 * Math.sin(time / 650 + index * 1.7); }

type Graphics = Phaser.GameObjects.Graphics;
const memo = new Map<string, Rect[]>();
const panes = (key: string, svg: () => string) => { if (!memo.has(key)) memo.set(key, glassRects(svg())); return memo.get(key)!; };
const warm = 0xffd98a, nightGlass = 0x2c3a72, duskGlass = 0xd9907c;
/** Lit windows of the street's buildings (a lamp on in any room) or, in a room, its windows showing the sky outside. */
function windows(g: Graphics, state: World, town: Neighborhood | null, light: Light) {
  if (!light.lit) return;
  if (state.streetWidth && town) {
    town.buildings.filter(b => Object.values(b.layout.rooms).some(r => r.home.lamp)).forEach(b => {
      const floors = floorCount(b.layout), x = plotStart(b.plot);
      panes(`${b.model}-${floors}`, () => facadeSvg(b.model, floors)).forEach(r => litPane(g, x + r.x, r.y, r.width, r.height));
    });
    return;
  }
  const template = state.layout.rooms[state.room]!.template, scale = roomWidth(state) / 1000, { key, stairs } = architectureKey(state);
  const glass = light.stars ? nightGlass : duskGlass;
  panes(key, () => roomArchitecture(template, stairs)).map(r => stairs ? { ...r, x: hallShift(r.x), width: r.width * .8 } : r).forEach(r => {
    g.fillStyle(glass, .82).fillRect(r.x * scale, r.y, r.width * scale, r.height);
    if (light.stars) [[.2, .25], [.7, .18], [.45, .6], [.85, .7]].forEach(([u, v]) => g.fillStyle(0xfffbe8, .9).fillCircle((r.x + r.width * u!) * scale, r.y + r.height * v!, 2.2));
  });
}
/** A window lit from inside: a soft halo, the warm pane and its cross bars. */
function litPane(g: Graphics, x: number, y: number, w: number, h: number) {
  g.fillStyle(warm, .22).fillRoundedRect(x - 7, y - 7, w + 14, h + 14, 8).fillStyle(warm, .95).fillRect(x, y, w, h);
  g.lineStyle(2.5, 0xc7934a, .7).lineBetween(x + w / 2, y, x + w / 2, y + h).lineBetween(x, y + h / 2, x + w, y + h / 2);
}
/** In the morning the bell of every school on the street glows (W3L-27): a warm halo and a few short rays around it. */
export function schoolBells(town: Neighborhood | null, phase: Phase): { x: number; y: number }[] {
  return phase === 'manha' && town ? town.buildings.filter(b => b.model === 'school').map(b => { const at = schoolBellPoint(floorCount(b.layout)); return { x: plotStart(b.plot) + at.x, y: at.y }; }) : [];
}
function bellGlow(g: Graphics, at: { x: number; y: number }) {
  g.fillStyle(warm, .3).fillCircle(at.x, at.y, 30).fillStyle(warm, .45).fillCircle(at.x, at.y, 20);
  g.lineStyle(3, 0xf2b630, .9);
  for (const angle of [-2.6, -2.2, -.95, -.55]) g.lineBetween(at.x + Math.cos(angle) * 26, at.y + Math.sin(angle) * 26, at.x + Math.cos(angle) * 36, at.y + Math.sin(angle) * 36);
}
/** A crescent: the full disc bitten by the veiled sky's color (#e9f3ef under the night veil), and a faint halo. */
function moon(g: Graphics, x: number) {
  g.fillStyle(0xfff4cf, .18).fillCircle(x, 228, 40).fillStyle(0xfff4cf).fillCircle(x, 228, 26).fillStyle(0x7f89ac).fillCircle(x + 12, 220, 22);
}
/** The night layer of the scene: painted with every repaint, cross-faded when the phase changes (120 ms with reduced motion). */
export function dayNight(scene: Phaser.Scene) {
  let phase: Phase = 'manha', layer: Phaser.GameObjects.Container | null = null, stars: Graphics | null = null, sky: ReturnType<typeof starsAt> = [];
  let world: World | null = null, town: Neighborhood | null = null;
  function mark(reduced: boolean) {
    if (!navigator.webdriver) return;
    const light = world ? lightOf(phase, world.streetWidth ? false : world.home.lamp) : lightOf(phase, true);
    scene.game.canvas.dataset.night = `${phase}:${light.veil.toFixed(2)}:${stars ? (reduced ? 'still' : 'twinkle') : 'none'}`;
  }
  function build(state: World): Phaser.GameObjects.Container {
    const light = lightOf(phase, state.streetWidth ? false : state.home.lamp), width = state.streetWidth ? streetWidth(town?.plots ?? 4) : roomWidth(state);
    const veil = scene.add.graphics().fillStyle(light.color, light.veil).fillRect(-10000, -10000, width + 20000, 20600);
    const panes = scene.add.graphics(); windows(panes, state, town, light);
    const bells = state.streetWidth ? schoolBells(town, phase) : [];
    bells.forEach(at => bellGlow(panes, at));
    if (navigator.webdriver) scene.game.canvas.dataset.bell = bells.length ? 'on' : '';
    const children: Phaser.GameObjects.GameObject[] = [veil];
    stars = null; sky = [];
    if (light.stars && state.streetWidth) {
      sky = starsAt(width); stars = scene.add.graphics();
      const glow = scene.add.graphics(); moon(glow, 560);
      children.push(stars, glow);
    }
    children.push(panes);
    return scene.add.container(0, 0, children).setDepth(.5).setName('night');
  }
  return {
    paint(state: World, current: Neighborhood | null) {
      world = state; town = current; if (layer) scene.tweens.killTweensOf(layer);
      layer = build(state); mark(false);
    },
    set(next: Phase, reduced: boolean) {
      if (next === phase) return;
      phase = next; if (!world || !layer?.active) return;
      const old = layer; layer = build(world).setAlpha(0);
      scene.tweens.add({ targets: layer, alpha: 1, duration: reduced ? 120 : 1200 });
      scene.tweens.add({ targets: old, alpha: 0, duration: reduced ? 120 : 1200, onComplete: () => old.destroy() });
      mark(reduced);
    },
    frame(time: number, reduced: boolean) {
      if (!stars?.active) return;
      stars.clear(); sky.forEach((s, i) => stars!.fillStyle(0xfffbe8, twinkle(time, i, reduced)).fillCircle(s.x, s.y, s.r));
      mark(reduced);
    },
    phase: () => phase,
  };
}
