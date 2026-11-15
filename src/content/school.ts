import type { Subject } from '../domain/school';

/** Names for screen readers only: the lesson's subject is chosen by picture (lot 8D). */
export const schoolText = {
  chooser: 'O que a professora vai escrever no quadro?', close: 'Fechar',
  subjects: { desenho: 'Desenho', escrita: 'Escrita', matematica: 'Matemática' } satisfies Record<Subject, string>,
};
