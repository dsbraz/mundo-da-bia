import { visualPiecePoint } from './furniture-scale';
import { furnishings } from '../content/furnishings';
import { pieceBounds } from '../domain/layout';
import { pieceSeat, seatsOf } from '../domain/seats';
import { usableKinds } from '../domain/use';
import { onToilet } from '../domain/toilet';
import { positionTargets } from './viewport';
import type { Action, ActorId, Piece, World } from '../domain/types';
export function sceneControls(root: HTMLElement, select: (id: number) => void, dispatch: (action: Action) => void, dress: () => void) {
  const layer = document.createElement('div'); layer.className = 'scene-controls'; root.append(layer);
  return (world: World, actor: ActorId, building: boolean) => {
    const focused = document.activeElement?.getAttribute('data-piece');
    layer.replaceChildren(...world.layout.pieces.filter(p => p.room === world.room).map(piece => {
      const button = document.createElement('button'); button.className = 'scene-target'; button.dataset.piece = String(piece.id);
      button.textContent = `${building ? 'Selecionar' : 'Usar'} ${furnishings[piece.kind].name}`;
      const point = visualPiecePoint(piece, { x: piece.x + pieceBounds[piece.kind].width / 2, y: piece.y + pieceBounds[piece.kind].height / 2 });
      button.dataset.worldX = String(point.x); button.dataset.worldY = String(point.y);
      button.addEventListener('click', () => {
        if (building) select(piece.id); else usePiece(piece, actor, world, dispatch, dress);
      }); return button;
    }));
    positionTargets(root);
    if (focused) layer.querySelector<HTMLButtonElement>(`[data-piece="${focused}"]`)?.focus();
  };
}
function usePiece(piece: Piece, actor: ActorId, world: World, dispatch: (action: Action) => void, dress: () => void) {
  if (piece.kind === 'wardrobe') { dress(); return; }
  if (piece.kind === 'stage') { dispatch({ type: 'show' }); return; }
  if (piece.kind === 'lamp' || piece.kind === 'fridge') { dispatch({ type: 'interact', target: piece.kind }); return; }
  if (piece.kind === 'table') { const item = world.items.find(i => i.holder === actor); if (item) dispatch({ type: 'put', item: item.id, spot: 'table' }); return; }
  const seat = onToilet(world, piece) ? undefined : seatFor(world, piece, actor);
  if (seat) { dispatch({ type: 'sit', actor, seat }); return; }
  dispatch({ type: 'use', id: piece.id });
}
/** A seat that is not also a toy (a desk or picnic table is used by a tap): where the selected character sits on it. */
function seatFor(world: World, piece: Piece, actor: ActorId) {
  const who = world.actors.find(a => a.id === actor);
  return who && seatsOf(piece).length && !usableKinds.includes(piece.kind) ? pieceSeat(world, piece, who) : undefined;
}
