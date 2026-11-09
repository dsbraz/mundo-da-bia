import { facadeRect as rect, facadeWindow as window } from './facade-parts';

export function hospitalFacade(floors: number) {
  const top = 174 - (floors - 1) * 64;
  const towerTop = Math.min(top - 34, 100);
  let wings = '';
  for (let level = 0; level < floors; level++) wings += window(51, [232, 114, 50][level]!, 73, 40) + window(316, [232, 114, 50][level]!, 73, 40);
  return rect(34, top, 372, 445 - top, '#f0f2e9', 6) + rect(29, top - 9, 382, 14, '#81afa8')
    + wings + rect(40, 298, 98, 141, '#d1e1da') + rect(302, 298, 98, 141, '#d1e1da')
    + window(52, 314, 74, 78) + window(314, 314, 74, 78)
    + rect(141, towerTop, 158, 445 - towerTop, '#f8f7ee', 5)
    + rect(177, towerTop + 10, 86, 60, '#729f98', 10)
    + `<path d="M210 ${towerTop + 21}h20v14h14v20h-14v14h-20V${towerTop + 55}h-14V${towerTop + 35}h14Z" fill="#f6f4df"/>`
    + rect(87, 170, 266, 36, '#edf2e5')
    + `<path d="M139 211h162l20 31H119Z" fill="#8ebbb4" stroke="#65877e" stroke-width="2"/><path d="M122 242h196" stroke="#547c73" stroke-width="7"/>`
    + rect(41, 421, 85, 24, '#b9c9b1') + rect(314, 421, 85, 24, '#b9c9b1');
}
export function policeFacade(floors: number) {
  const top = 172 - (floors - 1) * 45;
  let windows = '';
  for (let level = 0; level < floors; level++) windows += window(79, [269, 211, 111][level]!, 50, 39) + window(311, [269, 211, 111][level]!, 50, 39);
  return rect(56, top, 328, 445 - top, '#d2d8dd') + rect(47, top - 12, 346, 15, '#6c7f96')
    + `<path d="M43 ${top - 11}L220 ${top - 73}l177 62Z" fill="#6b7f92" stroke="#526879" stroke-width="2"/><path d="M74 ${top - 10}l146-49 146 49" fill="none" stroke="#a9b7bd" stroke-width="3"/>`
    + windows + rect(142, 159, 156, 286, '#e6e4d7') + rect(82, 171, 276, 34, '#f1ecd8')
    + rect(137, 208, 15, 237, '#98a7ae') + rect(288, 208, 15, 237, '#98a7ae')
    + `<path d="M201 103h38v23q0 18-19 27-19-9-19-27Z" fill="#dac28b" stroke="#8c7e61" stroke-width="2"/><path d="m220 112 4 8 9 1-7 6 2 10-8-5-8 5 2-10-7-6 9-1Z" fill="#647b93"/>`
    + window(77, 330, 54, 75) + window(309, 330, 54, 75) + rect(49, 432, 342, 13, '#b4b9b3');
}
export function officeFacade(floors: number) {
  const top = 150 - (floors - 1) * 55;
  let grid = '';
  for (let x = 87; x < 370; x += 66) grid += `<path d="M${x} ${top + 12}V435" stroke="#8daba9" stroke-width="5"/>`;
  for (let y = top + 55; y < 430; y += 55) grid += `<path d="M72 ${y}h298" stroke="#829f9e" stroke-width="5"/>`;
  return rect(65, top, 312, 445 - top, '#647d7b', 2) + rect(76, top + 12, 290, 422 - top, 'url(#glass)', 0)
    + `<path d="M76 ${top + 12}h95L76 390Zm112 0h50L105 434H76Z" fill="#ecf7ec" opacity=".27"/>` + grid
    + rect(58, top - 14, 326, 14, '#485f61', 1) + rect(308, top - 31, 46, 17, '#9caeab', 1)
    + rect(99, 173, 242, 34, '#e8ebe1') + rect(150, 210, 140, 235, '#526d6b', 1)
    + `<path d="M140 211h160l27 20H123Z" fill="#d2dfd8" stroke="#6e8680" stroke-width="2"/>`
    + rect(63, 432, 314, 13, '#9fa9a1', 1);
}
export function fireFacade(floors: number) {
  const top = 168 - (floors - 1) * 51;
  let windows = '';
  for (let level = 1; level < floors; level++) windows += window(80, 171 - level * 51, 68, 31) + window(290, 171 - level * 51, 68, 31);
  let slats = ''; for (let y = 303; y < 431; y += 16) slats += `<path d="M48 ${y}h107m130 0h107" stroke="#96574b" stroke-width="2"/>`;
  return rect(35, top, 370, 445 - top, '#b66d59') + windows
    + rect(28, top - 12, 384, 15, '#8e4c43') + rect(57, top - 27, 40, 15, '#dfc6a5')
    + rect(41, 282, 119, 158, '#d5a184', 8) + rect(280, 282, 119, 158, '#d5a184', 8) + slats
    + rect(148, 157, 144, 288, '#e5c9a4') + rect(83, 170, 274, 36, '#f2dfbd')
    + `<path d="M197 141q-12-20 5-33l5-18 14 20 13-11q13 18 9 29-3 20-23 22-15 0-23-9Z" fill="#e9b763" stroke="#9e6348" stroke-width="2"/><path d="M211 140q-6-12 9-24 17 17 7 26Z" fill="#f6df9b"/>`
    + window(54, 249, 94, 24) + window(292, 249, 94, 24) + rect(30, 432, 380, 13, '#ac9b87');
}
export function schoolFacade(floors: number) {
  const top = 170 - (floors - 1) * 51;
  let windows = ''; for (let level = 0; level < floors; level++) windows += window(53, [290, 235, 110][level]!, 75, 39) + window(312, [290, 235, 110][level]!, 75, 39);
  return rect(31, top, 378, 445 - top, '#e8ce93') + windows
    + `<path d="M18 ${top}l28-29h348l28 29Z" fill="#a06f57" stroke="#795e4b" stroke-width="2"/>`
    + rect(142, 121, 156, 324, '#f0dfb3')
    + `<path d="M127 125l93-67 93 67Z" fill="#8a9d8b" stroke="#6c7e6f" stroke-width="2"/><path d="M220 59V16m0 0h44l-13 12 13 12h-44" fill="#ddaf6d" stroke="#796e59" stroke-width="2"/>`
    + `<circle cx="220" cy="132" r="23" fill="#fff5d8" stroke="#93846a" stroke-width="3"/><path d="M220 116v17l12 7" stroke="#6f796b" stroke-width="3" fill="none"/>`
    + rect(80, 167, 280, 36, '#fbefcc') + window(53, 355, 75, 55) + window(312, 355, 75, 55)
    + `<path d="M33 425h96m181 0h96" stroke="#91a280" stroke-width="16"/>`;
}
