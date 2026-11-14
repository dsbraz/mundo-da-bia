import type Phaser from 'phaser';

/** Where a seated pupil's notebook lies (scene units from her seat point): on her lap, in front of her. */
const lap = { x: 0, y: -44, width: 30, height: 19 };
/** The pencil's tip `elapsed` ms into the copying: small scribbles left to right along the notebook's lines (still with reduced motion). */
export function pencilTip(elapsed: number, reduced: boolean, seed: number): { x: number; y: number } {
  if (reduced) return { x: 4, y: 0 };
  const t = elapsed / 1000 + seed * .37, line = Math.floor(t / 1.6) % 2;
  return { x: -10 + ((t % 1.6) / 1.6) * 20, y: -3 + line * 6 + Math.sin(t * 22) * 1.5 };
}
/** Whether pupil `index` has a hand up: one at a time, now and then, between stretches of copying (still with reduced motion). */
export function handUp(index: number, elapsed: number, reduced: boolean): boolean {
  return !reduced && Math.floor(elapsed / 1200) % 5 === index % 5 && Math.floor(elapsed / 6000) % 2 === 1;
}
/** The pupils during the lesson: their name and star (drawn above the head, over the board) hidden, only the halo stays; while the
 *  teacher writes they copy it and take turns raising a hand. */
export function drawClass(g: Phaser.GameObjects.Graphics | null, pupils: readonly Phaser.GameObjects.Container[], elapsed: number, copying: boolean, reduced: boolean) {
  pupils.forEach(f => ['selection-label', 'selection-star'].forEach(name => f.getByName<Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject>(name)?.setVisible(false)));
  pupils.forEach((f, n) => f.setData('arms', copying && handUp(n, elapsed, reduced) ? 1 : 0));
  if (g?.scene) drawNotebooks(g, pupils, elapsed, copying, reduced);
}
/** The class copying the board (lot 8D): a small open notebook on each pupil's lap, and her pencil writing in it. Pupils with a hand
 *  up (`arms` set) are not writing. */
function drawNotebooks(g: Phaser.GameObjects.Graphics, pupils: readonly Phaser.GameObjects.Container[], elapsed: number, copying: boolean, reduced: boolean) {
  g.clear().setDepth(Math.max(0, ...pupils.map(f => f.depth)) + 1);
  if (!copying) return;
  pupils.forEach((figure, n) => {
    if (Number(figure.getData('arms') ?? 0) > .5) return;
    const x = figure.x + lap.x, y = figure.y + lap.y, w = lap.width, h = lap.height;
    g.fillStyle(0xfffdf7, 1).lineStyle(1.6, 0x786c62, 1).fillRect(x - w / 2, y - h / 2, w, h).strokeRect(x - w / 2, y - h / 2, w, h);
    g.lineStyle(1.2, 0x8db7d1, 1).lineBetween(x, y - h / 2, x, y + h / 2);
    [-3, 3].forEach(dy => g.lineBetween(x - w / 2 + 3, y + dy, x - 2, y + dy).lineBetween(x + 2, y + dy, x + w / 2 - 3, y + dy));
    const tip = pencilTip(elapsed, reduced, n), px = x + tip.x, py = y + tip.y;
    g.lineStyle(4, 0x786c62, 1).lineBetween(px, py, px + 10, py - 13);
    g.lineStyle(2.6, 0xf2b630, 1).lineBetween(px + 1, py - 1.5, px + 10, py - 13);
    g.fillStyle(0xdf7987, 1).fillCircle(px + 10.5, py - 13.5, 2);
  });
}
