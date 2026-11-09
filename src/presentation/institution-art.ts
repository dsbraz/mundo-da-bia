import type { BuildingModel } from '../domain/neighborhood-types';
import type { RoomTemplate } from '../domain/types';
const rect = (x: number, y: number, w: number, h: number, fill: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="#75837f" stroke-width="1.5"/>`;
const panes = (x: number, y: number, w: number, h: number) => rect(x - 5, y - 5, w + 10, h + 10, '#f6f0e4') + rect(x, y, w, h, 'url(#glass)') + `<path d="M${x + w / 2} ${y}v${h}m${-w / 2} ${-h / 2}h${w}" fill="none" stroke="#f6f0e4" stroke-width="3"/>`;
const identities: Partial<Record<BuildingModel, { wall: string; trim: string; emblem: string }>> = {
  hospital: { wall: '#e6ede4', trim: '#729c97', emblem: '<path d="M82 145h12v12h12v12H94v12H82v-12H70v-12h12Z" fill="#f7f2df"/>' },
  police: { wall: '#e1e6eb', trim: '#6c829b', emblem: '<path d="M70 146h36v18q0 14-18 22-18-8-18-22Z" fill="#ead4a2" stroke="#f9f1d7" stroke-width="2"/><path d="m88 153 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#71859e"/>' },
  office: { wall: '#e6ddce', trim: '#7e8f87', emblem: '<path d="M70 154h36v25H70Zm9 0v-8h18v8" fill="none" stroke="#fff3d7" stroke-width="3"/><path d="M70 163h36m-18 0v7" stroke="#fff3d7" stroke-width="2"/>' },
};
export function institutionFacade(model: BuildingModel, floors: number): string | undefined {
  const identity = identities[model]; if (!identity) return;
  const top = 136 - (floors - 1) * 56;
  let windows = '';
  for (let level = 1; level < floors; level++) windows += panes(83, 137 - level * 56, 104, 34) + panes(253, 137 - level * 56, 104, 34);
  return rect(44, top, 352, 309 + (floors - 1) * 56, identity.wall)
    + rect(36, top - 12, 368, 12, identity.trim) + windows
    + rect(44, 137, 352, 55, identity.trim) + identity.emblem
    + rect(128, 148, 222, 32, '#faf3e3')
    + panes(72, 266, 85, 116) + panes(283, 266, 85, 116)
    + rect(52, 421, 108, 24, '#c3cbbb') + rect(280, 421, 108, 24, '#c3cbbb')
    + `<path d="M44 204h352M44 405h112m128 0h112" stroke="${identity.trim}" stroke-width="3"/><path d="M50 196h340v12H50Z" fill="#596c64" opacity=".08"/>`;
}
const rooms: Partial<Record<RoomTemplate, { wall: string; trim: string; label: string }>> = {
  reception: { wall: '#e3e7dc', trim: '#a7bdac', label: 'Bem-vindos' },
  consultation: { wall: '#e3edeb', trim: '#a1c3be', label: 'Consultório' },
  ward: { wall: '#e7eddf', trim: '#b3c6ae', label: 'Descansar e cuidar' },
  dispatch: { wall: '#e1e7ee', trim: '#a3b3c6', label: 'Atendimento' },
  investigation: { wall: '#e8e1d4', trim: '#b9ab94', label: 'Investigar' },
  office: { wall: '#e4e7e1', trim: '#a2b3a8', label: 'Ideias e projetos' },
  meeting: { wall: '#ebe3d7', trim: '#c3b29e', label: 'Vamos conversar' },
  breakroom: { wall: '#e9eadb', trim: '#bac29e', label: 'Hora da pausa' },
};
export function institutionInterior(template: RoomTemplate): string | undefined {
  const room = rooms[template]; if (!room) return;
  return rect(0, 58, 1000, 327, room.wall) + rect(0, 280, 1000, 105, room.trim)
    + panes(100, 100, 220, 155) + panes(675, 100, 220, 155)
    + `<path d="M100 265h220m355 0h220" stroke="#b5a48c" stroke-width="7"/>`
    + rect(400, 111, 200, 47, '#faf6e9')
    + `<text x="500" y="140" text-anchor="middle" font-family="sans-serif" font-size="17" fill="#53665f">${room.label}</text>`
    + `<path d="M0 281h1000M0 290h1000" stroke="#f6f1e4" stroke-width="2"/>`;
}
