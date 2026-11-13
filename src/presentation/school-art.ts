import type Phaser from 'phaser';
import type { Palette, PieceKind, World } from '../domain/types';
import { pieceBounds } from '../domain/layout';
import { drawingIds, type DrawingId } from '../domain/progress';
import { isMarket } from '../domain/market';
import { recolor } from './svg-source';
import { sheet, sheetPart } from './art-sheet';
import { loadSvg } from './rendering';

let source: string | null = null;
/** Keeps the school sheet (`public/art/school.svg`, read in the scene's preload or fetched by the DOM). */
export function keepSchool(text: string) { source = text; }
export const drawingBox = { width: 120, height: 80 };
/** The school's own pieces (W3L-26): the board and the kid-sized school desk. */
export const schoolKinds: readonly PieceKind[] = ['board', 'school-desk'];
/** A school piece in `color` (its wood takes the palette), cut from the sheet once read; the sheet's backpack stands in until then. */
export function schoolPieceImage(kind: PieceKind, color: Palette): string {
  if (!source) { void sheet('school').then(keepSchool); return '/art/school.svg#mochila'; }
  return sheetPart(recolor(source, color), [kind], pieceBounds[kind]);
}
/** In the scene: whether the school sheet is read (the board's texture waits for it). */
export function schoolReady(scene: Phaser.Scene): boolean {
  const text = scene.cache.text.get('art-school') as string | undefined;
  if (text) keepSchool(text);
  return !!text;
}
/** A drawing of the day in chalk (on the board) or in crayon on a sheet of paper (on the fridge door): the chalk lines turn brown. */
export function drawingImage(id: DrawingId, paper: boolean): string {
  return paper ? sheetPart(source!.replace(/stroke="#fffdf7"/g, 'stroke="#786c62"'), ['paper', `drawing-${id}`], drawingBox)
    : sheetPart(source!, [`drawing-${id}`], drawingBox);
}
/** The drawings on the door of a fridge at home: the newest 4 (a market's fridge has none). */
export function fridgeDrawings(state: World, drawings: readonly DrawingId[]): DrawingId[] {
  const fridge = state.layout.pieces.some(p => p.room === state.room && p.kind === 'fridge');
  return fridge && !isMarket(state.layout, state.room) ? drawings.slice(-4) : [];
}
/** The chalk drawings for a room with a board, and the paper ones its fridge door shows. */
export function loadSchoolArt(scene: Phaser.Scene, state: World, drawings: readonly DrawingId[]) {
  if (!schoolReady(scene)) return;
  const board = state.layout.pieces.some(p => p.room === state.room && p.kind === 'board');
  if (board) drawingIds.forEach(id => { if (!scene.textures.exists(`drawing-${id}`)) loadSvg(scene, `drawing-${id}`, drawingImage(id, false)); });
  fridgeDrawings(state, drawings).forEach(id => { if (!scene.textures.exists(`paper-${id}`)) loadSvg(scene, `paper-${id}`, drawingImage(id, true)); });
}
/** Where the 4 papers hang on the fridge door (fridge piece units): two by two, each held by a magnet, big enough to tell apart. */
const papers = [{ x: 42, y: 42, angle: -.07 }, { x: 103, y: 40, angle: .06 }, { x: 44, y: 86, angle: .05 }, { x: 101, y: 88, angle: -.06 }];
const magnets = [0xe8735a, 0x2ba8a0, 0xf2b630, 0x9b7bd0];
/** The drawings of the day on the room's fridge doors (W3L-26), up to 4: always in view, open or closed. */
export function drawFridgeDrawings(scene: Phaser.Scene, state: World, pieces: Map<number, Phaser.GameObjects.Container>, drawings: readonly DrawingId[]) {
  const shown = fridgeDrawings(state, drawings).filter(id => scene.textures.exists(`paper-${id}`));
  if (navigator.webdriver) scene.game.canvas.dataset.fridgeDrawings = shown.join(' ');
  state.layout.pieces.filter(p => p.room === state.room && p.kind === 'fridge').forEach(piece => shown.forEach((id, n) => {
    const at = papers[n]!, x = piece.flipped ? 145 - at.x : at.x;
    pieces.get(piece.id)?.add([scene.add.image(x, at.y, `paper-${id}`).setDisplaySize(57, 38).setRotation(at.angle),
      scene.add.circle(x, at.y - 17, 6, magnets[n]).setStrokeStyle(2, 0x786c62), scene.add.circle(x - 2, at.y - 19, 1.8, 0xfffdf7)]);
  }));
}
