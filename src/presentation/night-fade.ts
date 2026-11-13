/** The night slept through (W3L-15): a night-blue veil over the scene and the action ring (z 9; trays 12 stay above) that closes, holds while the morning comes and opens again. It
 *  never takes a touch. */
export function nightFade(root: HTMLElement) {
  let veil: HTMLElement | null = null;
  function ensure() {
    if (veil?.isConnected) return veil;
    veil = document.createElement('div'); veil.className = 'night-fade'; veil.setAttribute('aria-hidden', 'true');
    Object.assign(veil.style, { position: 'absolute', inset: '0', background: 'radial-gradient(circle at 70% 30%, #2c3a72, #15206a)', opacity: '0', pointerEvents: 'none', zIndex: '10' });
    (root.querySelector('#world') ?? root).append(veil);
    return veil;
  }
  function to(opacity: number, ms: number) {
    const v = ensure(); v.style.transition = `opacity ${ms}ms ease-in-out`;
    requestAnimationFrame(() => { v.style.opacity = String(opacity); });
  }
  return { close: (ms: number) => to(1, ms), open: (ms: number) => to(0, ms) };
}
