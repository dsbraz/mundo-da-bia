import type Phaser from 'phaser';
import type { ActorId, Point, World } from '../domain/types';
import type { Keepsake } from '../domain/progress';
import { floorTop } from '../domain/geometry';
import { boardContent, contentBox, lessonFrame, lessonMs, pictureBox, writeWindow, type BoardContent, type BoardFrame } from './board-content';
import { lessonWriter, standFor, writerAt, type WriterPose } from './lesson-writer';
import { staffScale } from './staff-figure';
import { drawClass } from './lesson-class';

export { handUp } from './lesson-class';

export { lessonMs };
/** How long the teacher takes to walk back to her place (or fade away) after the lesson. */
const leaveMs = 800;
type Current = { piece: number; theme: Keepsake; content: BoardContent; pupils: ActorId[]; start: number; done: boolean; from: Point | null | undefined; x: number | null };
/** The lesson (W3L-26, lot 8D): the teacher walks to the board and writes the chosen subject with her chalk, stroke by stroke, while
 *  the pupils copy it in their notebooks and raise their hands now and then. Never saved. */
export function lessonArt(scene: Phaser.Scene) {
  let current: Current | null = null, chalk: Phaser.GameObjects.Graphics | null = null, image: Phaser.GameObjects.Image | null = null;
  /** She writes from the back of the floor, just in front of the baseboard, so her hand reaches the board. */
  let board: Phaser.GameObjects.Container | null = null, notes: Phaser.GameObjects.Graphics | null = null, floor = 396;
  const writer = lessonWriter(scene);
  const mark = (key: string, value: string) => { if (navigator.webdriver && scene.game.canvas.dataset[key] !== value) scene.game.canvas.dataset[key] = value; };
  /** A lesson left unfinished clears its mark; a finished one keeps `<theme>:done` (it is over, whatever the teacher's walk back takes). */
  const end = (finished = false) => { current = null; if (!finished) mark('lesson', ''); mark('lessonWriter', ''); };
  return {
    /** Called when the lesson is over: the pupils cheer. */
    finished: (() => {}) as (pupils: ActorId[]) => void,
    active: () => !!current && !current.done,
    /** Whether the teacher is at the board (from her first step there until she is back): the school's teacher is not drawn twice. */
    away: () => !!current,
    start(piece: number, theme: Keepsake, pupils: ActorId[], now: number) {
      current = { piece, theme, content: boardContent(theme), pupils, start: now, done: false, from: undefined, x: null }; mark('lesson', `${theme}:drawing`);
    },
    /** After every repaint: the board's chalk, the teacher and the notebooks again; away from that board the lesson is over. */
    paint(state: World, pieces: Map<number, Phaser.GameObjects.Container>) {
      chalk = image = board = notes = null;
      const found = current && state.layout.pieces.some(p => p.id === current!.piece && p.room === state.room && p.kind === 'board') ? pieces.get(current.piece) : undefined;
      if (!current || !found) { if (current) end(); writer.paint(false); return; }
      board = found; floor = floorTop(state) - 14;
      const content = current.content;
      if (content.kind === 'picture' && scene.textures.exists(`drawing-${content.id}`)) {
        image = scene.add.image(pictureBox.left, pictureBox.top, `drawing-${content.id}`).setOrigin(0, 0).setDisplaySize(pictureBox.width, pictureBox.height);
        board.add(image);
      }
      chalk = scene.add.graphics(); board.add(chalk);
      notes = scene.add.graphics();
      writer.paint(true);
    },
    frame(now: number, figures: Phaser.GameObjects.Container[], reduced: boolean, staff: Point | null) {
      if (!current || !board?.scene || !chalk?.scene) return;
      const cur = current, elapsed = now - cur.start;
      if (cur.from === undefined) cur.from = staff && { x: staff.x, y: staff.y };
      const frame = lessonFrame(cur.content, Math.min(elapsed, writeWindow.end), reduced), shown = board;
      drawBoard(chalk, image, frame);
      const pose = writerPose(cur, (p: Point) => shown.getWorldTransformMatrix().transformPoint(p.x, p.y) as Point, floor, elapsed, frame, reduced);
      writer.frame(pose); mark('lessonWriter', `teacher:${pose.chalk ? 'writing' : 'standing'}`);
      drawClass(notes, figures.filter(f => cur.pupils.includes(f.name as ActorId)), elapsed, !cur.done && elapsed > writeWindow.start, reduced);
      this.close(cur, elapsed, reduced);
    },
    /** At 20 s the lesson is over (the pupils cheer); she walks back to her place, then the lesson is gone. */
    close(cur: Current, elapsed: number, reduced: boolean) {
      if (!cur.done && elapsed >= lessonMs) { cur.done = true; mark('lesson', `${cur.theme}:done`); this.finished(cur.pupils); }
      if (cur.done && elapsed >= lessonMs + (reduced ? 0 : leaveMs)) { end(true); writer.frame(null); notes?.clear(); }
    },
  };
}
/** Where her chalk is (board units): at the end of the band, still, with reduced motion; before she writes, where she will begin;
 *  once it is all written, a step past the end, so the class sees the whole board. */
