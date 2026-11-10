import type Phaser from 'phaser';
import { pieceBounds } from '../domain/layout';
import type { Piece, PieceKind, Point } from '../domain/types';
import { reducedFadeMs, reducedMotion } from './motion';
import { hex } from './palette';

type Container = Phaser.GameObjects.Container;
type Graphics = Phaser.GameObjects.Graphics;
const drawn: readonly PieceKind[] = ['sink', 'washer', 'planter', 'bookcase', 'picnic-table', 'kitchen-cart'];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
/** The everyday pieces answer with a drawn, moving effect; the older ones keep their small sign. */
export const drawnUse = (kind: PieceKind) => drawn.includes(kind);

/** Six bubbles rising out of the sink basin (local art coordinates), fading near the top. Still with reduced motion. */
export function bubbleFrame(time: number, reduced: boolean) {
  return Array.from({ length: 6 }, (_, i) => {
    const rise = reduced ? i / 10 : (time / 1400 + i / 6) % 1;
    return { x: 64 + i * 8 + (reduced ? 0 : Math.sin(time / 250 + i) * 3), y: 52 - rise * 62, r: 4 + (i % 3) * 1.5, alpha: reduced ? .85 : 1 - rise * rise };
  });
}
/** The washer drum: about one turn per second; still with reduced motion. */
export const drumAngle = (time: number, reduced: boolean) => reduced ? 0 : time / 1000 * Math.PI * 2;
/** The new sprout in the planter sways at most 0.25 rad; upright with reduced motion. */
export const sproutAngle = (time: number, reduced: boolean) => reduced ? 0 : Math.sin(time / 350) * .25;
/** Three steam wisps that rise and fade; one still wisp each with reduced motion. */
export function steamFrame(time: number, reduced: boolean) {
  return Array.from({ length: 3 }, (_, i) => {
    const k = reduced ? .3 : (time / 1200 + i / 3) % 1;
    return { dx: (i - 1) * 8, rise: k * 26, alpha: reduced ? .6 : .8 * (1 - k) };
  });
}
export const bookDuration = 1400;
/** The book in the reader's hand: slides up into the hand in 200 ms, stays and fades; only a 120 ms fade in and out with reduced motion. */
export function bookFrame(t: number, reduced: boolean) {
  if (reduced) return { alpha: clamp(Math.min(t, bookDuration - t) / reducedFadeMs), lift: 0 };
  return { alpha: t < 1100 ? 1 : clamp((bookDuration - t) / 300), lift: 18 * (1 - clamp(t / 200)) };
}

