/**
 * Configuração centralizada das perguntas do programa "Quem Pensa Enriquece"
 *
 * Este arquivo serve como fonte única de verdade para:
 * - Labels das perguntas
 * - Estrutura dos passos
 * - Formatação de respostas
 * - Mapeamento de ações
 */

export interface FieldConfig {
  key: string;
  label: string;
  question: string;
  type: 'text' | 'array' | 'multiline';
}

export interface StepConfig {
  stepNumber: number;
  title: string;
  subtitle?: string;
  icon: string;
  fields: FieldConfig[];
}

/**
 * Mapeamento de ações do Passo 5 para labels legíveis
 */
export const actionLabels: Record<string, string> = {
  review_spending: 'Revisar meus gastos com atenção',
  create_budget: 'Criar um orçamento realista',
  automate_savings: 'Automatizar uma reserva mensal',
  learn_invest: 'Estudar sobre investimentos',
  increase_income: 'Buscar formas de aumentar minha renda',
  talk_money: 'Conversar sobre dinheiro sem vergonha',
  celebrate_wins: 'Celebrar minhas conquistas financeiras',
};

/**
 * Configuração completa dos 6 passos do programa
 */
export const riquezaMentalSteps: StepConfig[] = [
  {
    stepNumber: 1,
    title: 'Passo 1',
    subtitle: 'Sua relação com dinheiro',
    icon: '🔍',
    fields: [
      {
        key: 'step1',
        label: 'Relação com dinheiro',
        question: 'Que frase melhor resume sua relação com dinheiro hoje?',
        type: 'text',
      },
    ],
  },
  {
    stepNumber: 2,
    title: 'Passo 2',
    subtitle: 'Onde você quer estar',
    icon: '🎯',
    fields: [
      {
        key: 'step2',
        label: 'Visão de futuro',
        question: 'Daqui 3 anos, como você quer viver financeiramente?',
        type: 'multiline',
      },
    ],
  },
  {
    stepNumber: 3,
    title: 'Passo 3',
    subtitle: 'O que te puxa de volta',
    icon: '⚠️',
    fields: [
      {
        key: 'step3_fear',
        label: 'Medo financeiro',
        question: 'Que medo aparece quando você pensa no seu futuro financeiro?',
        type: 'text',
      },
      {
        key: 'step3_belief',
        label: 'Frase limitante',
        question: 'Que frase interna mais te limita hoje?',
        type: 'text',
      },
    ],
  },
  {
    stepNumber: 4,
    title: 'Passo 4',
    subtitle: 'Sua nova verdade',
    icon: '💡',
    fields: [
      {
        key: 'step4',
        label: 'Afirmação consciente',
        question: 'Qual é a sua nova afirmação sobre dinheiro?',
        type: 'text',
      },
    ],
  },
  {
    stepNumber: 5,
    title: 'Passo 5',
    subtitle: 'Hora de agir',
    icon: '🚀',
    fields: [
      {
        key: 'step5_actions',
        label: 'Ações concretas',
        question: 'Que ações você vai tomar nas próximas semanas?',
        type: 'array',
      },
      {
        key: 'step5_commitment',
        label: 'Compromisso',
        question: 'Qual é o seu compromisso consigo mesmo?',
        type: 'text',
      },
    ],
  },
];

/**
 * Helper para obter configuração de um passo específico
 */
export function getStepConfig(stepNumber: number): StepConfig | undefined {
  return riquezaMentalSteps.find((step) => step.stepNumber === stepNumber);
}

/**
 * Helper para obter configuração de um campo específico
 */
export function getFieldConfig(fieldKey: string): FieldConfig | undefined {
  for (const step of riquezaMentalSteps) {
    const field = step.fields.find((f) => f.key === fieldKey);
    if (field) return field;
  }
  return undefined;
}

/**
 * Helper para formatar valor de resposta baseado no tipo do campo
 */
export function formatAnswerValue(
  fieldConfig: FieldConfig,
  value: unknown
): string {
  if (!value) return '—';

  switch (fieldConfig.type) {
    case 'array':
      if (Array.isArray(value)) {
        // Caso especial para step5_actions
        if (fieldConfig.key === 'step5_actions') {
          return value
            .map((action) => actionLabels[action] || action)
            .join(', ');
        }
        return value.join(', ');
      }
      return String(value);

    case 'text':
    case 'multiline':
      return String(value);

    default:
      return String(value);
  }
}

/**
 * Helper para obter todas as respostas formatadas de uma sessão
 */
export function getSessionAnswers(answers: Record<string, unknown>): {
  step: StepConfig;
  responses: { field: FieldConfig; value: string }[];
}[] {
  return riquezaMentalSteps.map((step) => ({
    step,
    responses: step.fields
      .map((field) => ({
        field,
        value: formatAnswerValue(field, answers[field.key]),
      }))
      .filter((response) => response.value !== '—'), // Filtrar respostas vazias
  }));
}
