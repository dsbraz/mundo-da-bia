import type { NavigationActions } from './navigation';
interface Actions extends NavigationActions {
  street: () => boolean; camera: () => number; setCamera: (x: number) => void; maximum: () => number;
}
interface Wheel { deltaX: number; deltaY: number; deltaMode: number; ctrlKey: boolean; metaKey: boolean }
export function wheelNavigation(actions: Actions) {
  let active: { delta: number; camera: number; street: boolean } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function cancel() {
    clearTimeout(timer);
    const previous = active; active = null;
    if (previous?.street) actions.setCamera(previous.camera);
    else if (previous) actions.preview(null, 0);
  }
  function finish() {
    const previous = active; active = null;
    if (!previous || previous.street) return;
    const room = actions.neighbor(previous.delta > 0 ? 'right' : 'left');
    actions.preview(null, 0);
    if (room && Math.abs(previous.delta) >= actions.width() / 4) actions.visit(room);
  }
  return {
    wheel(event: Wheel) {
      if (!horizontal(event)) return false;
      active ??= { delta: 0, camera: actions.camera(), street: actions.street() };
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? actions.width() : 1;
      active.delta += event.deltaX * unit;
      if (active.street) actions.setCamera(Math.max(0, Math.min(actions.maximum(), active.camera + active.delta * 1000 / actions.width())));
      else {
        const room = actions.neighbor(active.delta > 0 ? 'right' : 'left');
        actions.preview(room ?? null, room ? Math.max(-1, Math.min(1, -active.delta / actions.width())) : 0);
      }
      clearTimeout(timer); timer = setTimeout(finish, 200); return true;
    }, cancel,
  };
}

function horizontal(event: Wheel) { return !event.ctrlKey && !event.metaKey && Number.isFinite(event.deltaX) && Math.abs(event.deltaX) > Math.abs(event.deltaY); }
