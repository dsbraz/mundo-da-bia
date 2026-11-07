import type { NewRoom } from '../domain/rooms';
import type { PieceKind, RoomTemplate } from '../domain/types';
import { roomTemplates } from '../domain/types';
import { templates } from '../content/projects';
import { pieceImage } from './piece-assets';
const pictures: Record<RoomTemplate, PieceKind[]> = {
  empty: ['rug', 'plant'], bedroom: ['bed', 'lamp'], kitchen: ['fridge', 'counter', 'stove'],
  bathroom: ['bath', 'mirror'], studio: ['stage', 'speaker'], garden: ['plant', 'cat-bed'],
};
const images = new Map<PieceKind, string>();
function pictureSource(kind: PieceKind): string {
  if (!images.has(kind)) images.set(kind, pieceImage(kind, 'original', true));
  return images.get(kind)!;
}
export function roomPicture(template: RoomTemplate): HTMLElement {
  const picture = document.createElement('span'); picture.className = 'room-picture'; picture.setAttribute('aria-hidden', 'true');
  pictures[template].forEach(kind => { const img = document.createElement('img'); img.src = pictureSource(kind); img.alt = ''; picture.append(img); });
  return picture;
}
export function quickRooms(root: HTMLElement, add: (room: NewRoom) => void, close: () => void) {
  const panel = root.querySelector<HTMLElement>('#quick-rooms')!;
  let cell = 2;
  roomTemplates.forEach(template => {
    const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label', `Criar ${templates[template].name}`);
    button.append(roomPicture(template), document.createTextNode(templates[template].name));
    button.addEventListener('click', () => { add({ name: templates[template].name, template, size: 'medium', cell }); panel.hidden = true; close(); });
    root.querySelector('#room-cards')!.append(button);
  });
  root.querySelector('#cancel-room-choice')!.addEventListener('click', () => { panel.hidden = true; root.querySelector<HTMLButtonElement>(`[aria-label="Construir no espaço ${cell + 1}"]`)?.focus(); });
  return (value: number) => { cell = value; panel.hidden = false; panel.querySelector('button')!.focus(); panel.scrollIntoView({ block: 'nearest' }); };
}
