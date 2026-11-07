import type { PresentationEvent } from '../domain/types';

export function createSound(button: HTMLButtonElement) {
  let context: AudioContext | undefined;
  let enabled = false;
  button.addEventListener('click', () => {
    enabled = !enabled;
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Desativar sons' : 'Ativar sons');
    button.textContent = enabled ? 'Som ligado' : 'Som desligado';
    if (enabled) { context ??= new AudioContext(); void context.resume().catch(() => {}); }
  });
  return (events: PresentationEvent[]) => {
    if (!enabled || !context || !events.length || events[0]?.type === 'moved') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(events[0]?.type === 'fed' ? 660 : 440, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.045, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.23);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  };
}