/** The effect layer of an active everyday piece, mirrored with the art. */
export function drawUse(scene: Phaser.Scene, piece: Piece): Container {
  const box = pieceBounds[piece.kind];
  const layer = scene.add.container(piece.flipped ? box.width : 0, 0).setScale(piece.flipped ? -1 : 1, 1).setName('use-effect').setData('kind', piece.kind);
  layer.add(scene.add.graphics().setName('fx'));
  if (piece.kind === 'planter') layer.add(sprout(scene));
  return layer;
}
function sprout(scene: Phaser.Scene) {
  const g = scene.add.graphics({ x: 104, y: 72 }).setName('sprout');
  g.lineStyle(3, 0x687756).lineBetween(0, 0, 0, -26);
  g.fillStyle(hex('leaf')).fillEllipse(-8, -24, 16, 8).fillEllipse(8, -28, 16, 8);
  return g;
}
const painters: Partial<Record<PieceKind, (g: Graphics, time: number, reduced: boolean) => void>> = {
  sink(g, time, reduced) {
    g.fillStyle(0x9ccbe0, .8).fillRect(70, 30, 5, 22);
    for (const b of bubbleFrame(time, reduced)) g.fillStyle(0xffffff, .7 * b.alpha).fillCircle(b.x, b.y, b.r).lineStyle(1.5, 0x7fb3c9, b.alpha).strokeCircle(b.x, b.y, b.r);
  },
  washer(g, time, reduced) {
    const angle = drumAngle(time, reduced), colors = [hex('coral'), hex('sun'), hex('cobalt')];
    colors.forEach((color, i) => { const a = angle + i * Math.PI * 2 / 3; g.fillStyle(color).fillCircle(65 + Math.cos(a) * 17, 91 + Math.sin(a) * 17, 7); });
  },
  planter() {},
  bookcase(g, time, reduced) {
    const y = -22 + (reduced ? 0 : Math.sin(time / 400) * 3);
    g.fillStyle(hex('cobalt')).fillPoints([{ x: 46, y: y - 14 }, { x: 80, y: y - 8 }, { x: 114, y: y - 14 }, { x: 114, y: y + 8 }, { x: 80, y: y + 14 }, { x: 46, y: y + 8 }], true);
    g.fillStyle(0xfffdf7).fillPoints([{ x: 50, y: y - 16 }, { x: 80, y: y - 10 }, { x: 80, y: y + 10 }, { x: 50, y: y + 4 }], true).fillPoints([{ x: 110, y: y - 16 }, { x: 80, y: y - 10 }, { x: 80, y: y + 10 }, { x: 110, y: y + 4 }], true);
    g.lineStyle(1.5, hex('outline'), .7).lineBetween(80, y - 10, 80, y + 10);
  },
  'picnic-table'(g, time, reduced) { g.fillStyle(hex('coral')).fillCircle(60, 30, 7).fillStyle(hex('leaf')).fillCircle(72, 31, 6); steam(g, 92, 20, time, reduced); },
  'kitchen-cart'(g, time, reduced) { steam(g, 57, 10, time, reduced); },
};
function steam(g: Graphics, x: number, y: number, time: number, reduced: boolean) {
  for (const w of steamFrame(time, reduced)) {
    g.lineStyle(2.5, 0xffffff, w.alpha).beginPath();
    for (let s = 0; s <= 6; s++) { const py = y - w.rise - s * 3, px = x + w.dx + Math.sin(s + (reduced ? 0 : time / 200)) * 2; if (s) g.lineTo(px, py); else g.moveTo(px, py); }
    g.strokePath();
  }
}
/** Every frame: the old signs bob (still with reduced motion) and the everyday effects move. Returns the kinds showing an effect. */
export function animatePieces(pieces: Map<number, Container>, time: number, reduced: boolean): string {
  const shown: string[] = [];
  pieces.forEach(piece => {
    const sign = piece.getByName<Phaser.GameObjects.Text>('effect');
    if (sign) sign.y = 6 + (reduced ? 0 : Math.sin(time / 400) * 4);
    const layer = piece.getByName<Container>('use-effect'); if (!layer) return;
    const kind = layer.getData('kind') as PieceKind;
    painters[kind]!(layer.getByName<Graphics>('fx').clear(), time, reduced);
    layer.getByName<Graphics>('sprout')?.setRotation(sproutAngle(time, reduced));
    shown.push(kind);
  });
  return shown.join(' ');
}
/** A drawn book in the reader's hand after touching the bookcase; it never stays. */
export function showBook(scene: Phaser.Scene, hand: Point) {
  const book = scene.add.graphics().setDepth(1080).setPosition(hand.x, hand.y);
  book.fillStyle(hex('cobalt')).fillRoundedRect(-11, -14, 22, 16, 3).fillStyle(0xfffdf7).fillRect(-8, -12, 7, 12).fillRect(1, -12, 7, 12);
  const reduced = reducedMotion(), clock = { t: 0 }, dataset = scene.game.canvas.dataset;
  const place = () => { const f = bookFrame(clock.t, reduced); book.setAlpha(f.alpha).setY(hand.y + f.lift); };
  place(); dataset.book = 'hand';
  scene.tweens.add({ targets: clock, t: bookDuration, duration: bookDuration, onUpdate: place, onComplete: () => { book.destroy(); dataset.book = ''; } });
}
/** The piece blinks three times so the child finds it (one short fade with reduced motion). */
export function blinkPiece(scene: Phaser.Scene, target: Container) {
  scene.tweens.killTweensOf(target); target.setAlpha(1);
  scene.tweens.add({ targets: target, alpha: .35, duration: reducedMotion() ? reducedFadeMs : 160, yoyo: true, repeat: reducedMotion() ? 0 : 2, onComplete: () => target.setAlpha(1) });
}
