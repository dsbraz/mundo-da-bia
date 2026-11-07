import type Phaser from 'phaser';
import { pieceBounds } from '../domain/layout';
import type { Piece, World } from '../domain/types';
import { slotsFor } from './targets';

export function orderedPieces(state: World) {
  return state.layout.pieces.filter(p => p.room === state.room).sort((a, b) => layer(a) - layer(b));
}
function layer(piece: Piece) {
  if (piece.kind === 'rug') return -2;
  if (['picture', 'neon'].includes(piece.kind)) return -1;
  return piece.y + pieceBounds[piece.kind].height;
}
export function drawPieces(scene: Phaser.Scene, state: World, wardrobe: boolean, selected: number | null) {
  orderedPieces(state).forEach(piece => {
    drawPiece(scene, piece, state, wardrobe);
    if (selected === piece.id) {
      const box = pieceBounds[piece.kind];
      scene.add.rectangle(piece.x + box.width / 2, piece.y + box.height / 2, box.width + 6, box.height + 6)
        .setStrokeStyle(3, 0x6663ad).setFillStyle(0xffffff, 0.06).setDepth(800);
    }
  });
  if (wardrobe) slotsFor(state).forEach(slot => scene.add.image(slot.x, slot.y, `look-${slot.id}`).setDisplaySize(42, 44));
}
export function drawPiece(scene: Phaser.Scene, piece: Piece, state: World, wardrobe: boolean) {
  const parts = [piece.kind as string];
  if (piece.kind === 'wardrobe') parts.push(wardrobe ? 'wardrobe-open' : 'wardrobe-closed', state.home.drawer ? 'drawer-open' : 'drawer-closed');
  if (piece.kind === 'fridge') parts.push(state.home.fridge ? 'fridge-open' : 'fridge-closed');
  if (piece.kind === 'lamp') parts.push(state.home.lamp ? 'lamp-on' : 'lamp-off');
  const box = pieceBounds[piece.kind];
  parts.forEach(part => scene.add.image(piece.x + box.width / 2, piece.y + box.height / 2, `piece-${part}-${piece.color}`).setFlipX(piece.flipped));
}

export function pickPiece(scene: Phaser.Scene, state: World, point: { x: number; y: number }): Piece | undefined {
  return orderedPieces(state).reverse().find(piece => {
    const box = pieceBounds[piece.kind];
    const dx = Math.floor(point.x - piece.x); const dy = Math.floor(point.y - piece.y);
    if (dx < 0 || dy < 0 || dx >= box.width || dy >= box.height) return false;
    const x = piece.flipped ? box.width - 1 - dx : dx;
    const keys = [`piece-${piece.kind}-${piece.color}`];
    if (piece.kind === 'lamp') keys.push(`piece-lamp-on-${piece.color}`);
    return keys.some(key => (scene.textures.getPixelAlpha(x, dy, key) ?? 0) > 16);
  });
}
