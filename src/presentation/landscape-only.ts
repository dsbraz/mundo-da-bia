/** W3L-03b: landscape only. Standing up, the game is inert under the "turn the tablet" drawing (landscape-only.css); turned back, it
 *  plays on with nothing lost. Where the browser allows it (installed or fullscreen) the screen is also locked lying down. */
export function landscapeOnly(game: HTMLElement, media: Pick<MediaQueryList, 'matches' | 'addEventListener'> = window.matchMedia('(orientation: portrait)')) {
  const apply = () => { game.inert = media.matches; };
  apply(); media.addEventListener('change', apply);
  const orientation = globalThis.screen?.orientation as (ScreenOrientation & { lock?: (value: 'landscape') => Promise<void> }) | undefined;
  void orientation?.lock?.('landscape').catch(() => {});
}
