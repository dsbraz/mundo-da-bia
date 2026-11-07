import { furnishings } from '../content/furnishings';
import { pieceBounds } from '../domain/layout';
import { roomWidth } from '../domain/geometry';
import type { Action, ActorId, Piece, World } from '../domain/types';
export function sceneControls(root: HTMLElement, select: (id: number) => void, dispatch: (action: Action) => void, dress: () => void) {
  const layer = document.createElement('div'); layer.className = 'scene-controls'; root.append(layer);
  return (world: World, actor: ActorId, building: boolean) => {
    const focused = document.activeElement?.getAttribute('data-piece');
    layer.replaceChildren(...world.layout.pieces.filter(p => p.room === world.room).map(piece => {
      const button = document.createElement('button'); button.className = 'scene-target'; button.dataset.piece = String(piece.id);
      button.textContent = `${building ? 'Selecionar' : 'Usar'} ${furnishings[piece.kind].name}`;
      const box = root.querySelector('canvas')?.getBoundingClientRect();
      if (box) {
        button.style.left = `${box.left + (piece.x + pieceBounds[piece.kind].width / 2) / roomWidth(world) * box.width}px`;
        button.style.top = `${box.top + (piece.y + pieceBounds[piece.kind].height / 2) / 600 * box.height}px`;
      }
      button.addEventListener('click', () => {
        if (building) select(piece.id); else usePiece(piece, actor, world, dispatch, dress);
      }); return button;
    }));
    if (focused) layer.querySelector<HTMLButtonElement>(`[data-piece="${focused}"]`)?.focus();
  };
}
function usePiece(piece: Piece, actor: ActorId, world: World, dispatch: (action: Action) => void, dress: () => void) {
  if (piece.kind === 'wardrobe') { dress(); return; }
  if (piece.kind === 'lamp' || piece.kind === 'fridge') { dispatch({ type: 'interact', target: piece.kind }); return; }
  if (piece.kind === 'table') { const item = world.items.find(i => i.holder === actor); if (item) dispatch({ type: 'put', item: item.id, spot: 'table' }); return; }
  const seat = { sofa: 'sofa-left', bed: 'bed', armchair: 'armchair' } as const;
  if (piece.kind in seat) { dispatch({ type: 'sit', actor, seat: seat[piece.kind as keyof typeof seat] }); return; }
  dispatch({ type: 'use', id: piece.id });
}
