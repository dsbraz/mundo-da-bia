import { furnitureTransform } from './furniture-scale';
import { loadSvg } from './rendering';
import type Phaser from 'phaser';
import type { Palette, PieceKind, World } from '../domain/types';
import { pieceBounds } from '../domain/layout';
import { recolor, svgFragment } from './svg-source';
import { chairImage, chairReady } from './chair-art';
import sala from './assets/sala.svg?raw';
import quarto from './assets/quarto.svg?raw';
import workshop from './assets/workshop.svg?raw';
import playroom from './assets/playroom.svg?raw';
import everyday from './assets/everyday.svg?raw';
import reading from './assets/reading.svg?raw';
import decor from './assets/decor.svg?raw';

const layers: Partial<Record<PieceKind, string[]>> = {
  wardrobe: ['wardrobe-frame'], fridge: ['fridge-frame'], lamp: ['lamp-base'],
};
const extras: Partial<Record<PieceKind, string[]>> = {
  'reading-lamp': ['reading-lamp-on'],
  piano: ['piano-on'], tv: ['tv-on'], aquarium: ['aquarium-on'],
  wardrobe: ['wardrobe-closed', 'wardrobe-open', 'drawer-closed', 'drawer-open'],
  fridge: ['fridge-closed', 'fridge-open'], lamp: ['lamp-on', 'lamp-off'],
};
function source(kind: PieceKind) {
  if (['sink', 'washer', 'planter', 'picnic-table', 'bookcase', 'kitchen-cart'].includes(kind)) return everyday;
  if (['armchair', 'reading-lamp', 'side-table'].includes(kind)) return reading;
  if (['piano', 'tv', 'aquarium'].includes(kind)) return playroom;
  if (['counter', 'stove', 'bath', 'desk', 'shelf'].includes(kind)) return workshop;
  if (['bed', 'dresser', 'cat-bed'].includes(kind)) return quarto;
  return ['plant', 'picture', 'cushion', 'neon', 'speaker', 'mirror'].includes(kind) ? decor : sala;
}
export function pieceImage(kind: PieceKind, color: Palette = 'original', preview = false): string {
  if (kind === 'chair') return chairImage(color);
  const parts = [...(layers[kind] ?? [kind])];
  if (preview) parts.push(...(extras[kind] ?? []).filter(id => id.endsWith('closed') || id === 'lamp-on'));
  return svgFragment(recolor(source(kind), color), parts, pieceBounds[kind], furnitureTransform(kind));
}
export function loadPieces(scene: Phaser.Scene, state: World) {
  const unique = new Map(state.layout.pieces.map(piece => [`${piece.kind}-${piece.color}`, piece]));
  const chair = chairReady(scene);
  unique.forEach(({ kind, color }) => {
    if (scene.textures.exists(`piece-${kind}-${color}`) || (kind === 'chair' && !chair)) return;
    loadSvg(scene, `piece-${kind}-${color}`, pieceImage(kind, color));
    (extras[kind] ?? []).forEach(part => loadSvg(scene, `piece-${part}-${color}`, svgFragment(recolor(source(kind), color), [part], pieceBounds[kind], furnitureTransform(kind))));
  });
}
