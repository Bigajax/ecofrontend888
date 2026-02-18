/**
 * Copy Centralizada para Conversão Guest → Authenticated
 *
 * Este arquivo contém toda a linguagem filosófica e identitária
 * para os diferentes contextos de conversão no ECOTOPIA.
 *
 * Filosofia: Substituir linguagem transacional por identitária.
 * - ❌ "Crie conta para continuar"
 * - ✅ "Continue esta conversa amanhã"
 */

/**
 * Contextos de conversão disponíveis
 */
export type ConversionContext =
  | 'chat_soft_prompt'      // Soft prompt após 6-7 turnos
  | 'chat_hard_limit'       // Hard limit após 8-10 turnos
  | 'chat_daily_limit'      // FREE: Limite diário de mensagens (10)
  | 'chat_soft_limit'       // FREE: Aproximando do limite (8)
  | 'chat_essentials_limit' // ESSENTIALS: Limite de 100 mensagens/dia
  | 'chat_vulnerability'    // Usuário expressou vulnerabilidade
  | 'chat_deep_engagement'  // Mensagens longas e profundas
  | 'reflection_teaser'     // Fade em reflexão estoica
  | 'reflection_multiple'   // Visualizou 3+ reflexões
  | 'reflection_deep_scroll'// Scroll profundo em reflexão
  | 'reflection_archive_locked' // FREE: Tentou acessar arquivo completo
  | 'reflection_month_fevereiro' // FREE: Tentou acessar PAIXÕES E EMOÇÕES
  | 'reflection_month_dezembro'  // FREE: Tentou acessar MEDITAÇÃO SOBRE MORTALIDADE
  | 'meditation_time_limit' // Limite de 2 minutos atingido
  | 'meditation_complete'   // Completou preview de meditação
  | 'meditation_favorite'   // Tentou favoritar meditação
  | 'meditation_premium_locked' // ESSENTIALS: Tentou acessar meditação premium
  | 'meditation_library_banner' // Clicou no banner da biblioteca de meditações
  | 'meditation_library_footer' // Clicou no botão do footer da biblioteca
  | 'rings_day_complete'    // Completou dia do Five Rings
  | 'rings_gate'            // Gate no Anel 3
  | 'rings_weekly_limit'    // FREE: Completou ritual semanal
  | 'memory_preview'        // Tentou acessar memórias/perfil
  | 'memory_advanced'       // FREE/ESSENTIALS: Tentou acessar charts avançados
  | 'memory_unlimited'      // FREE: Tentou ver histórico completo
  | 'voice_daily_limit'     // FREE: Limite de 5 mensagens de voz/dia
  | 'voice_essentials_limit' // ESSENTIALS: Limite de 20 mensagens de voz/dia
  | 'multiple_visits'       // Retornou 2+ vezes como guest
  | 'voice_usage'           // Usou gravador de voz
  | 'favorite_attempt'      // Tentou favoritar qualquer conteúdo
  | 'generic';              // Fallback genérico

/**
 * Estrutura de copy para cada contexto
 */
export interface ConversionCopyContent {
  title: string;
  message: string;
  primaryCta: string;
  secondaryCta?: string;
  subtitle?: string;
  legalText?: string;
}

/**
 * Copy filosófica por contexto de conversão
 */
