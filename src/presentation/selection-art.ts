import { lying } from './posture';
import type Phaser from 'phaser';
import type { VisualContext } from './pose';
import { actorScale, contextScale, figureHeight, seatDrop } from './pose';
import { textStyle } from './text-style';
import { hex } from './palette';
import type { Actor } from '../domain/types';

/** Vertical anchors (relative to the feet) for the selected label and star. */
export function selectionLayout(actor: Actor, context?: VisualContext) {
  if (lying(actor)) return { x: -80, labelBottom: -70, star: -110 };
  const head = -figureHeight(actor) * actorScale(actor, context);
  const seated = actor.seat ? seatDrop(actor) * actorScale(actor, context) : 0;
  return { x: 0, labelBottom: head + seated - 6, star: head + seated - 44 * contextScale(context) };
}
export function drawSelection(scene: Phaser.Scene, container: Phaser.GameObjects.Container, actor: Actor, name: string, context?: VisualContext) {
  const layout = selectionLayout(actor, context), scale = contextScale(context);
  const halo = scene.add.graphics().setName('selection-halo');
  halo.fillStyle(hex('turquoise'), .3).fillEllipse(layout.x, 2, (lying(actor) ? 150 : 84) * scale, 24 * scale);
  halo.lineStyle(3, hex('turquoise')).strokeEllipse(layout.x, 2, (lying(actor) ? 150 : 84) * scale, 24 * scale);
  container.addAt(halo, 0);
  container.add(scene.add.text(layout.x, layout.labelBottom, name, textStyle('label')).setOrigin(.5, 1).setScale(Math.max(.75, scale)).setName('selection-label'));
  const star = scene.add.graphics({ x: layout.x, y: layout.star }).setName('selection-star');
  const points = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 6 : 14, a = -Math.PI / 2 + i * Math.PI / 5; return { x: Math.cos(a) * r, y: Math.sin(a) * r }; });
  star.fillStyle(hex('sun')).fillPoints(points, true).lineStyle(1.5, hex('outline')).strokePoints(points, true);
  container.add(star.setScale(scale).setData('base', scale));
}
