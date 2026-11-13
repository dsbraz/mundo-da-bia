import type { BuildingModel } from '../domain/neighborhood-types';
import { facadeRect as rect, facadeWindow as window } from './facade-parts';
const colors: Record<BuildingModel, [string, string]> = {
  house: ['#ead8bd', '#809b98'], apartment: ['#d1dcca', '#7c968c'], shop: ['#edddbe', '#ce8e85'],
  hospital: ['#f0f2e9', '#81afa8'], police: ['#d2d8dd', '#6c7f96'], office: ['#c5d9d2', '#526d6b'],
  'fire-station': ['#c48770', '#8e4c43'], school: ['#e8ce93', '#a06f57'], stadium: ['#b9c4b5', '#799c9b'], 'sports-club': ['#dfd6b6', '#6b9b91'],
};
export function panoramicFacade(model: BuildingModel, floors: number, market = false) {
  const [wall, trim] = colors[model], top = 295 - (floors - 1) * 112;
  const inset = model === 'office' ? 70 : model === 'hospital' ? 30 : 48;
  let body = rect(inset, top, 440 - inset * 2, 447 - top, wall);
  for (let level = 0; level < floors; level++) {
    const y = 335 - level * 112;
    body += window(inset + 22, y, 72, 64) + window(346 - inset, y, 72, 64);
    if (level) body += rect(inset - 4, y + 80, 448 - inset * 2, 7, trim, 1);
    if (level && model === 'apartment') body += balcony(y + 64, inset, trim);
  }
  body += roof(model, top, trim, inset);
  body += market ? marketFront(top) : identity(model, top, trim);
  body += rect(137, model === 'house' ? top - 16 : 278, 166, 30, '#f6edda');
  return body + `<path d="M${inset + 3} ${top + 3}h${434 - inset * 2}" stroke="#fff8e6" stroke-width="3" opacity=".65"/>`;
}
function balcony(y: number, inset: number, trim: string) {
  let bars = '';
  for (const x of [inset + 10, 336 - inset]) {
    bars += rect(x, y + 17, 94, 6, trim, 1);
    for (let n = 0; n < 5; n++) bars += `<path d="M${x + n * 23} ${y}v19" stroke="${trim}" stroke-width="2"/>`;
    bars += `<path d="M${x} ${y}h94" stroke="${trim}" stroke-width="2"/>`;
  }
  return bars;
}
function roof(model: BuildingModel, top: number, trim: string, inset: number) {
  if (model === 'house' || model === 'police') return `<path d="M${inset - 15} ${top}L220 ${top - 58} ${455 - inset} ${top}Z" fill="${trim}" stroke="#736e63" stroke-width="2"/><path d="M${inset + 12} ${top - 5}L220 ${top - 45}" fill="none" stroke="#cbd4bd" stroke-width="3"/>`;
  if (model === 'sports-club' || model === 'stadium') return `<path d="M${inset - 14} ${top + 5}Q220 ${top - 100} ${454 - inset} ${top + 5}l-8 16Q220 ${top - 66} ${inset - 6} ${top + 21}Z" fill="${trim}" stroke="#627b70" stroke-width="2"/>`;
  return rect(inset - 8, top - 13, 456 - inset * 2, 17, trim, 2);
}
function identity(model: BuildingModel, top: number, trim: string) {
  const icons: Partial<Record<BuildingModel, string>> = {
    house: rect(316, top - 49, 22, 35, '#bd9e80'),
    hospital: rect(172, top - 48, 96, 34, '#f3f3e6') + `<path d="M212 ${top - 42}h16v8h8v12h-8v8h-16v-8h-8v-12h8Z" fill="${trim}"/>`,
    police: `<path d="M205 ${top - 60}h30v17q0 13-15 20-15-7-15-20Z" fill="#d6bc82" stroke="#8c7e61"/>`,
    office: (top < 262 ? rect(183, top + 8, 74, 262 - top, 'url(#glass)', 1) : '') + rect(311, top - 26, 38, 13, '#899d94', 1),
    school: `<path d="M220 ${top - 12}v-45m0 0h33l-9 11 9 11h-33" fill="#e2b76e" stroke="#89745a" stroke-width="2"/><circle cx="220" cy="${top - 33}" r="23" fill="#fff5d8" stroke="#93846a" stroke-width="2"/><path d="M220 ${top - 48}v15l12 7" fill="none" stroke="#6f796b" stroke-width="2"/>`,
    stadium: rect(173, top - 60, 94, 32, '#526d68') + `<text x="220" y="${top - 37}" text-anchor="middle" font-size="19" fill="#f6e4a4">0 : 0</text>`,
    'sports-club': `<circle cx="220" cy="${top - 48}" r="20" fill="#d4b17b" stroke="#7a886f" stroke-width="2"/><path d="M200 ${top - 48}h40m-20-20v40" stroke="#7a886f"/>`,
  };
  if (model === 'shop') return awning(trim);
  if (model === 'fire-station') return garage();
  return icons[model] ?? '';
}
function awning(trim: string) {
  let result = '';
  for (let n = 0; n < 10; n++) result += `<path d="M${44 + n * 35} 310h35l6 19h-35Z" fill="${n % 2 ? '#fff1d8' : trim}"/>`;
  return result;
}
function garage() {
  let result = rect(57, 330, 105, 108, '#cda38a') + rect(278, 330, 105, 108, '#cda38a');
  for (let y = 342; y < 438; y += 14) result += `<path d="M59 ${y}h101m118 0h101" stroke="#96574b" stroke-width="2"/>`;
  return result + '<path d="M207 254q-10-17 5-29l7-12 8 17 11-7q10 20-4 32-14 10-27-1Z" fill="#e9b763" stroke="#9e6348"/>';
}
/** A market (W3L-21): a deep green-and-cream awning over the shop window and a sign with a full basket, read without words. */
function marketFront(top: number) {
  let result = '';
  for (let n = 0; n < 9; n++) result += `<path d="M${48 + n * 38} 300h38v26q-19 12-38 0Z" fill="${n % 2 ? '#fff1d8' : '#5f9b7a'}" stroke="#56705f" stroke-width="2"/>`;
  result += '<path d="M44 296h352v8H44Z" fill="#4c7d63" stroke="#56705f" stroke-width="2"/>';
  const sign = `<rect x="170" y="${top - 52}" width="100" height="40" rx="10" fill="#fff9dd" stroke="#56705f" stroke-width="2.5"/>`;
  const basket = `<path d="M196 ${top - 30}h48l-6 14h-36Z" fill="#d9a05b" stroke="#7a5a44" stroke-width="2"/><path d="M204 ${top - 30}q16-16 32 0" fill="none" stroke="#7a5a44" stroke-width="2"/>`;
  const fruit = `<circle cx="212" cy="${top - 33}" r="6" fill="#e8735a" stroke="#7a5a44" stroke-width="1.5"/><circle cx="226" cy="${top - 35}" r="6" fill="#f2b630" stroke="#7a5a44" stroke-width="1.5"/><path d="M234 ${top - 40}l10 4-10 4Z" fill="#ef8f3a" stroke="#7a5a44" stroke-width="1.5"/>`;
  return result + sign + fruit + basket;
}
