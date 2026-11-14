import type { Piece } from '../domain/types';
import { visualPiecePoint } from './furniture-scale';

/** Kept apart from the reflection (which draws figures) so the e2e can use it without loading the art. */
export interface Glass { x: number; y: number; width: number; height: number; radius: number }
/** The mirror's glass (the rounded rect at 19,13 62×103 of the 100×150 drawing), in scene units as drawn. */
export function glassOf(piece: Piece): Glass {
  const a = visualPiecePoint(piece, { x: piece.x + 19, y: piece.y + 13 }), b = visualPiecePoint(piece, { x: piece.x + 81, y: piece.y + 116 });
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y, radius: 22 };
}
