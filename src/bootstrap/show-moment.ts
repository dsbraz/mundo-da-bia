/** How long a show lasts once the microphone, the stage or the piano starts it. */
export const showMs = 12_000;
/** A one-shot timer: runs `fn` after `ms` and returns how to cancel it. */
export type Timer = (ms: number, fn: () => void) => () => void;
/** The show is a moment, not a state: `sync` it with `World.show`; it calls `end` `showMs` after the show began, unless it ended first. */
export function showMoment(after: Timer, end: () => void) {
  let cancel: (() => void) | null = null;
  return (on: boolean) => {
    if (on && !cancel) cancel = after(showMs, () => { cancel = null; end(); });
    if (!on && cancel) { cancel(); cancel = null; }
  };
}
