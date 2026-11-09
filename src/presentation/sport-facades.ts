import { facadeRect as rect, facadeWindow as window } from './facade-parts';
export function stadiumFacade(floors: number) {
  const rise = (floors - 1) * 24;
  let seating = '';
  for (let row = 0; row < floors + 2; row++) seating += `<path d="M${47 + row * 8} ${247 - rise + row * 20}Q220 ${154 - rise + row * 20} ${393 - row * 8} ${247 - rise + row * 20}" fill="none" stroke="${row % 2 ? '#b9cbbb' : '#799c9b'}" stroke-width="14"/>`;
  let lights = '';
  for (const x of [52, 363]) lights += `<path d="M${x + 12} 230V70" stroke="#7d8d8b" stroke-width="7"/>${rect(x - 12, 51, 50, 28, '#bccac1')}${rect(x - 6, 57, 14, 16, '#f7e8ae')}${rect(x + 16, 57, 14, 16, '#f7e8ae')}`;
  return lights + `<ellipse cx="220" cy="${300 - rise / 2}" rx="199" ry="${139 + rise / 2}" fill="#c5cfb9" stroke="#778e85" stroke-width="3"/>` + seating
    + `<ellipse cx="220" cy="304" rx="139" ry="70" fill="#86ad80" stroke="#e4ead2" stroke-width="4"/><ellipse cx="220" cy="304" rx="29" ry="16" fill="none" stroke="#e4ead2" stroke-width="2"/><path d="M220 237v137" stroke="#e4ead2" stroke-width="2"/>`
    + `<path d="M22 328q198 89 396 0v103q-198 36-396 0Z" fill="#b9c4b5" stroke="#778e85" stroke-width="2"/><path d="M35 355q185 65 370 0" fill="none" stroke="#829f98" stroke-width="12"/>`
    + rect(142, 180, 156, 265, '#d6dfcd', 28) + rect(97, 172, 246, 35, '#f4eccf')
    + rect(163, 104 - rise, 114, 49, '#526d68', 3) + `<text x="220" y="${136 - rise}" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#f6e4a4">0 : 0</text>`;
}
export function clubFacade(floors: number) {
  const top = 213 - (floors - 1) * 38;
  let windows = '';
  for (let level = 0; level < floors; level++) windows += window(43, [285, 245, 213][level]!, 89, level === 2 ? 23 : 31) + window(308, [285, 245, 213][level]!, 89, level === 2 ? 23 : 31);
  return rect(25, top, 390, 445 - top, '#dfd6b6')
    + `<path d="M13 ${top + 4}Q220 ${top - 172} 427 ${top + 4}l-8 21Q220 ${top - 126} 21 ${top + 25}Z" fill="#6b9b91" stroke="#557d75" stroke-width="3"/><path d="M49 ${top - 2}Q220 ${top - 124} 391 ${top - 2}" fill="none" stroke="#a9c5b0" stroke-width="5"/>`
    + windows + window(44, 342, 87, 70) + window(309, 342, 87, 70)
    + rect(147, 156, 146, 289, '#ece6ce') + rect(85, 167, 270, 36, '#f5efd5')
    + `<circle cx="220" cy="129" r="24" fill="#d4b17b" stroke="#7a886f" stroke-width="2"/><path d="M197 129h46m-23-24v48m-18-40q35 17 0 34m36-34q-35 17 0 34" fill="none" stroke="#7a886f" stroke-width="2"/>`
    + `<path d="M30 432h104m172 0h104" stroke="#8ba784" stroke-width="17"/>`;
}
