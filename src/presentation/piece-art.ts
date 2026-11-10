import { contactShadow } from './contact-shadow';
import { seatKind } from '../domain/furniture';
import { textStyle } from './text-style';
import { rasterScale } from './rendering';
import type Phaser from 'phaser';
import { fixture, pieceBounds } from '../domain/layout';
import type { Actor, Piece, World } from '../domain/types';
import { slotsFor } from './targets';
import { floorTop } from './floor-band';
import { drawnUse, drawUse } from './use-effects';
export function orderedPieces(state: World) {
  return state.layout.pieces.filter(p => p.room === state.room).sort((a, b) => pieceDepth(a) - pieceDepth(b));
}
export function pieceDepth(piece: Piece) {
  if (piece.kind === 'rug') return 1;
  if (['picture', 'neon'].includes(piece.kind)) return 2;
  return piece.y + pieceBounds[piece.kind].height - 20;
}
export function drawPieces(scene: Phaser.Scene, state: World, wardrobe: boolean, selected: number | null) {
  const pieces = new Map<number, Phaser.GameObjects.Container>();
  orderedPieces(state).forEach(piece => {
    const container = drawPiece(scene, piece, state, wardrobe); pieces.set(piece.id, container);
    seatFront(scene, piece, state);
    if (selected === piece.id) {
      const box = pieceBounds[piece.kind];
      container.add(scene.add.rectangle(box.width / 2, box.height / 2, box.width + 6, box.height + 6)
        .setStrokeStyle(2, 0x477e86).setFillStyle(0xffffff, 0.06));
    }
  });
  if (wardrobe) slotsFor(state).forEach(slot => scene.add.image(slot.x, slot.y, `look-${slot.id}`).setDisplaySize(27, 27).setDepth(pieceDepth(fixture(state, 'wardrobe')!) + 2));
  return pieces;
}
export function drawPiece(scene: Phaser.Scene, piece: Piece, state: World, wardrobe: boolean) {
  const container = scene.add.container(piece.x, piece.y).setDepth(pieceDepth(piece));
  const parts = partsFor(piece, state, wardrobe);
  const box = pieceBounds[piece.kind];
  if (!['rug', 'picture', 'neon', 'cushion'].includes(piece.kind)) container.add(contactShadow(scene, box.width / 2, box.height - 3, box.width * .76, 8, 0x625642));
  parts.forEach(part => container.add(scene.add.image(box.width / 2, box.height / 2, `piece-${part}-${piece.color}`).setFlipX(piece.flipped).setDisplaySize(box.width, box.height)));
  if (piece.active) container.add(drawnUse(piece.kind) ? drawUse(scene, piece) : scene.add.text(box.width / 2, 6, effect(piece), textStyle('effect')).setOrigin(.5).setName('effect'));
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
    return keys.some(key => (scene.textures.getPixelAlpha(x * rasterScale, dy * rasterScale, key) ?? 0) > (piece.kind === 'lamp' ? 64 : 16));
  });
}

export function actorDepth(state: World, actor: Actor) {
  const support = actor.seat && fixture(state, seatKind(actor.seat));
  return support ? pieceDepth(support) + 1 : Math.max(floorTop(state), actor.y);
}

export function objectDepth(state: World, item: import('../domain/types').Item) {
  const holder = state.actors.find(a => a.id === item.holder);
  if (holder) return actorDepth(state, holder) + 2;
  const support = item.spot === 'floor' ? undefined : fixture(state, item.spot === 'drawer' ? 'wardrobe' : item.spot);
  return support ? pieceDepth(support) + 2 : item.y + 1;
}

function seatFront(scene: Phaser.Scene, piece: Piece, state: World) {
  if (!state.actors.some(a => a.room === piece.room && a.seat && seatKind(a.seat) === piece.kind)) return;
  const box = pieceBounds[piece.kind], top = Math.round(box.height * .82);
  scene.add.image(piece.x + box.width / 2, piece.y + box.height / 2, `piece-${piece.kind}-${piece.color}`)
    .setDisplaySize(box.width, box.height).setFlipX(piece.flipped).setCrop(0, top * rasterScale, box.width * rasterScale, (box.height - top) * rasterScale).setDepth(pieceDepth(piece) + 2);
}
