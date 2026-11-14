import type Phaser from 'phaser';
import type { Palette, PieceKind, World } from '../domain/types';
import { pieceBounds } from '../domain/layout';
import { drawingIds, type DrawingId, type Keepsake } from '../domain/progress';
import { isMarket } from '../domain/market';
import { recolor } from './svg-source';
import { sheet, sheetPart } from './art-sheet';
import { loadSvg } from './rendering';
import { boardContent } from './board-content';
import { loadStaffArt } from './staff-art';
import { svgUrl } from './architecture-art';

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
const crayons = ['#e8735a', '#2ba8a0', '#9b7bd0', '#3f8fb8'];
/** A written page or a math sheet (lot 8D) in crayon on paper: the board's chalk strokes fitted to the sheet, the word's letters in
 *  colours, the sum in blue with its result in red. */
export function writtenPaper(id: Keepsake): string {
  const content = boardContent(id);
  if (content.kind !== 'writing') throw new Error(`Folha sem escrita: ${id}`);
  const points = content.marks.flatMap(m => m.strokes.flat()), xs = points.map(p => p.x), ys = points.map(p => p.y);
  const left = Math.min(...xs), top = Math.min(...ys), k = Math.min(96 / (Math.max(...xs) - left), 52 / (Math.max(...ys) - top));
  const ox = (120 - (Math.max(...xs) - left) * k) / 2, oy = 6 + (68 - (Math.max(...ys) - top) * k) / 2;
  const sum = id.startsWith('conta-');
  const paths = content.marks.map((m, n) => {
    const d = m.strokes.map(s => s.map((p, i) => `${i ? 'L' : 'M'}${(ox + (p.x - left) * k).toFixed(1)} ${(oy + (p.y - top) * k).toFixed(1)}`).join('')).join('');
    const color = sum ? (m.answer ? crayons[0] : '#3f5f8f') : crayons[n % crayons.length];
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${m.char === '•' ? 2.4 : 4}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
  const lines = sum ? '<path d="M10 24h100M10 42h100M10 60h100" stroke="#cfe0f2" stroke-width="1.5"/>' : '';
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><path d="M3 3h114v68l-8 8H3Z" fill="#fffdf7" stroke="#c9b79c" stroke-width="2" stroke-linejoin="round"/><path d="M117 71h-8v8" fill="#eadfca" stroke="#c9b79c" stroke-width="2" stroke-linejoin="round"/>${lines}${paths}</svg>`);
}
/** A paper of the fridge door: a drawing in crayon, or a written page or math sheet. */
const paperImage = (id: Keepsake) => (drawingIds as readonly string[]).includes(id) ? drawingImage(id as DrawingId, true) : writtenPaper(id);
/** The papers on the door of a fridge at home: the newest 4 (a market's fridge has none). */
export function fridgeDrawings(state: World, drawings: readonly Keepsake[]): Keepsake[] {
  const fridge = state.layout.pieces.some(p => p.room === state.room && p.kind === 'fridge');
  return fridge && !isMarket(state.layout, state.room) ? drawings.slice(-4) : [];
}
/** The chalk drawings and the teacher who writes them (lot 8D: she comes to any board) for a room with a board, and the papers its
 *  fridge door shows. */
export function loadSchoolArt(scene: Phaser.Scene, state: World, drawings: readonly Keepsake[]) {
  if (!schoolReady(scene)) return;
  const board = state.layout.pieces.some(p => p.room === state.room && p.kind === 'board');
  if (board) drawingIds.forEach(id => { if (!scene.textures.exists(`drawing-${id}`)) loadSvg(scene, `drawing-${id}`, drawingImage(id, false)); });
  if (board) loadStaffArt(scene, 'teacher');
  fridgeDrawings(state, drawings).forEach(id => { if (!scene.textures.exists(`paper-${id}`)) loadSvg(scene, `paper-${id}`, paperImage(id)); });
}
/** Where the 4 papers hang on the fridge door (fridge piece units): two by two, each held by a magnet, big enough to tell apart. */
const papers = [{ x: 42, y: 42, angle: -.07 }, { x: 103, y: 40, angle: .06 }, { x: 44, y: 86, angle: .05 }, { x: 101, y: 88, angle: -.06 }];
const magnets = [0xe8735a, 0x2ba8a0, 0xf2b630, 0x9b7bd0];
/** The lessons' papers on the room's fridge doors (W3L-26), up to 4: always in view, open or closed. */
export function drawFridgeDrawings(scene: Phaser.Scene, state: World, pieces: Map<number, Phaser.GameObjects.Container>, drawings: readonly Keepsake[]) {
  const shown = fridgeDrawings(state, drawings).filter(id => scene.textures.exists(`paper-${id}`));
  if (navigator.webdriver) scene.game.canvas.dataset.fridgeDrawings = shown.join(' ');
  state.layout.pieces.filter(p => p.room === state.room && p.kind === 'fridge').forEach(piece => shown.forEach((id, n) => {
    const at = papers[n]!, x = piece.flipped ? 145 - at.x : at.x;
    pieces.get(piece.id)?.add([scene.add.image(x, at.y, `paper-${id}`).setDisplaySize(57, 38).setRotation(at.angle),
      scene.add.circle(x, at.y - 17, 6, magnets[n]).setStrokeStyle(2, 0x786c62), scene.add.circle(x - 2, at.y - 19, 1.8, 0xfffdf7)]);
  }));
}
