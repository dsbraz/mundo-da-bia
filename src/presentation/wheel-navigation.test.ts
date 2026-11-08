import { afterEach, describe, expect, it, vi } from 'vitest';
import { wheelNavigation } from './wheel-navigation';
function setup(street = false) {
  const visit = vi.fn(), preview = vi.fn(), set = vi.fn();
  const input = wheelNavigation({ width: () => 800, neighbor: () => 'quarto', visit, preview,
    street: () => street, camera: () => 100, setCamera: set, maximum: () => 700 });
  return { input, visit, preview, set };
}
const event = (deltaX: number, deltaY = 0, deltaMode = 0, ctrlKey = false) => ({ deltaX, deltaY, deltaMode, ctrlKey, metaKey: false });
afterEach(() => vi.useRealTimers());
describe('horizontal trackpad sequences', () => {
  it('previews and commits once after 200ms of inactivity, including inertia', () => {
    vi.useFakeTimers(); const s = setup();
    expect(s.input.wheel(event(120))).toBe(true);
    expect(s.preview).toHaveBeenLastCalledWith('quarto', -.15);
    s.input.wheel(event(120)); vi.advanceTimersByTime(150); s.input.wheel(event(600));
    expect(s.visit).not.toHaveBeenCalled(); vi.advanceTimersByTime(200);
    expect(s.visit).toHaveBeenCalledExactlyOnceWith('quarto');
  });
  it('returns below threshold and cancels without visiting', () => {
    vi.useFakeTimers(); const s = setup(); s.input.wheel(event(199)); vi.advanceTimersByTime(200);
    expect(s.visit).not.toHaveBeenCalled(); expect(s.preview).toHaveBeenLastCalledWith(null, 0);
    s.input.wheel(event(300)); s.input.cancel(); vi.advanceTimersByTime(200); expect(s.visit).not.toHaveBeenCalled();
  });
  it('normalizes lines and pages and accepts the exact quarter-width threshold', () => {
    vi.useFakeTimers(); const s = setup(); s.input.wheel(event(12.5, 0, 1)); vi.advanceTimersByTime(200);
    s.input.wheel(event(-.25, 0, 2)); vi.advanceTimersByTime(200); expect(s.visit).toHaveBeenCalledTimes(2);
  });
  it('leaves zoom, vertical and invalid input to the browser', () => {
    const s = setup();
    for (const e of [event(100, 0, 0, true), event(10, 20), event(0), event(NaN), { ...event(100), metaKey: true }]) expect(s.input.wheel(e)).toBe(false);
    expect(s.preview).not.toHaveBeenCalled();
  });
  it('pans the street continuously with limits and rolls back cancellation', () => {
    const s = setup(true); s.input.wheel(event(160)); expect(s.set).toHaveBeenLastCalledWith(300);
    s.input.wheel(event(800)); expect(s.set).toHaveBeenLastCalledWith(700);
    s.input.cancel(); expect(s.set).toHaveBeenLastCalledWith(100);
  });
  it('does not visit beyond the last room', () => {
    vi.useFakeTimers(); const visit = vi.fn();
    const input = wheelNavigation({ width: () => 800, neighbor: () => undefined, preview: vi.fn(), visit, street: () => false, camera: () => 0, setCamera: vi.fn(), maximum: () => 0 });
    input.wheel(event(800)); vi.advanceTimersByTime(200); expect(visit).not.toHaveBeenCalled();
  });
});
