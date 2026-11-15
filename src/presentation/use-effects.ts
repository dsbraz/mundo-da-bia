import type Phaser from 'phaser';
import { pieceBounds } from '../domain/layout';
import type { Piece, PieceKind } from '../domain/types';
import { reducedFadeMs, reducedMotion } from './motion';
import { hex } from './palette';
import { playPainters } from './play-effects';

type Container = Phaser.GameObjects.Container;
type Graphics = Phaser.GameObjects.Graphics;
const drawn: readonly PieceKind[] = ['sink', 'washer', 'planter', 'picnic-table'];
const paint = (kind: PieceKind) => painters[kind] ?? playPainters[kind];
/** Every piece that is on answers with a drawn, moving effect (W3L-09: the playroom and workshop ones too, no text sign left). */
export const drawnUse = (kind: PieceKind) => drawn.includes(kind) || !!playPainters[kind];

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
  'picnic-table'(g, time, reduced) { g.fillStyle(hex('coral')).fillCircle(60, 30, 7).fillStyle(hex('leaf')).fillCircle(72, 31, 6); steam(g, 92, 20, time, reduced); },
};
/** Three white wisps over `x`, `y` (also the bench's cooking steam). */
export function steam(g: Graphics, x: number, y: number, time: number, reduced: boolean) {
  for (const w of steamFrame(time, reduced)) {
    g.lineStyle(2.5, 0xffffff, w.alpha).beginPath();
    for (let s = 0; s <= 6; s++) { const py = y - w.rise - s * 3, px = x + w.dx + Math.sin(s + (reduced ? 0 : time / 200)) * 2; if (s) g.lineTo(px, py); else g.moveTo(px, py); }
    g.strokePath();
  }
}
/** Every frame the effects of the pieces that are on move. Returns the kinds showing an effect. */
export function animatePieces(pieces: Map<number, Container>, time: number, reduced: boolean): string {
  const shown: string[] = [];
  pieces.forEach(piece => {
    const layer = piece.getByName<Container>('use-effect'); if (!layer) return;
    const kind = layer.getData('kind') as PieceKind;
    paint(kind)!(layer.getByName<Graphics>('fx').clear(), time, reduced);
    layer.getByName<Graphics>('sprout')?.setRotation(sproutAngle(time, reduced));
    shown.push(kind);
  });
  return shown.join(' ');
}
/** The piece blinks three times so the child finds it (one short fade with reduced motion). */
export function blinkPiece(scene: Phaser.Scene, target: Container) {
  scene.tweens.killTweensOf(target); target.setAlpha(1);
  scene.tweens.add({ targets: target, alpha: .35, duration: reducedMotion() ? reducedFadeMs : 160, yoyo: true, repeat: reducedMotion() ? 0 : 2, onComplete: () => target.setAlpha(1) });
}
