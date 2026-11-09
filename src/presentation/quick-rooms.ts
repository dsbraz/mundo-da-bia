import type { NewRoom } from '../domain/rooms';
import type { PieceKind, RoomTemplate } from '../domain/types';
import { roomTemplates } from '../domain/types';
import { templates } from '../content/projects';
import { pieceImage } from './piece-assets';
const pictures: Record<RoomTemplate, PieceKind[]> = {
  classroom: ['desk', 'bookcase'], sportsfield: ['planter'], gym: ['shelf', 'speaker'],
  reception: ['counter', 'armchair'],
  consultation: ['desk', 'armchair'],
  ward: ['bed', 'side-table'],
  dispatch: ['desk', 'shelf'],
  investigation: ['desk', 'bookcase'],
  office: ['desk', 'bookcase'],
  meeting: ['picnic-table', 'armchair'],
  breakroom: ['counter', 'fridge'],
  playground: ['picnic-table', 'planter'],
  laundry: ['washer', 'sink'], library: ['bookcase', 'armchair'], dining: ['picnic-table', 'kitchen-cart'],
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
  pictures[template].forEach(kind => { const img = document.createElement('img'); img.src = pictureSource(kind); img.alt = ''; img.draggable = false; picture.append(img); });
  return picture;
}
export function quickRooms(root: HTMLElement, add: (room: NewRoom) => string | null, close: () => void) {
  const panel = root.querySelector<HTMLElement>('#quick-rooms')!;
  let cell = 2;
  roomTemplates.forEach(template => {
    const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label', `Criar ${templates[template].name}`);
    button.append(roomPicture(template), document.createTextNode(templates[template].name));
    button.addEventListener('click', () => {
      const preview = document.createElement('section'); preview.className = 'room-preview';
      const confirm = document.createElement('button'); confirm.textContent = 'Construir cômodo';
      const status = document.createElement('p'); status.setAttribute('role', 'status');
      confirm.onclick = () => {
        const error = add({ name: templates[template].name, template, size: (root.querySelector<HTMLSelectElement>('#room-size')!.value as import('../domain/types').RoomSize), cell });
        if (error) { status.textContent = error; return; }
        preview.remove(); panel.hidden = true; close();
      };
      const cancel = document.createElement('button'); cancel.textContent = 'Cancelar prévia'; cancel.onclick = () => preview.remove();
      panel.querySelector('.room-preview')?.remove(); preview.append(roomPicture(template), status, confirm, cancel); panel.append(preview); confirm.focus();
    });
    root.querySelector('#room-cards')!.append(button);
  });
  root.querySelector('#cancel-room-choice')!.addEventListener('click', () => { panel.hidden = true; root.querySelector<HTMLButtonElement>('#add-room')?.focus(); });
  return (value: number) => { cell = value; panel.hidden = false; panel.querySelector('button')!.focus(); panel.scrollIntoView({ block: 'nearest' }); };
}