function chalkPoint(cur: Current, frame: BoardFrame, reduced: boolean): Point {
  if (reduced || frame.done) return { x: contentBox.right + (reduced ? 0 : 40), y: (contentBox.top + contentBox.bottom) / 2 };
  return frame.tip ?? lessonFrame(cur.content, writeWindow.start + 1, false).tip!;
}
/** Where the teacher is and what her arm does: walking to the board, writing at the chalk (with reduced motion still, at the end of
 *  the band), resting at the end, walking back. `toScene`: from the board's units to the scene's. */
function writerPose(cur: Current, toScene: (p: Point) => Point, floor: number, elapsed: number, frame: BoardFrame, reduced: boolean): WriterPose {
  const chalk = toScene(chalkPoint(cur, frame, reduced)), target = standFor(chalk, floor, staffScale());
  cur.x = follow(cur.x, target.x, reduced);
  const stand = { x: cur.x, y: floor }, leaving = elapsed - lessonMs;
  const at = writerAt(cur.from ?? null, stand, leaving > 0 ? writeWindow.start * (1 - leaving / leaveMs) : elapsed, reduced);
  const writing = !frame.done && elapsed >= writeWindow.start && frame.tip !== null;
  const walking = elapsed < writeWindow.start || leaving > 0 || Math.abs(target.x - cur.x) > 6;
  return { ...at, chalk: writing ? chalk : null, bob: step(walking && !reduced, elapsed) };
}
/** She follows the chalk along the board, a few steps behind (at once with reduced motion). */
const follow = (x: number | null, target: number, reduced: boolean) => x === null || reduced ? target : x + (target - x) * .12;
/** Her steps' bounce while she walks. */
const step = (walking: boolean, elapsed: number) => walking ? Math.abs(Math.sin(elapsed / 110)) * 3 : 0;
/** The chalk on the board: the marks so far (each segment with round ends), or the drawing revealed up to the chalk. */
function drawBoard(g: Phaser.GameObjects.Graphics, image: Phaser.GameObjects.Image | null, frame: BoardFrame) {
  g.clear();
  if (image) image.setCrop(0, 0, image.frame.width * frame.reveal, image.frame.height);
  for (const mark of frame.marks) {
    const width = mark.char === '•' ? 4 : 6.5;
    g.lineStyle(width, mark.color, .96).fillStyle(mark.color, .96);
    for (const stroke of mark.strokes) stroke.forEach((p, i) => { if (i) g.lineBetween(stroke[i - 1]!.x, stroke[i - 1]!.y, p.x, p.y); g.fillCircle(p.x, p.y, width / 2); });
  }
}
