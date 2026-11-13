import type Phaser from 'phaser';
import type { ActorId, World } from '../domain/types';
import type { DrawingId } from '../domain/progress';

/** The lesson (W3L-26): the board draws itself in 20 s while the pupils raise their hands in turns. Never saved. */
export const lessonMs = 20_000;
/** How much of the drawing is on the board: all of it at once with reduced motion. */
export function lessonProgress(start: number, now: number, reduced: boolean): number {
  return reduced ? 1 : Math.min(1, Math.max(0, (now - start) / lessonMs));
}
/** Whether pupil `index` has a hand up: they take turns every 1.2 s (with reduced motion every hand stays up, still). */
export function handUp(index: number, elapsed: number, reduced: boolean): boolean {
  return reduced || (Math.floor(elapsed / 1200) + index) % 2 === 0;
}
/** Where the drawing sits on the board (piece units): centred on the green, 240 × 160. */
const spot = { x: 200, y: 110, width: 240, height: 160 };
type Current = { piece: number; theme: DrawingId; pupils: ActorId[]; start: number; done: boolean };
export function lessonArt(scene: Phaser.Scene) {
  let current: Current | null = null, image: Phaser.GameObjects.Image | null = null, chalk: Phaser.GameObjects.Rectangle | null = null;
  const mark = (value: string) => { if (navigator.webdriver) scene.game.canvas.dataset.lesson = value; };
  return {
    /** Called when the drawing is finished: the pupils cheer. */
    finished: (() => {}) as (pupils: ActorId[]) => void,
    active: () => !!current && !current.done,
    start(piece: number, theme: DrawingId, pupils: ActorId[], now: number) { current = { piece, theme, pupils, start: now, done: false }; mark(`${theme}:drawing`); },
    /** After every repaint: the drawing goes back on its board; away from that board the lesson is over. */
    paint(state: World, pieces: Map<number, Phaser.GameObjects.Container>) {
      image = chalk = null;
      const board = current && state.layout.pieces.some(p => p.id === current!.piece && p.room === state.room && p.kind === 'board') ? pieces.get(current!.piece) : undefined;
      if (!current || !board || !scene.textures.exists(`drawing-${current.theme}`)) { if (!board) { current = null; mark(''); } return; }
      image = scene.add.image(spot.x - spot.width / 2, spot.y, `drawing-${current.theme}`).setOrigin(0, .5).setDisplaySize(spot.width, spot.height);
      chalk = scene.add.rectangle(0, 0, 14, 5, 0xfffdf7).setStrokeStyle(1.5, 0x786c62).setRotation(-.6).setVisible(!current.done);
      board.add([image, chalk]);
    },
    frame(now: number, figures: Phaser.GameObjects.Container[], reduced: boolean) {
      if (!current || !image || current.done) return;
      const progress = lessonProgress(current.start, now, reduced), width = image.frame.width;
      image.setCrop(0, 0, width * progress, image.frame.height);
      chalk?.setPosition(spot.x - spot.width / 2 + spot.width * progress, spot.y + Math.sin(now / 90) * spot.height * .3);
      const hands = figures.filter(f => current!.pupils.includes(f.name as ActorId));
      hands.forEach((f, n) => f.setData('arms', handUp(n, now - current!.start, reduced) ? 1 : 0));
      if (progress < 1) return;
      current.done = true; chalk?.setVisible(false); mark(`${current.theme}:done`);
      hands.forEach(f => f.setData('arms', 0)); this.finished(current.pupils);
    },
  };
}
