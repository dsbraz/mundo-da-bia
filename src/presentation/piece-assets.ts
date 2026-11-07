import type Phaser from 'phaser';
import { paletteIds, pieceKinds } from '../domain/types';
import type { Palette, PieceKind } from '../domain/types';
import { pieceBounds } from '../domain/layout';
import { recolor, svgFragment } from './svg-source';
import sala from './assets/sala.svg?raw';
import quarto from './assets/quarto.svg?raw';
import workshop from './assets/workshop.svg?raw';
import playroom from './assets/playroom.svg?raw';
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
  if (['armchair', 'reading-lamp', 'side-table'].includes(kind)) return reading;
  if (['piano', 'tv', 'aquarium'].includes(kind)) return playroom;
  if (['counter', 'stove', 'bath', 'desk', 'shelf'].includes(kind)) return workshop;
  if (['bed', 'dresser', 'cat-bed'].includes(kind)) return quarto;
  return ['plant', 'picture', 'cushion', 'neon', 'speaker', 'mirror'].includes(kind) ? decor : sala;
}
export function pieceImage(kind: PieceKind, color: Palette = 'original', preview = false): string {
  const parts = [...(layers[kind] ?? [kind])];
  if (preview) parts.push(...(extras[kind] ?? []).filter(id => id.endsWith('closed') || id === 'lamp-on'));
  return svgFragment(recolor(source(kind), color), parts, pieceBounds[kind]);
}
export function loadPieces(scene: Phaser.Scene) {
  scene.load.svg('window-sala', svgFragment(sala, ['window'], { x: 70, y: 50, width: 215, height: 210 }));
  scene.load.svg('window-quarto', svgFragment(quarto, ['window'], { x: 70, y: 50, width: 215, height: 210 }));
  pieceKinds.forEach(kind => paletteIds.forEach(color => {
    scene.load.svg(`piece-${kind}-${color}`, pieceImage(kind, color));
    (extras[kind] ?? []).forEach(part => scene.load.svg(`piece-${part}-${color}`, svgFragment(recolor(source(kind), color), [part], pieceBounds[kind])));
  }));
}
