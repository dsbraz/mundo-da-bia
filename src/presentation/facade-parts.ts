import type { BuildingModel } from '../domain/neighborhood-types';
import { doorway } from '../domain/doorway';
export const facadeRect = (x: number, y: number, w: number, h: number, fill: string, radius = 3) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="#77817c" stroke-width="1.5"/>`;
export function facadeWindow(x: number, y: number, w: number, h: number) {
  return facadeRect(x - 4, y - 4, w + 8, h + 8, '#f7f1e4') + facadeRect(x, y, w, h, 'url(#glass)') + `<path d="M${x + w / 2} ${y}v${h}m${-w / 2} ${-h / 2}h${w}" fill="none" stroke="#f7f1e4" stroke-width="2"/>`;
}
export function facadeLabel(model: BuildingModel, floors: number) {
  const labels: Partial<Record<BuildingModel, { x: number; y: number; width: number }>> = {
    hospital: { x: 220, y: 188, width: 260 }, police: { x: 220, y: 188, width: 250 }, office: { x: 220, y: 190, width: 230 },
    'fire-station': { x: 220, y: 188, width: 260 }, school: { x: 220, y: 185, width: 260 }, stadium: { x: 220, y: 190, width: 230 }, 'sports-club': { x: 220, y: 185, width: 250 },
  };
  return labels[model] ?? { x: 220, y: model === 'apartment' ? 50 + (3 - floors) * 55 : model === 'shop' ? 156 : 160 - (floors - 1) * 22, width: 200 };
}
export function institutionDoor(model: BuildingModel) {
  const d = doorway.facade;
  const glass = ['hospital', 'office', 'sports-club'].includes(model);
  const frame = model === 'fire-station' ? '#a55d50' : model === 'school' ? '#a08259' : '#66817c';
  let panels = '';
  for (const x of [d.x + 8, d.x + d.width / 2 + 3]) panels += facadeRect(x, d.y + 9, d.width / 2 - 11, d.height - 18, glass ? 'url(#glass)' : '#ced6c5');
  return facadeRect(d.x - 7, d.y - 7, d.width + 14, d.height + 7, '#f3eddd', 5) + facadeRect(d.x, d.y, d.width, d.height, frame, 2) + panels + `<path d="M${d.x + d.width / 2 - 8} ${d.y + 122}v24m16-24v24" stroke="#65716c" stroke-width="4" stroke-linecap="round"/>`;
}
