import { expect, type Page } from '@playwright/test';
/** Plays `minutes` of session in Brincar with the fake clock, one 30 s tick at a time (a single jump would count as one minute: the
 *  needs' `live` caps its step at 60 s). Expects `page.clock.install` before the page opened. */
export async function playMinutes(page: Page, minutes: number) {
  const app = page.locator('#app');
  for (let n = 0; n < minutes * 2; n++) {
    const before = Number(await app.getAttribute('data-ticks') ?? 0);
    await page.clock.fastForward(30_000);
    await expect(app).toHaveAttribute('data-ticks', String(before + 1));
  }
}
/** Plays 30 s ticks until `done` (at most `minutes`), then asserts it: for thresholds that fall on a tick, whatever the page load took. */
export async function playUntilTrue(page: Page, done: () => Promise<boolean>, minutes: number) {
  for (let n = 0; n < minutes * 2 && !await done(); n++) await playMinutes(page, .5);
  expect(await done()).toBe(true);
}
/** WCAG contrast ratio of two sRGB colors. */
export function contrast(a: readonly number[], b: readonly number[]) {
  const lum = (c: readonly number[]) => {
    const [r, g, bl] = c.map(v => { const s = v / 255; return s <= .03928 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; });
    return .2126 * r! + .7152 * g! + .0722 * bl!;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + .05) / (y! + .05);
}
/** The pixels (RGB) of a screenshot clip, read in the page. */
export async function pixels(page: Page, clip: { x: number; y: number; width: number; height: number }): Promise<number[][]> {
  const png = (await page.screenshot({ clip })).toString('base64');
  return page.evaluate(async source => {
    const image = new Image(); image.src = `data:image/png;base64,${source}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const g = canvas.getContext('2d')!; g.drawImage(image, 0, 0); const d = g.getImageData(0, 0, canvas.width, canvas.height).data;
    const out: number[][] = []; for (let i = 0; i < d.length; i += 4) out.push([d[i]!, d[i + 1]!, d[i + 2]!]); return out;
  }, png);
}
export const luminance = (c: readonly number[]) => .2126 * c[0]! + .7152 * c[1]! + .0722 * c[2]!;
