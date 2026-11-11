import type Phaser from 'phaser';
import { pieceBounds } from '../domain/layout';
import type { Piece } from '../domain/types';
import { reducedFadeMs, reducedMotion } from './motion';
import { steam } from './use-effects';
import { cookMs } from './kitchen-bench';

type Image = Phaser.GameObjects.Image;
/** A dish was cooked: it pops in (Back.Out, 240 ms) and steam rises over the bench piece for 1.2 s. With reduced motion the dish
 *  only fades in (120 ms) and there is no steam. Nothing here holds the input. */
export function cookedEffect(scene: Phaser.Scene, piece: Piece, dish: Image | undefined) {
  const reduced = reducedMotion(), data = scene.game.canvas.dataset;
  if (dish) {
    data.dishPop = dish.name;
    if (reduced) scene.tweens.add({ targets: dish.setAlpha(0), alpha: 1, duration: reducedFadeMs });
    else { const size = dish.scaleX; scene.tweens.add({ targets: dish.setScale(size * .4), scaleX: size, scaleY: size, duration: 240, ease: 'Back.Out' }); }
  }
  if (reduced) return;
  const box = pieceBounds[piece.kind], wisps = scene.add.graphics().setDepth(1050), clock = { t: 0 };
  data.cooking = 'steam';
  scene.tweens.add({ targets: clock, t: cookMs, duration: cookMs,
    onUpdate: () => { if (wisps.active) steam(wisps.clear(), piece.x + box.width / 2, piece.y + 6, clock.t, false); },
    onComplete: () => { wisps.destroy(); data.cooking = ''; } });
}
/** The table is full: the room's dishes hop once (they stay still with reduced motion). */
export function hopDishes(scene: Phaser.Scene, dishes: Image[]) {
  scene.game.canvas.dataset.dishHop = String(Date.now());
  if (reducedMotion()) return;
  dishes.forEach((dish, i) => scene.tweens.add({ targets: dish, y: dish.y - 14, duration: 160, yoyo: true, ease: 'Sine.Out', delay: i * 40 }));
}
