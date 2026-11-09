import type { RoomId, World } from '../domain/types';
import { roomWidths } from '../domain/geometry';
import { pieceBounds } from '../domain/layout';
import { palettes } from '../content/furnishings';
import { roomArchitecture, svgUrl } from './architecture-art';
import { pieceImage } from './piece-assets';
import { pieceDepth } from './piece-art';

export function roomThumbnail(world: World, id: RoomId) {
  const room = world.layout.rooms[id]!, width = roomWidths[room.size];
  const picture = document.createElement('span'); picture.className = 'room-thumbnail'; picture.setAttribute('aria-hidden', 'true');
  const wall = room.wall === 'original' ? '#e8e6dd' : palettes[room.wall].light;
  const originalFloor = ['kitchen', 'bathroom'].includes(room.template) ? '#cbd3c0' : '#c3a284';
  const floor = room.floor === 'original' ? originalFloor : palettes[room.floor].base;
  picture.style.background = `linear-gradient(${wall} 65%,${floor} 65%)`;
  const architecture = document.createElement('img'); architecture.src = svgUrl(roomArchitecture(room.template)); architecture.alt = ''; architecture.draggable = false; picture.append(architecture);
  const pieces = world.layout.pieces.filter(p => p.room === id).sort((a, b) => pieceDepth(a) - pieceDepth(b));
  pieces.forEach(piece => {
    const bounds = pieceBounds[piece.kind];
    const image = document.createElement('img'); image.src = pieceImage(piece.kind, piece.color, true); image.alt = ''; image.draggable = false; image.dataset.piece = String(piece.id);
    image.style.cssText = `left:${piece.x / width * 100}%;top:${piece.y / 6}%;width:${bounds.width / width * 100}%;height:${bounds.height / 6}%;transform:scaleX(${piece.flipped ? -1 : 1})`;
    picture.append(image);
  });
  return picture;
}
