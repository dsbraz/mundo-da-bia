import { expect, it } from 'vitest';
import { showMoment, showMs } from './show-moment';

function fakeTimer() {
  let now = 0; const pending: { at: number; fn: () => void }[] = [];
  const after = (ms: number, fn: () => void) => { const t = { at: now + ms, fn }; pending.push(t); return () => { pending.splice(pending.indexOf(t), 1); }; };
  const wait = (ms: number) => { now += ms; pending.filter(t => t.at <= now).forEach(t => { pending.splice(pending.indexOf(t), 1); t.fn(); }); };
  return { after, wait, armed: () => pending.length };
}
it('o show é um momento: acaba sozinho uns 12 s depois de começar', () => {
  const timer = fakeTimer(); let ended = 0;
  const sync = showMoment(timer.after, () => { ended++; });
  expect(showMs).toBe(12_000);
  sync(false); expect(timer.armed()).toBe(0);
  sync(true); sync(true); expect(timer.armed()).toBe(1);
  timer.wait(showMs - 1); expect(ended).toBe(0);
  timer.wait(1); expect(ended).toBe(1);
  sync(true); expect(timer.armed()).toBe(1);
});
it('encerrado antes (palco, piano, microfone solto) não acaba de novo; um show novo conta do zero', () => {
  const timer = fakeTimer(); let ended = 0;
  const sync = showMoment(timer.after, () => { ended++; });
  sync(true); timer.wait(8000); sync(false); sync(false);
  expect(timer.armed()).toBe(0);
  sync(true); timer.wait(8000); expect(ended).toBe(0);
  timer.wait(4000); expect(ended).toBe(1);
});
