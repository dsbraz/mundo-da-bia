import type { CDPSession, Page } from '@playwright/test';
type Screen = { x: number; y: number };
/** A finger on the touchscreen through CDP (real touch pointers, implicit capture), with an optional resting palm. */
export async function finger(page: Page) {
  const session: CDPSession = await page.context().newCDPSession(page);
  const down = new Map<number, Screen>();
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', points = [...down].map(([id, p]) => ({ id, x: p.x, y: p.y }))) =>
    session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  return {
    async down(p: Screen, id = 1) { down.set(id, p); await send('touchStart'); },
    /** Moves `id` to `p` in `steps` events. */
    async move(p: Screen, steps = 8, id = 1) {
      const from = down.get(id)!;
      for (let i = 1; i <= steps; i++) { down.set(id, { x: from.x + (p.x - from.x) * i / steps, y: from.y + (p.y - from.y) * i / steps }); await send('touchMove'); }
    },
    /** Lifts `id`; CDP releases a point by leaving it out of the next event (touchEnd only for the last one). */
    async up(id = 1) { down.delete(id); await (down.size ? send('touchMove') : send('touchEnd', [])); },
    detach: () => session.detach(),
  };
}
/** Drags with one finger from `a` to `b` (screen pixels) and lifts it. */
export async function touchDrag(page: Page, a: Screen, b: Screen, steps = 8) {
  const f = await finger(page);
  await f.down(a); await f.move({ x: a.x + (b.x > a.x ? 12 : -12), y: a.y }, 2); await f.move(b, steps); await f.up(); await f.detach();
}
