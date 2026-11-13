import type { BuildingModel } from '../domain/neighborhood-types';
import type { RoomTemplate } from '../domain/types';
import { hospitalFacade, policeFacade, officeFacade, fireFacade, schoolFacade } from './civic-facades';
import { stadiumFacade, clubFacade } from './sport-facades';
import { uiText } from '../content/ui-text';
const rect = (x: number, y: number, w: number, h: number, fill: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="#75837f" stroke-width="1.5"/>`;
const panes = (x: number, y: number, w: number, h: number) => rect(x - 5, y - 5, w + 10, h + 10, '#f6f0e4') + rect(x, y, w, h, 'url(#glass)') + `<path d="M${x + w / 2} ${y}v${h}m${-w / 2} ${-h / 2}h${w}" fill="none" stroke="#f6f0e4" stroke-width="3"/>`;
const facades: Partial<Record<BuildingModel, (floors: number) => string>> = { hospital: hospitalFacade, police: policeFacade, office: officeFacade, 'fire-station': fireFacade, school: schoolFacade, stadium: stadiumFacade, 'sports-club': clubFacade };
export function institutionFacade(model: BuildingModel, floors: number): string | undefined {
  return facades[model]?.(floors);
}
const rooms: Partial<Record<RoomTemplate, { wall: string; trim: string; label: string }>> = {
  reception: { wall: '#e3e7dc', trim: '#a7bdac', label: 'Bem-vindos' },
  consultation: { wall: '#e3edeb', trim: '#a1c3be', label: 'Consultório' },
  ward: { wall: '#e7eddf', trim: '#b3c6ae', label: 'Descansar e cuidar' },
  dispatch: { wall: '#e1e7ee', trim: '#a3b3c6', label: 'Atendimento' },
  investigation: { wall: '#e8e1d4', trim: '#b9ab94', label: uiText.places.investigation },
  office: { wall: '#e4e7e1', trim: '#a2b3a8', label: 'Ideias e projetos' },
  meeting: { wall: '#ebe3d7', trim: '#c3b29e', label: 'Vamos conversar' },
  breakroom: { wall: '#e9eadb', trim: '#bac29e', label: 'Hora da pausa' },
};
export function institutionInterior(template: RoomTemplate): string | undefined {
  if (template === 'classroom') return classroom();
  if (template === 'sportsfield' || template === 'gym') return sportsInterior(template === 'sportsfield');
  const room = rooms[template]; if (!room) return;
  return rect(0, 58, 1000, 327, room.wall) + rect(0, 280, 1000, 105, room.trim)
    + panes(100, 100, 220, 155) + panes(675, 100, 220, 155)
    + `<path d="M100 265h220m355 0h220" stroke="#b5a48c" stroke-width="7"/>`
    + rect(400, 111, 200, 47, '#faf6e9')
    + `<text x="500" y="140" text-anchor="middle" font-family="sans-serif" font-size="17" fill="#53665f">${room.label}</text>`
    + `<path d="M0 281h1000M0 290h1000" stroke="#f6f1e4" stroke-width="2"/>`;
}
function classroom() {
  return rect(0, 58, 1000, 327, '#e9e1cd') + rect(0, 286, 1000, 99, '#bec9ac') + panes(80, 90, 200, 210)
    + bunting();
}
/** Paper flags across the classroom wall (W3L-26): the board itself is a piece, hung under them. */
function bunting() {
  const colors = ['#e8735a', '#f2b630', '#79a78a', '#8db7d1', '#df7987'];
  let flags = '<path d="M310 63q340 8 680 0" fill="none" stroke="#9a8869" stroke-width="2"/>';
  for (let i = 0; i < 14; i++) { const x = 322 + i * 48, y = 63 + 4 * Math.sin(Math.PI * (x - 310) / 680); flags += `<path d="M${x} ${y}h26l-13 19Z" fill="${colors[i % 5]}" stroke="#75837f" stroke-width="1.5" stroke-linejoin="round"/>`; }
  return flags;
}
function sportsInterior(outside: boolean) {
  const wall = outside ? '<rect width="1000" height="390" fill="url(#glass)"/><path d="M0 290q200-120 400-10t600-40v140H0Z" fill="#a2bb90"/>' : rect(0, 58, 1000, 327, '#e3dcc7') + panes(100, 90, 280, 130) + panes(620, 90, 280, 130);
  let fence = ''; if (outside) for (let x = 20; x < 1000; x += 40) fence += `<path d="M${x} 280v110" stroke="#7f9682" stroke-width="2"/>`;
  return wall + fence + `<path d="M0 320h1000m-1000 68h1000" stroke="#829785" stroke-width="5"/><rect y="390" width="1000" height="210" fill="${outside ? '#9bb77e' : '#cba981'}"/><path d="M120 420h760l80 155H40Zm380 0v155" fill="none" stroke="#f3efce" stroke-width="3"/><ellipse cx="500" cy="490" rx="58" ry="31" fill="none" stroke="#f3efce" stroke-width="3"/>`;
}
