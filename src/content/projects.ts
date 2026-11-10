import type { PieceKind, RoomTemplate } from '../domain/types';
export const projects: { id: string; title: string; description: string; rooms: RoomTemplate[]; pieces: PieceKind[] }[] = [
  { id: 'band', title: 'Apartamento da banda', description: 'Um lugar para criar músicas, experimentar figurinos e descansar depois do show.', rooms: ['studio', 'bedroom'], pieces: ['speaker', 'mirror', 'bed'] },
  { id: 'cafe', title: 'Café com gatos', description: 'Imagine o cardápio, organize as mesas e reserve um canto para os gatos.', rooms: ['kitchen', 'garden'], pieces: ['counter', 'table', 'cat-bed'] },
  { id: 'sleepover', title: 'Noite entre amigos', description: 'Crie um quarto de hóspedes e prepare um espaço para conversar até tarde.', rooms: ['bedroom'], pieces: ['bed', 'sofa', 'cushion'] },
];
export const templates: Record<RoomTemplate, { name: string; icon: string }> = {
  classroom: { name: 'Sala de aula', icon: '▤' }, sportsfield: { name: 'Campo', icon: '◉' }, gym: { name: 'Ginásio', icon: '◉' },
  reception: { name: 'Recepção', icon: '◇' },
  consultation: { name: 'Consultório', icon: '◇' },
  ward: { name: 'Enfermaria', icon: '◇' },
  dispatch: { name: 'Central de atendimento', icon: '◇' },
  investigation: { name: 'Achados e perdidos', icon: '◇' },
  office: { name: 'Escritório', icon: '◇' },
  meeting: { name: 'Sala de reunião', icon: '◇' },
  breakroom: { name: 'Copa', icon: '◇' },
  playground: { name: 'Quintal de brincadeiras', icon: '◇' },
  laundry: { name: 'Lavanderia', icon: '◉' }, library: { name: 'Biblioteca', icon: '▤' }, dining: { name: 'Sala de jantar', icon: '◒' },
  empty: { name: 'Livre', icon: '◇' }, bedroom: { name: 'Quarto', icon: '☾' }, kitchen: { name: 'Cozinha', icon: '◒' },
  bathroom: { name: 'Banheiro', icon: '≋' }, studio: { name: 'Estúdio', icon: '♫' }, garden: { name: 'Jardim', icon: '✳' },
};
