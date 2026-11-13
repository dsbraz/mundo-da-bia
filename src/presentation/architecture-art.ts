import { panoramicFacade } from './panoramic-facade';
import { institutionInterior } from './institution-art';
import { institutionDoor } from './facade-parts';
import { doorway } from './door-geometry';
import type { Building, BuildingModel } from '../domain/neighborhood-types';
import { floorCount } from '../domain/modules';
import { hasMarketRoom } from '../domain/market';
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
export const facadeKey = (model: BuildingModel, floors: number, market = false) => `facade-${model}-${floors}${market ? '-market' : ''}`;
export function facadeSvg(model: BuildingModel, floors = ['apartment', 'hospital', 'office', 'fire-station', 'school'].includes(model) ? 2 : 1, market = false): string {
  const body = panoramicFacade(model, floors, market);
  const d = doorway.facade;
  return wrap(`<ellipse cx="220" cy="450" rx="191" ry="10" fill="#756a5a" opacity=".1"/>${body}${institutionDoor(model)}${rect(d.x - 9, d.y + d.height - 2, d.width + 18, 7, '#d7c3ab')}${rect(275, 390, 11, 20, '#f6e4a8')}${rect(303, 405, 34, 25, '#8caaa0')}`, 440, 480);
}

export function roomArchitecture(template: RoomTemplate): string {
  const content = ['garden', 'playground'].includes(template) ? garden() : interior(template);
  return wrap(content, 1000, 600);
}
function interior(template: RoomTemplate) {
  const ceiling = `<path d="M0 0h1000v32L940 58H60L0 32Z" fill="#fff9ed"/><path d="M0 32l60 26h880l60-26" fill="none" stroke="#bcae9a" stroke-width="1.5"/>`;
  const art: Partial<Record<RoomTemplate, string>> = {
    laundry: `${rect(0, 190, 1000, 195, '#dce8e4', 0)}${tiles(0, 190, 1000, 190, 60)}${window(120, 90, 210, 140)}<path d="M570 110h300m-270 0v45m65-45v45m65-45v45" stroke="#a29279" stroke-width="4"/><path d="M580 130h55v70h-55Zm65 0h55v90h-55Zm65 0h55v70h-55Z" fill="#d9b7a7"/>`,
    library: `${rect(0, 270, 1000, 115, '#d8c6aa', 0)}${window(100, 80, 220, 225)}${rect(620, 90, 240, 160, '#d1b990')}${rect(634, 104, 212, 132, '#f4ecd8')}<path d="M665 200v-62h135v62l-67-12Z" fill="#91aaa0" stroke="#7c8e81" stroke-width="3"/>`,
    dining: `${window(100, 85, 220, 180)}${rect(0, 285, 1000, 100, '#d9c4a8', 0)}<path d="M720 35v65m-60 55 20-55h80l20 55Z" fill="#e0b175" stroke="#9e8365" stroke-width="3"/><ellipse cx="720" cy="155" rx="60" ry="10" fill="#f9e8b8"/>`,
    empty: `${window(90, 95, 185, 165)}${rect(72, 276, 220, 12, '#e2ccb1')}${window(744, 95, 150, 165)}<path d="M75 70h215M730 70h180" stroke="#a08b74" stroke-width="5"/><path d="M74 75v195q28-9 40-30V75M909 75v195q-28-9-40-30V75" fill="#d6b8a3" stroke="#9c8474" stroke-width="1.5"/>`,
    bedroom: `${rect(0, 250, 1000, 135, '#e4d6dd', 0)}${window(95, 91, 180, 150)}<path d="M80 76q105-34 210 0v170q-30-8-35-38V90H115v118q-5 30-35 38Z" fill="#d3c5dc" stroke="#9a8a9e" stroke-width="1.5"/>${rect(570, 125, 320, 180, '#efe3d1', 28)}${rect(582, 137, 296, 156, '#e7d7c2', 22)}<path d="M600 275V155h260" fill="none" stroke="#f9edda" stroke-width="2"/>`,
    kitchen: `${rect(0, 190, 1000, 195, '#e0e8d9', 0)}${tiles(0, 190, 1000, 190, 48)}${window(90, 85, 230, 175)}${rect(570, 90, 310, 64, '#d5bb96')}${line(585, 157, 865, 157)}<path d="M645 160v39m66-39v28m58-28v39" stroke="#8d8a76" stroke-width="3"/><ellipse cx="645" cy="209" rx="10" ry="15" fill="#bbbfad" stroke="#78867b" stroke-width="1.5"/><path d="M700 189h22v25h-22Z" fill="#d4bc98" stroke="#8c7963" stroke-width="1.5"/><path d="M761 199h16l5 20h-26Z" fill="#bbbfad" stroke="#78867b" stroke-width="1.5"/>`,
    bathroom: `${rect(0, 180, 1000, 210, '#c9ddd9', 0)}${tiles(0, 180, 1000, 210, 65)}${window(120, 90, 170, 80)}${rect(604, 75, 235, 220, '#f1e7d5', 100)}${rect(617, 88, 209, 194, 'url(#glass)', 95)}<path d="M624 98l75 0-75 103" fill="#fff" opacity=".25"/>`,
    studio: `${rect(0, 270, 1000, 115, '#a8babd', 0)}${window(80, 80, 210, 220)}<path d="M65 65h240v245q-24-9-30-44V80H95v186q-6 35-30 44Z" fill="#ba9baa" stroke="#8c7485" stroke-width="1.5"/>${rect(640, 105, 240, 115, '#e9d5b6')}${rect(657, 120, 40, 85, '#b8c6be', 6)}${rect(711, 120, 40, 85, '#d1b9aa', 6)}${rect(765, 120, 40, 85, '#b8c6be', 6)}${rect(819, 120, 40, 85, '#d1b9aa', 6)}`,
    market: marketHall(),
  };
  return ceiling + (institutionInterior(template) ?? art[template]) + `<rect y="380" width="1000" height="12" fill="#f9f1e2" stroke="#b7aa97" stroke-width="1.5"/><path d="M100 390h160l165 175H205Z" fill="#fff7d5" opacity=".12"/>`;
}
/** The market hall (W3L-21): green-and-cream tiles, a striped awning along the ceiling, a wide window and a hanging basket sign. */
function marketHall() {
  let awning = '';
  for (let n = 0; n < 25; n++) awning += `<path d="M${n * 40} 58h40v22q-20 10-40 0Z" fill="${n % 2 ? '#fff1d8' : '#8fbf9f'}" stroke="#7d9a86" stroke-width="1.5"/>`;
  return `${rect(0, 230, 1000, 155, '#e6efe1', 0)}${tiles(0, 230, 1000, 150, 50)}${window(400, 110, 200, 100)}${awning}<path d="M820 80v40m40-40v40" stroke="#a08b74" stroke-width="3"/>${rect(800, 120, 80, 50, '#fff9dd', 10)}<path d="M818 140h44l-6 16h-32Z" fill="#d9a05b" stroke="#7a5a44" stroke-width="2"/><circle cx="832" cy="137" r="6" fill="#e8735a" stroke="#7a5a44" stroke-width="1.5"/><circle cx="846" cy="136" r="6" fill="#f2b630" stroke="#7a5a44" stroke-width="1.5"/>`;
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
/** A building's facade (W3L-21: any building with a market room gets the market awning) and its texture key. */
export const buildingFacadeKey = (b: Pick<Building, 'model' | 'layout'>) => facadeKey(b.model, floorCount(b.layout), hasMarketRoom(b.layout));
export const buildingFacadeSvg = (b: Pick<Building, 'model' | 'layout'>) => facadeSvg(b.model, floorCount(b.layout), hasMarketRoom(b.layout));