export const CONVERSION_COPY: Record<ConversionContext, ConversionCopyContent> = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHAT CONTEXTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  chat_soft_prompt: {
    title: 'Eco está começando a conhecer você melhor',
    message: 'Crie sua conta para que ela se lembre desta conversa amanhã.',
    primaryCta: 'Criar minha conta',
    secondaryCta: 'Continuar como convidado',
    subtitle: 'Sempre gratuito, sempre privado',
  },

  chat_hard_limit: {
    title: 'Esta conversa merece continuar',
    message: 'Crie sua conta para que Eco guarde sua história e continue este diálogo amanhã.',
    primaryCta: 'Criar minha conta',
    subtitle: 'Sempre gratuito, sempre privado',
    legalText: 'Sem spam. Você pode sair quando quiser.',
  },

  chat_vulnerability: {
    title: 'Você se abriu aqui',
    message: 'Este espaço pode ser seu refúgio permanente. Crie sua conta para que Eco se lembre desta conexão.',
    primaryCta: 'Tornar este espaço meu',
    secondaryCta: 'Agora não',
    subtitle: 'Privado, seguro, sempre gratuito',
  },

  chat_deep_engagement: {
    title: 'Você está mergulhando fundo',
    message: 'Conversas profundas merecem um espaço permanente. Crie sua conta para continuar esta jornada.',
    primaryCta: 'Continuar esta jornada',
    secondaryCta: 'Talvez depois',
    subtitle: 'Sempre gratuito, sempre privado',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REFLEXÕES ESTOICAS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  reflection_teaser: {
    title: 'Esta reflexão continua...',
    message: 'Crie sua conta para ler a análise completa e guardar suas reflexões favoritas.',
    primaryCta: 'Continuar esta reflexão',
    secondaryCta: 'Voltar à lista',
    subtitle: 'Crie sua conta em 30 segundos — sempre gratuito',
  },

  reflection_multiple: {
    title: 'Você está começando sua jornada estoica',
    message: 'Três reflexões. Este é o ritmo de uma prática diária. Crie seu espaço para continuar este hábito.',
    primaryCta: 'Criar meu espaço',
    secondaryCta: 'Continuar explorando',
    subtitle: 'Sempre gratuito, sempre privado',
  },

  reflection_deep_scroll: {
    title: 'Você está absorvendo profundamente',
    message: 'Suas reflexões favoritas merecem um lugar permanente. Crie sua conta para guardá-las.',
    primaryCta: 'Salvar minhas reflexões',
    secondaryCta: 'Agora não',
    subtitle: 'Sempre gratuito, sempre privado',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MEDITAÇÕES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  meditation_time_limit: {
    title: 'Sua prática está florescendo',
    message: 'Continue esta meditação completa criando sua conta. As práticas completas aguardam você.',
    primaryCta: 'Continuar meditando',
    secondaryCta: 'Voltar à biblioteca',
    subtitle: 'Sempre gratuito, sempre privado',
  },

  meditation_complete: {
    title: 'Você completou sua primeira prática',
    message: 'Você experimentou os primeiros minutos. A prática completa e seu progresso aguardam você.',
    primaryCta: 'Desbloquear práticas completas',
    secondaryCta: 'Explorar mais',
    subtitle: 'Crie sua conta em 30 segundos',
  },

  meditation_favorite: {
    title: 'Guarde suas meditações favoritas',
    message: 'Suas práticas favoritas estarão sempre aqui quando você precisar. Crie sua conta para salvá-las.',
    primaryCta: 'Salvar minhas favoritas',
    secondaryCta: 'Agora não',
    subtitle: 'Sempre gratuito, sempre privado',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FIVE RINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  rings_day_complete: {
    title: 'Primeiro dia completo',
    message: '29 dias de prática ancestral aguardam você. Crie sua conta para continuar esta transformação de 30 dias.',
    primaryCta: 'Continuar minha jornada',
    secondaryCta: 'Agora não',
    subtitle: 'Sempre gratuito, sempre privado',
  },

  rings_gate: {
    title: 'O Anel do Fogo aguarda você',
    message: 'Você completou os primeiros dois anéis. Crie sua conta para atravessar os próximos 28 dias de transformação.',
    primaryCta: 'Atravessar os anéis',
    secondaryCta: 'Voltar',
    subtitle: 'Sempre gratuito, sempre privado',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MEMÓRIAS E PERFIL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  memory_preview: {
    title: 'Seu perfil emocional está se formando',
    message: 'Crie sua conta para visualizar seus padrões, organizar memórias e entender sua jornada emocional.',
    primaryCta: 'Ver meu perfil',
    secondaryCta: 'Voltar',
    subtitle: 'Dados privados e criptografados',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMPORTAMENTAIS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  multiple_visits: {
    title: 'Bem-vindo de volta',
    message: 'Você já retornou algumas vezes. Torne este espaço permanentemente seu.',
    primaryCta: 'Criar minha conta',
    secondaryCta: 'Continuar explorando',
    subtitle: 'Sempre gratuito, sempre privado',
  },

  voice_usage: {
    title: 'Sua voz merece ser ouvida',
    message: 'Crie sua conta para que Eco se lembre das suas conversas de voz e continue esta conexão.',
    primaryCta: 'Continuar com voz',
    secondaryCta: 'Agora não',
    subtitle: 'Sempre gratuito, sempre privado',
  },

  favorite_attempt: {
    title: 'Salve este momento',
    message: 'Seus favoritos estarão sempre aqui com uma conta gratuita. Crie seu espaço permanente.',
    primaryCta: 'Salvar meus favoritos',
    secondaryCta: 'Continuar sem salvar',
    subtitle: 'Sempre gratuito, sempre privado',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FALLBACK GENÉRICO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FREE TIER LIMITS (Fase 1)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  chat_daily_limit: {
    title: 'Você atingiu seu limite diário',
    message: 'Você teve 5 conversas profundas hoje. Amanhã, mais 5 te aguardam — ou desbloqueie conversas ilimitadas agora.',
    primaryCta: 'Desbloquear conversas ilimitadas',
    secondaryCta: 'Voltar amanhã',
    subtitle: '7 dias grátis • Cancele quando quiser',
  },

  chat_soft_limit: {
    title: 'Você está se aproximando do limite',
    message: 'Restam 2 mensagens hoje. Continue amanhã ou faça upgrade para conversas ilimitadas.',
    primaryCta: 'Upgrade agora',
    secondaryCta: 'Continuar (2 restantes)',
    subtitle: '7 dias grátis',
  },

  reflection_archive_locked: {
    title: 'Arquivo completo de reflexões',
    message: 'Acesse todas as 61 reflexões estoicas (Janeiro, Fevereiro, Dezembro) organizadas por temas.',
    primaryCta: 'Desbloquear arquivo completo',
    secondaryCta: 'Continuar com CLAREZA',
    subtitle: '7 dias grátis • Sempre pode cancelar',
  },

  reflection_month_fevereiro: {
    title: 'PAIXÕES E EMOÇÕES',
    message: '"As paixões são tiranas. Aprenda a dominá-las." — Marco Aurélio. 28 reflexões que vão transformar sua relação com as emoções.',
    primaryCta: 'Desbloquear Fevereiro (28 reflexões)',
    secondaryCta: 'Continuar com Janeiro',
    subtitle: '7 dias grátis • Cancele quando quiser',
    badges: [
      { icon: '🔥', label: 'Paixões e Emoções' },
      { icon: '📖', label: '28 reflexões' },
      { icon: '💾', label: 'Progresso salvo' },
    ],
  },

  reflection_month_dezembro: {
    title: 'MEDITAÇÃO SOBRE MORTALIDADE',
    message: '"Você pode deixar a vida agora. Que isso determine o que você faz, diz e pensa." — Marco Aurélio. 20 reflexões profundas sobre finitude, propósito e legado.',
    primaryCta: 'Desbloquear Dezembro (20 reflexões)',
    secondaryCta: 'Continuar com Janeiro',
    subtitle: '7 dias grátis • Cancele quando quiser',
    badges: [
      { icon: '💀', label: 'Memento Mori' },
      { icon: '📖', label: '20 reflexões' },
      { icon: '💾', label: 'Progresso salvo' },
    ],
  },

  rings_weekly_limit: {
    title: 'Ritual semanal concluído',
    message: 'Você completou seu ritual desta semana. Premium desbloqueia prática diária — 30 dias de transformação ininterrupta.',
    primaryCta: 'Desbloquear prática diária',
    secondaryCta: 'Voltar',
    subtitle: '7 dias grátis para experimentar',
  },

  memory_advanced: {
    title: 'Análises avançadas bloqueadas',
    message: 'Veja padrões emocionais ao longo do tempo, correlações entre eventos e insights personalizados.',
    primaryCta: 'Desbloquear análises',
    secondaryCta: 'Voltar',
    subtitle: '7 dias grátis',
  },

  memory_unlimited: {
    title: 'Histórico completo bloqueado',
    message: 'Acesse todas as suas memórias, sem limites de tempo ou quantidade. Sua história emocional completa.',
    primaryCta: 'Desbloquear histórico completo',
    secondaryCta: 'Continuar com últimos 30 dias',
    subtitle: '7 dias grátis',
  },

  voice_daily_limit: {
    title: 'Limite diário de voz atingido',
    message: 'Você usou suas 5 mensagens de voz hoje. Premium desbloqueia mensagens de voz ilimitadas.',
    primaryCta: 'Desbloquear voz ilimitada',
    secondaryCta: 'Voltar ao chat',
    subtitle: '7 dias grátis',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ESSENTIALS TIER LIMITS (Fase 3.1)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  chat_essentials_limit: {
    title: 'Você atingiu seu limite Essentials',
    message: 'Você teve 100 mensagens hoje. Premium desbloqueia conversas verdadeiramente ilimitadas.',
    primaryCta: 'Upgrade para Premium',
    secondaryCta: 'Voltar amanhã',
    subtitle: 'Desbloqueie conversas ilimitadas + todas as meditações',
  },

  voice_essentials_limit: {
    title: 'Limite Essentials de voz atingido',
    message: 'Você usou suas 20 mensagens de voz hoje. Premium desbloqueia voz ilimitada + meditações avançadas.',
    primaryCta: 'Upgrade para Premium',
    secondaryCta: 'Voltar ao chat',
    subtitle: 'Acesso completo + suporte prioritário',
  },

  meditation_premium_locked: {
    title: 'Meditação Premium',
    message: 'Esta meditação é exclusiva do plano Premium. Upgrade para acessar todas as práticas de 15+ minutos e conteúdos avançados.',
    primaryCta: 'Upgrade para Premium',
    secondaryCta: 'Voltar à biblioteca',
    subtitle: '7 dias grátis • Todas as meditações',
  },

  meditation_library_banner: {
    title: 'Desbloqueie a Biblioteca Completa',
    message: 'Acesse meditações longas, programas completos e novos conteúdos toda semana. Aprofunde sua prática sem limites.',
    primaryCta: 'Ver Planos',
    secondaryCta: 'Continuar explorando',
    subtitle: '7 dias grátis • Cancele quando quiser',
  },

  meditation_library_footer: {
    title: 'Aprofunde Sua Prática',
    message: 'Desbloqueie meditações de 15-25 minutos, programas completos de transformação e novos conteúdos exclusivos.',
    primaryCta: 'Desbloquear Biblioteca Premium',
    secondaryCta: 'Voltar',
    subtitle: '7 dias grátis • R$ 29,90/mês depois',
  },

  generic: {
    title: 'Continue sua jornada',
    message: 'Crie sua conta gratuita para salvar seu progresso e desbloquear a experiência completa do ECOTOPIA.',
    primaryCta: 'Criar minha conta',
    secondaryCta: 'Agora não',
    subtitle: 'Sempre gratuito, sempre privado',
    legalText: 'Sem spam. Você pode sair quando quiser.',
  },
};

/**
 * Helper para obter copy de um contexto
 */
export function getConversionCopy(context: ConversionContext): ConversionCopyContent {
  return CONVERSION_COPY[context] || CONVERSION_COPY.generic;
}

/**
 * Badges informativos para mostrar o que será preservado
 */
export interface PreservedDataBadge {
  icon: string;
  label: string;
}

export function getPreservedDataBadges(context: ConversionContext): PreservedDataBadge[] {
  switch (context) {
    case 'chat_soft_prompt':
    case 'chat_hard_limit':
    case 'chat_vulnerability':
    case 'chat_deep_engagement':
    case 'chat_daily_limit':
    case 'chat_soft_limit':
    case 'chat_essentials_limit':
      return [
        { icon: '💬', label: 'Conversa salva' },
        { icon: '🧠', label: 'Memória emocional' },
      ];

    case 'reflection_teaser':
    case 'reflection_multiple':
    case 'reflection_deep_scroll':
    case 'reflection_archive_locked':
      return [
        { icon: '📖', label: 'Reflexões completas' },
        { icon: '⭐', label: 'Salvar favoritas' },
      ];

    case 'meditation_time_limit':
    case 'meditation_complete':
    case 'meditation_favorite':
    case 'meditation_premium_locked':
    case 'meditation_library_banner':
    case 'meditation_library_footer':
      return [
        { icon: '🧘', label: 'Meditações completas' },
        { icon: '📊', label: 'Progresso registrado' },
        { icon: '🎵', label: 'Todas as práticas' },
      ];

    case 'voice_daily_limit':
    case 'voice_essentials_limit':
      return [
        { icon: '🎤', label: 'Voz ilimitada' },
        { icon: '📝', label: 'Transcrições salvas' },
      ];

    case 'rings_day_complete':
    case 'rings_gate':
    case 'rings_weekly_limit':
      return [
        { icon: '⭕', label: '30 dias completos' },
        { icon: '📈', label: 'Progresso salvo' },
      ];

    case 'memory_preview':
    case 'memory_advanced':
    case 'memory_unlimited':
      return [
        { icon: '📊', label: 'Perfil emocional' },
        { icon: '💭', label: 'Memórias organizadas' },
        { icon: '🔒', label: 'Dados privados' },
      ];

    default:
      return [
        { icon: '✨', label: 'Experiência completa' },
        { icon: '🔒', label: 'Dados privados' },
      ];
  }
}

/**
 * Copy específica para botões teaser em conteúdo
 */
export const TEASER_BUTTON_COPY = {
  reflection: 'Continue esta reflexão →',
  meditation: 'Continuar meditando',
  rings: 'Continuar ritual',
  memory: 'Ver meu perfil completo',
} as const;

/**
 * Copy para mensagens inline do Eco no chat
 */
export const ECO_INLINE_PROMPTS = {
  memory_mention: 'Estou percebendo padrões nas suas emoções. Com uma conta, você poderia ver essas descobertas em um mapa emocional.',
  return_visit: 'Bem-vindo de volta. Crie sua conta para que eu me lembre de você sempre.',
  deep_conversation: 'Gostaria de que eu me lembrasse desta conversa? Com uma conta, posso continuar nossa história amanhã.',
} as const;
