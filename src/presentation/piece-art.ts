import { rasterScale } from './rendering';
import type Phaser from 'phaser';
import { fixture, pieceBounds } from '../domain/layout';
import type { Actor, Piece, World } from '../domain/types';
import { slotsFor } from './targets';
export function orderedPieces(state: World) {
  return state.layout.pieces.filter(p => p.room === state.room).sort((a, b) => pieceDepth(a) - pieceDepth(b));
}
export function pieceDepth(piece: Piece) {
  if (piece.kind === 'rug') return 1;
  if (['picture', 'neon'].includes(piece.kind)) return 2;
  return Math.min(520, piece.y + pieceBounds[piece.kind].height - 35);
}
export function drawPieces(scene: Phaser.Scene, state: World, wardrobe: boolean, selected: number | null) {
  const pieces = new Map<number, Phaser.GameObjects.Container>();
  orderedPieces(state).forEach(piece => {
    const container = drawPiece(scene, piece, state, wardrobe); pieces.set(piece.id, container);
    if (selected === piece.id) {
      const box = pieceBounds[piece.kind];
      container.add(scene.add.rectangle(box.width / 2, box.height / 2, box.width + 6, box.height + 6)
        .setStrokeStyle(2, 0x477e86).setFillStyle(0xffffff, 0.06));
    }
  });
  if (wardrobe) slotsFor(state).forEach(slot => scene.add.image(slot.x, slot.y, `look-${slot.id}`).setDisplaySize(42, 44).setDepth(pieceDepth(fixture(state, 'wardrobe')!) + 2));
  return pieces;
}
export function drawPiece(scene: Phaser.Scene, piece: Piece, state: World, wardrobe: boolean) {
  const container = scene.add.container(piece.x, piece.y).setDepth(pieceDepth(piece));
  const parts = partsFor(piece, state, wardrobe);
  const box = pieceBounds[piece.kind];
  parts.forEach(part => container.add(scene.add.image(box.width / 2, box.height / 2, `piece-${part}-${piece.color}`).setFlipX(piece.flipped).setDisplaySize(box.width, box.height)));
  if (piece.active) container.add(scene.add.text(box.width / 2, 6, effect(piece), { resolution: 2, fontSize: '24px', color: '#3f8799' }).setOrigin(.5).setName('effect'));
  return container;
}
function partsFor(piece: Piece, state: World, wardrobe: boolean): string[] {
  const parts = [piece.kind as string];
  if (piece.kind === 'wardrobe') parts.push(wardrobe ? 'wardrobe-open' : 'wardrobe-closed', state.home.drawer ? 'drawer-open' : 'drawer-closed');
  if (piece.kind === 'fridge') parts.push(state.home.fridge ? 'fridge-open' : 'fridge-closed');
  if (piece.kind === 'lamp') parts.push(state.home.lamp ? 'lamp-on' : 'lamp-off');
  if (piece.active && ['piano', 'tv', 'aquarium', 'reading-lamp'].includes(piece.kind)) parts.push(`${piece.kind}-on`);
  return parts;
}
function effect(piece: Piece): string {
  if (['speaker', 'piano'].includes(piece.kind)) return '♫ ♪';
  if (piece.kind === 'stove') return '♨';
  if (piece.kind === 'aquarium') return '◦ ○';
  if (piece.kind === 'bath') return '◦ ○ ◦';
  return '✦';
}
export function pickPiece(scene: Phaser.Scene, state: World, point: { x: number; y: number }): Piece | undefined {
  return orderedPieces(state).reverse().find(piece => {
    const box = pieceBounds[piece.kind];
    const dx = Math.floor(point.x - piece.x); const dy = Math.floor(point.y - piece.y);
    if (dx < 0 || dy < 0 || dx >= box.width || dy >= box.height) return false;
    const x = piece.flipped ? box.width - 1 - dx : dx;
    const keys = [`piece-${piece.kind}-${piece.color}`];
    if (piece.kind === 'lamp') keys.push(`piece-lamp-on-${piece.color}`);
    return keys.some(key => (scene.textures.getPixelAlpha(x * rasterScale, dy * rasterScale, key) ?? 0) > 16);
  });
}

export function actorDepth(state: World, actor: Actor) {
  return actor.seat === 'bed' ? pieceDepth(fixture(state, 'bed')!) + 1 : actor.y;
}
