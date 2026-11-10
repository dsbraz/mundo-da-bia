/** A grown-up gesture: the action only runs after holding the button (finger, mouse, Enter or Space) for the whole duration. */
export function grownUpGate(button: HTMLButtonElement, run: () => void, duration = 2000) {
  let started = 0, frame = 0;
  button.classList.add('grown-up-gate'); button.dataset.holding = 'false';
  const paint = (progress: number) => button.style.setProperty('--hold', `${Math.round(progress * 360)}deg`);
  function stop() { cancelAnimationFrame(frame); started = 0; button.dataset.holding = 'false'; paint(0); }
  function tick() {
    const progress = Math.min(1, (performance.now() - started) / duration); paint(progress);
    if (progress < 1) { frame = requestAnimationFrame(tick); return; }
    stop(); run();
  }
  function start() { if (started || button.disabled) return; started = performance.now(); button.dataset.holding = 'true'; frame = requestAnimationFrame(tick); }
  button.addEventListener('pointerdown', event => { event.preventDefault(); start(); });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel', 'blur'] as const) button.addEventListener(type, stop);
  button.addEventListener('keydown', event => { if (event.key !== 'Enter' && event.key !== ' ') return; event.preventDefault(); start(); });
  button.addEventListener('keyup', stop);
  button.addEventListener('click', event => event.preventDefault());
  return stop;
}

/** A short-lived notice with an undo button, for 10 s after something destructive. */
export function undoToast(root: HTMLElement, message: string, undo: () => void, duration = 10000) {
  document.querySelector('#undo-toast')?.remove();
  const toast = document.createElement('div'); toast.id = 'undo-toast'; toast.setAttribute('role', 'status');
  const text = document.createElement('span'); text.textContent = message;
  const action = document.createElement('button'); action.type = 'button'; action.textContent = 'Desfazer';
  action.classList.add('illustrated'); action.style.setProperty('--button-icon', "url('/icons/ui-undo.svg')");
  const timer = setTimeout(() => toast.remove(), duration);
  action.onclick = () => { clearTimeout(timer); toast.remove(); undo(); };
  // An open modal dialog makes the rest of the page inert, so the notice goes inside it.
  const host = Array.from(root.querySelectorAll<HTMLDialogElement>('dialog[open]')).reverse().find(d => d.matches(':modal')) ?? root;
  toast.append(text, action); host.append(toast);
}
