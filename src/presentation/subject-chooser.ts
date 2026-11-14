import { subjects, type Subject } from '../domain/school';
import { schoolText } from '../content/school';
import { glyphGap, glyphStrokes, glyphWidth } from './chalk-font';

/** Chalk strokes of `text`, `height` tall, centred at `cx` from `top`, as SVG path data. */
function chalk(text: string, height: number, cx: number, top: number): string {
  const width = glyphWidth(height), gap = glyphGap(height), start = cx - (text.length * width + (text.length - 1) * gap) / 2;
  return [...text].flatMap((char, n) => glyphStrokes(char, { x: start + n * (width + gap), y: top }, height))
    .map(s => s.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('')).join('');
}
const white = (d: string) => `<path d="${d}" fill="none" stroke="#fffdf7" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
/** What each button shows, on a little board: a flower in coloured chalk with a crayon, the letters A B C, or 1 + 2 with abacus beads. */
const pictures: Record<Subject, string> = {
  desenho: '<path d="M60 76V46" stroke="#9fd18b" stroke-width="4"/><path d="M60 66q-12-8-17-2 7 7 17 2Z" fill="#79a78a" stroke="#fffdf7" stroke-width="2"/>'
    + [[60, 26], [70, 33], [66, 45], [54, 45], [50, 33]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="#df7987" stroke="#fffdf7" stroke-width="2"/>`).join('')
    + '<circle cx="60" cy="37" r="6" fill="#f2b630" stroke="#fffdf7" stroke-width="2"/><path d="M78 80l18-22 5 4-18 22Z" fill="#e8735a" stroke="#7a5a44" stroke-width="2" stroke-linejoin="round"/><path d="M78 80l-2 6 6-2Z" fill="#f3c5a8" stroke="#7a5a44" stroke-width="1.5"/>',
  escrita: white(chalk('ABC', 40, 60, 24)),
  matematica: white(chalk('1+2', 32, 60, 18)) + '<path d="M28 70h64" stroke="#c9925f" stroke-width="3"/>'
    + ['#e8735a', '#f2b630', '#8db7d1'].map((c, i) => `<circle cx="${48 + i * 12}" cy="70" r="5.5" fill="${c}" stroke="#fffdf7" stroke-width="1.5"/>`).join(''),
};
const board = (inside: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96" aria-hidden="true"><rect x="3" y="3" width="114" height="90" rx="9" fill="#c9925f" stroke="#7a5a44" stroke-width="2.5"/><rect x="10" y="10" width="100" height="76" rx="5" fill="#4d7a64"/>${inside}</svg>`;
/** The lesson's subject (lot 8D): three big buttons, each a little board showing what will be written, nothing to read. Callbacks only. */
export function subjectChooser(root: HTMLElement, actions: { choose: (subject: Subject) => void }) {
  const panel = document.createElement('section'); panel.id = 'subject-chooser'; panel.hidden = true;
  panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', schoolText.chooser);
  const choices = document.createElement('div'); choices.className = 'subject-choices';
  choices.append(...subjects.map(subject => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'subject-choice'; button.dataset.subject = subject;
    button.setAttribute('aria-label', schoolText.subjects[subject]); button.innerHTML = board(pictures[subject]);
    button.addEventListener('click', () => { hide(); actions.choose(subject); });
    return button;
  }));
  const close = document.createElement('button'); close.type = 'button'; close.className = 'subject-close illustrated'; close.setAttribute('aria-label', schoolText.close);
  close.style.setProperty('--button-icon', "url('/icons/ui-close.svg')"); close.addEventListener('click', hide);
  panel.append(choices, close); root.append(panel);
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  function hide() { panel.hidden = true; }
  return {
    /** Shows the three subjects; `focus` (from the keyboard) puts the focus on the first. */
    open(focus = false) { panel.hidden = false; if (focus) choices.querySelector('button')?.focus({ preventScroll: true }); },
    close: hide, isOpen: () => !panel.hidden,
  };
}
