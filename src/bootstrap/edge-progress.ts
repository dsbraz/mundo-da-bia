export function edgeProgress(root: HTMLElement) {
  return (value: number, side?: string) => {
    const indicator = root.querySelector<HTMLElement>('#edge-progress')!;
    indicator.hidden = value === 0; if (side) indicator.dataset.side = side;
    indicator.style.setProperty('--progress', `${value * 100}%`); indicator.setAttribute('aria-valuenow', String(Math.round(value * 100)));
  };
}
