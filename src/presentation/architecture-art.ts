import { doorway } from './door-geometry';
import type { BuildingModel } from '../domain/neighborhood-types';
import type { RoomTemplate } from '../domain/types';
const stroke = '#786c62';
const rect = (x: number, y: number, w: number, h: number, fill: string, radius = 4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
const line = (x: number, y: number, a: number, b: number, color = stroke) => `<path d="M${x} ${y}L${a} ${b}" stroke="${color}" stroke-width="1.5" fill="none"/>`;
function window(x: number, y: number, w = 66, h = 80) {
  return rect(x - 5, y - 5, w + 10, h + 10, '#f9eddb') + rect(x, y, w, h, 'url(#glass)') + line(x + w / 2, y, x + w / 2, y + h, '#fff9e8') + line(x, y + h / 2, x + w, y + h / 2, '#fff9e8') + `<path d="M${x + 3} ${y + 3}h${w / 2}l-${w / 2} ${h / 2}Z" fill="#fff" opacity=".25"/>` + rect(x - 10, y + h + 5, w + 20, 7, '#d9c6b0');
}
function leaves(x: number, y: number, size = 1) {
  return `<g transform="translate(${x} ${y}) scale(${size})"><path d="M0 0q-8-30 2-50M0-12q-30-25-25-40M0-20q30-22 28-40" fill="none" stroke="#688b74" stroke-width="3"/><ellipse cx="-18" cy="-35" rx="10" ry="19" fill="#a6bd8e" transform="rotate(-35 -18 -35)"/><ellipse cx="17" cy="-43" rx="10" ry="21" fill="#789e86" transform="rotate(38 17 -43)"/><ellipse cx="2" cy="-53" rx="9" ry="19" fill="#b5ca9b"/></g>`;
}
function planter(x: number, y: number) { return leaves(x, y) + `<path d="M${x - 21} ${y - 5}h42l-6 32h-30Z" fill="#c98f74" stroke="${stroke}" stroke-width="1.5"/>`; }
function wrap(content: string, width: number, height: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="glass" x2=".8" y2="1"><stop stop-color="#cce7e1"/><stop offset="1" stop-color="#91b9c4"/></linearGradient><linearGradient id="wall" x2="0" y2="1"><stop stop-color="#fff2da"/><stop offset="1" stop-color="#e4d1b8"/></linearGradient><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#6d655b" stop-opacity=".16"/><stop offset="1" stop-color="#6d655b" stop-opacity="0"/></linearGradient></defs>${content}</svg>`;
}
export const facadeKey = (model: BuildingModel, floors: number) => `facade-${model}-${floors}`;
export function facadeSvg(model: BuildingModel, floors = model === 'apartment' ? 2 : 1): string {
  const body = model === 'house' ? house(floors) : model === 'shop' ? shop(floors) : apartment(floors);
  const d = doorway.facade;
  return wrap(`<ellipse cx="220" cy="450" rx="191" ry="13" fill="#756a5a" opacity=".12"/>${body}${planter(80, 425)}${planter(355, 425)}${rect(d.x - 9, d.y - 9, d.width + 18, d.height + 9, '#f8ead2', 10)}${rect(d.x, d.y, d.width, d.height, '#789a9a', 6)}${rect(d.x + 12, d.y + 14, d.width - 24, 86, 'url(#glass)', 5)}${rect(d.x + 12, d.y + 119, d.width - 24, 91, '#89aaa5', 5)}<circle cx="${d.x + d.width - 16}" cy="${d.y + 124}" r="4" fill="#f7d786"/>${rect(d.x - 12, d.y + d.height - 2, d.width + 24, 9, '#d7c3ab')}${rect(275, 390, 11, 20, '#f6e4a8')}${rect(303, 405, 34, 25, '#8caaa0')}${line(307, 413, 333, 413)}`, 440, 480);
}
function house(floors: number) {
  const rise = (floors - 1) * 22;
  let detail = '';
  for (let y = 248; y < 440; y += 22) detail += line(57, y, 383, y, '#d2bea4');
  return rect(55, 165 - rise, 330, 280 + rise, 'url(#wall)') + detail + upperWindows(floors, 180, 22, 14) + `<g transform="translate(0 ${-60-rise})"><path d="M35 234L165 120h83l157 114Z" fill="#809b98" stroke="${stroke}" stroke-width="2"/><path d="M58 219L168 132h77l133 87" fill="none" stroke="#abc3b6" stroke-width="3"/>${rect(301, 135, 25, 61, '#c7a48a')}${rect(140, 204, 160, 39, '#f5e7d1')}</g>${window(86, 274, 62, 82)}${window(292, 274, 62, 82)}${rect(85, 360, 64, 24, '#a4b99b')}${leaves(115, 366, .6)}${rect(152, 201, 136, 9, '#c2a88a')}`;
}
function shop(floors: number) {
  const rise = (floors - 1) * 50;
  let awning = '';
  for (let i = 0; i < 10; i++) awning += `<path d="M${48 + i * 34} 181h34l8 35h-34Z" fill="${i % 2 ? '#fff1d8' : '#ce8e85'}"/>`;
  return rect(48, 128 - rise, 344, 317 + rise, '#edddbe') + rect(45, 115 - rise, 350, 17, '#78968a') + upperWindows(floors, 128) + rect(72, 140, 296, 34, '#faf0d6', 9) + window(73, 332, 94, 85) + window(277, 332, 94, 58) + awning + line(48, 216, 396, 216) + rect(279, 398, 86, 36, '#abbe9c') + `<path d="M88 408l12-36 18 36m9 0 12-29 18 29" fill="#f2c982" stroke="${stroke}" stroke-width="1.2"/>`;
}
function apartment(count: number) {
  const top = 70 + (3 - count) * 55;
  let floors = '';
  for (const y of [75, 145].slice(3 - count)) {
    floors += window(92, y, 73, 48) + window(276, y, 73, 48) + rect(72, y + 57, 294, 12, '#b6ada0');
    for (let x = 78; x < 365; x += 23) floors += line(x, y + 40, x, y + 57, '#70857b');
    floors += line(72, y + 40, 366, y + 40, '#70857b');
  }
  return rect(61, top, 318, 445 - top, '#d1dcca') + rect(50, top - 11, 340, 17, '#7c968c') + rect(197, top + 20, 46, 425 - top, '#eddfc8') + floors + window(91, 346, 70, 70) + window(279, 346, 70, 46) + planter(128, 421);
}
function upperWindows(floors: number, base: number, step = 50, height = 30) {
  let result = '';
  for (let level = 1; level < floors; level++) result += window(95, base - level * step + 5, 65, height) + window(280, base - level * step + 5, 65, height);
  return result;
}
export function roomArchitecture(template: RoomTemplate): string {
  const content = template === 'garden' ? garden() : interior(template);
  return wrap(content, 1000, 600);
}
function interior(template: RoomTemplate) {
  const ceiling = `<path d="M0 0h1000v32L940 58H60L0 32Z" fill="#fff9ed"/><path d="M0 32l60 26h880l60-26" fill="none" stroke="#bcae9a" stroke-width="1.5"/>`;
  const art: Record<Exclude<RoomTemplate, 'garden'>, string> = {
    empty: `${window(90, 95, 185, 165)}${rect(72, 276, 220, 12, '#e2ccb1')}${window(744, 95, 150, 165)}<path d="M75 70h215M730 70h180" stroke="#a08b74" stroke-width="5"/><path d="M74 75v195q28-9 40-30V75M909 75v195q-28-9-40-30V75" fill="#d6b8a3" stroke="#9c8474" stroke-width="1.5"/>`,
    bedroom: `${rect(0, 250, 1000, 135, '#e4d6dd', 0)}${window(95, 91, 180, 150)}<path d="M80 76q105-34 210 0v170q-30-8-35-38V90H115v118q-5 30-35 38Z" fill="#d3c5dc" stroke="#9a8a9e" stroke-width="1.5"/>${rect(570, 125, 320, 180, '#efe3d1', 28)}${rect(582, 137, 296, 156, '#e7d7c2', 22)}<path d="M600 275V155h260" fill="none" stroke="#f9edda" stroke-width="2"/>`,
    kitchen: `${rect(0, 190, 1000, 195, '#e0e8d9', 0)}${tiles(0, 190, 1000, 190, 48)}${window(90, 85, 230, 175)}${rect(570, 90, 310, 64, '#d5bb96')}${line(585, 157, 865, 157)}<path d="M645 160v39m66-39v28m58-28v39" stroke="#8d8a76" stroke-width="3"/><ellipse cx="645" cy="209" rx="10" ry="15" fill="#bbbfad" stroke="#78867b" stroke-width="1.5"/><path d="M700 189h22v25h-22Z" fill="#d4bc98" stroke="#8c7963" stroke-width="1.5"/><path d="M761 199h16l5 20h-26Z" fill="#bbbfad" stroke="#78867b" stroke-width="1.5"/>`,
    bathroom: `${rect(0, 180, 1000, 210, '#c9ddd9', 0)}${tiles(0, 180, 1000, 210, 65)}${window(120, 90, 170, 80)}${rect(604, 75, 235, 220, '#f1e7d5', 100)}${rect(617, 88, 209, 194, 'url(#glass)', 95)}<path d="M624 98l75 0-75 103" fill="#fff" opacity=".25"/>`,
    studio: `${rect(0, 270, 1000, 115, '#a8babd', 0)}${window(80, 80, 210, 220)}<path d="M65 65h240v245q-24-9-30-44V80H95v186q-6 35-30 44Z" fill="#ba9baa" stroke="#8c7485" stroke-width="1.5"/>${rect(640, 105, 240, 115, '#e9d5b6')}${rect(657, 120, 40, 85, '#b8c6be', 6)}${rect(711, 120, 40, 85, '#d1b9aa', 6)}${rect(765, 120, 40, 85, '#b8c6be', 6)}${rect(819, 120, 40, 85, '#d1b9aa', 6)}`,
  };
  return ceiling + art[template as Exclude<RoomTemplate, 'garden'>] + `<rect y="380" width="1000" height="12" fill="#f9f1e2" stroke="#b7aa97" stroke-width="1.5"/><path d="M100 390h160l165 175H205Z" fill="#fff7d5" opacity=".12"/>`;
}
function tiles(x: number, y: number, w: number, h: number, size: number) {
  let result = ''; for (let a = x; a <= x + w; a += size) result += line(a, y, a, y + h, '#eef2e7');
  for (let b = y; b <= y + h; b += size) result += line(x, b, x + w, b, '#eef2e7'); return result;
}
function garden() {
  let slats = ''; for (let x = 20; x < 1000; x += 38) slats += rect(x, 240, 27, 150, '#dfd4b7', 10);
  return `<rect width="1000" height="390" fill="url(#glass)"/><path d="M0 250q150-140 300-30t350-10 350-40v220H0Z" fill="#b1c89c"/><path d="M0 300q220-90 400-10t600-40v150H0Z" fill="#91b496"/>${slats}${rect(0, 283, 1000, 12, '#c1b292')}${rect(0, 357, 1000, 12, '#c1b292')}${rect(0, 390, 1000, 210, '#b3bf92', 0)}<path d="M340 390h150l200 210H190Z" fill="#e7d6b8"/>${leaves(80, 400, 2)}${leaves(900, 420, 2.5)}${planter(820, 430)}`;
}
export const svgUrl = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;
