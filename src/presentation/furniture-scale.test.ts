import { expect, it } from 'vitest';
import { pieceBounds } from '../domain/layout';
import type { Piece } from '../domain/types';
import { visualPiecePoint, logicalPiecePoint } from './furniture-scale';
it('ajusta volume em torno do contato com o chão sem mudar a colocação salva', () => {
  const piece: Piece = { id: 1, kind: 'sofa', room: 'sala', x: 60, y: 270, color: 'original', flipped: false };
  const before = structuredClone(piece), box = pieceBounds.sofa;
  const contact = { x: piece.x + box.width / 2, y: piece.y + box.height };
  expect(visualPiecePoint(piece, contact)).toEqual(contact);
  const seat = { x: 150, y: 405 }, visible = visualPiecePoint(piece, seat);
  expect(visible.y).toBeGreaterThan(seat.y);
  expect(logicalPiecePoint(piece, visible)).toEqual(seat);
  expect(piece).toEqual(before);
});
