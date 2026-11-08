export function houseEdgePan(root: HTMLElement, pan: (dx: number) => void, preview: (e: PointerEvent) => void) {
  let pointer: PointerEvent | null = null, timer: ReturnType<typeof setInterval> | undefined;
  function direction(e: PointerEvent) {
    if (e.clientY < 0 || e.clientY > root.clientHeight || e.clientX < 0 || e.clientX > root.clientWidth) return 0;
    return e.clientX < 40 ? -1 : e.clientX > root.clientWidth - 40 ? 1 : 0;
  }
  return (next: PointerEvent | null) => {
    pointer = next;
    if (!pointer || !direction(pointer)) { clearInterval(timer); timer = undefined; return; }
    timer ??= setInterval(() => { if (pointer) { pan(direction(pointer) * 8); preview(pointer); } }, 16);
  };
}
