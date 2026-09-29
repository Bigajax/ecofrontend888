import type { Suggestion } from '../components/QuickSuggestions';

export const FEEDBACK_KEY = 'eco_feedback_given';
export const SESSION_STORAGE_KEY = 'eco.session';

export const ROTATING_ITEMS: Suggestion[] = [
  {
    id: 'rot_presenca_scan',
    icon: '🌬️',
    label: 'Vamos fazer um mini-scan de presença agora?',
    modules: ['eco_observador_presente', 'eco_presenca_silenciosa', 'eco_corpo_emocao'],
    systemHint:
      'Conduza um body scan curto (2–3 minutos), com foco gentil em respiração, pontos de contato e 1 pensamento.',
  },
  {
    id: 'rot_kahneman_check',
    icon: '🧩',
    label: 'Quero checar se caí em algum atalho mental hoje',
    modules: ['eco_heuristica_ancoragem', 'eco_heuristica_disponibilidade', 'eco_heuristica_excesso_confianca'],
    systemHint:
      'Explique heurísticas em linguagem simples, faça 1 pergunta diagnóstica e proponha 1 reframe prático.',
  },
  {
    id: 'rot_vulnerabilidade',
    icon: '💗',
    label: 'Posso explorar coragem & vulnerabilidade em 1 situação',
    modules: ['eco_vulnerabilidade_defesas', 'eco_vulnerabilidade_mitos', 'eco_emo_vergonha_combate'],
    systemHint:
      'Brené Brown: diferencie vulnerabilidade de exposição. Nomeie 1 defesa ativa e proponha 1 micro-ato de coragem.',
  },
  {
    id: 'rot_estoico',
    icon: '🏛️',
    label: 'O que está sob meu controle hoje?',
    modules: ['eco_presenca_racional', 'eco_identificacao_mente', 'eco_fim_do_sofrimento'],
    systemHint:
      'Marco Aurélio: conduza 3 perguntas (controle / julgamento / ação mínima) e feche com 1 compromisso simples.',
  },
  {
    id: 'rot_regressao_media',
    icon: '📉',
    label: 'Talvez ontem foi exceção: quero revisar expectativas',
    modules: ['eco_heuristica_regressao_media', 'eco_heuristica_certeza_emocional'],
    systemHint:
      'Explique regressão à média e convide a recalibrar expectativas com 1 evidência observável para hoje.',
  },
];

export const OPENING_VARIATIONS = [
  'O que está vivo em você agora?',
  'Quer explorar algum pensamento ou emoção?',
  'Vamos começar de onde você quiser.',
  'Um passo de cada vez: por onde vamos?',
];
