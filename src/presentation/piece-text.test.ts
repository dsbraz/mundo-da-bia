import { expect, it } from 'vitest';
import type Phaser from 'phaser';
import { pieceKinds } from '../domain/types';
import type { Piece } from '../domain/types';
import { initialWorld } from '../domain/world';
import { drawPiece } from './piece-art';

/** A scene that records what is added; every object answers any call with itself, so the drawing runs without Phaser. */
function recordingScene() {
  const added: string[] = [];
  const object: object = new Proxy(() => object, { get: (_, key) => key === 'list' ? [] : object, apply: () => object });
  const add = new Proxy({}, { get: (_, kind) => () => { added.push(String(kind)); return object; } });
  return { scene: { add } as unknown as Phaser.Scene, added };
}

it('nenhum móvel, ligado ou desligado, desenha texto na cena: os efeitos são desenhos (W3L-09)', () => {
  const world = initialWorld();
  for (const kind of pieceKinds) for (const active of [false, true]) {
    const { scene, added } = recordingScene();
    const piece: Piece = { id: 99, kind, room: 'sala', x: 100, y: 200, color: 'original', flipped: false, ...(active ? { active } : {}) };
    drawPiece(scene, piece, world, false);
    expect(added, `${kind} ${active}`).not.toContain('text');
  }
});
