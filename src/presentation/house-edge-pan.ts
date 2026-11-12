type Pointer = Pick<PointerEvent, 'clientX' | 'clientY'>;
/** While the pointer rests within 40 px of `root`'s left or right side, `pan` moves 8 px toward it every 16 ms and `preview` redraws at the
 *  same pointer; null (or leaving the band) stops. */
export function houseEdgePan<P extends Pointer>(root: HTMLElement, pan: (dx: number) => void, preview: (e: P) => void) {
  let pointer: P | null = null, timer: ReturnType<typeof setInterval> | undefined;
  function direction(e: Pointer) {
    const box = root.getBoundingClientRect(), x = e.clientX - box.left, y = e.clientY - box.top;
    if (y < 0 || y > box.height || x < 0 || x > box.width) return 0;
    return x < 40 ? -1 : x > box.width - 40 ? 1 : 0;
  }
  return (next: P | null) => {
    pointer = next;
    if (!pointer || !direction(pointer)) { clearInterval(timer); timer = undefined; return; }
    timer ??= setInterval(() => { if (pointer) { pan(direction(pointer) * 8); preview(pointer); } }, 16);
  };
}
