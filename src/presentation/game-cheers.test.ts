import { describe, expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { startGame } from '../domain/child-games';
import type { ChildGame } from '../domain/child-games';
import { gameReactions, spectatorAt } from './game-cheers';

const world = () => { const w = initialWorld(); w.actors = w.actors.map((a, i) => ({ ...a, x: 150 + i * 120, y: 530, seat: null })); return w; };
const rope = (feedback: ChildGame['feedback']): ChildGame => ({ ...startGame('rope', 0), feedback });
const hop = (step: number): ChildGame => ({ ...startGame('hopscotch', 0), step });

describe('torcida na brincadeira', () => {
  it('um toque num espectador é dele; no jogador ou no chão vazio, de ninguém', () => {
    const w = world(), luna = w.actors.find(a => a.id === 'luna')!;
    expect(spectatorAt(w, 'bia', { x: luna.x, y: luna.y - 80 })).toBe('luna');
    const bia = w.actors.find(a => a.id === 'bia')!;
    expect(spectatorAt(w, 'bia', { x: bia.x, y: bia.y - 80 })).toBeUndefined();
    expect(spectatorAt(w, 'bia', { x: 990, y: 300 })).toBeUndefined();
    expect(spectatorAt({ ...w, actors: w.actors.map(a => a.id === 'luna' ? { ...a, room: 'quarto' } : a) }, 'bia', { x: luna.x, y: luna.y - 80 })).toBeUndefined();
  });
  it('errar a corda faz uma careta engraçada, sem a palavra erro', () => {
    expect(gameReactions(rope('ready'), rope('again'), 'Bia')).toEqual([{ who: 'player', pose: 'goof', line: 'Ops! Quase, Bia!' }]);
    expect(gameReactions(rope('ready'), rope('jump'), 'Bia')).toEqual([]);
    expect(gameReactions(rope('again'), rope('again'), 'Bia')).toEqual([{ who: 'player', pose: 'goof', line: 'Ops! Quase, Bia!' }]);
  });
  it('terminar a amarelinha: braços para cima e a torcida bate palmas, chamando quem jogou pelo nome', () => {
    expect(gameReactions(hop(10), hop(11), 'Sol')).toEqual([{ who: 'player', pose: 'cheer', line: 'Uhuu, Sol! Ida e volta!' }, { who: 'spectators', pose: 'clap', line: 'Vai, Sol!' }]);
    expect(gameReactions(hop(3), hop(4), 'Sol')).toEqual([]);
  });
  it('as falas têm até 6 palavras e nenhum número', () => {
    for (const r of [...gameReactions(hop(10), hop(11), 'Bia'), ...gameReactions(rope('ready'), rope('again'), 'Bia')]) {
      expect(r.line.split(/\s+/).length).toBeLessThanOrEqual(6); expect(r.line).not.toMatch(/\d|erro/i);
    }
  });
});
