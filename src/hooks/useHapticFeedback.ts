/**
 * Hook para feedback háptico (vibração) em dispositivos móveis
 * Padrões vibracionais para diferentes ações
 */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticOptions {
  enabled?: boolean;
}

export function useHapticFeedback(options: HapticOptions = {}) {
  const { enabled = true } = options;

  const trigger = (pattern: HapticPattern) => {
    if (!enabled || typeof navigator === 'undefined') return;

    const canVibrate = !!navigator.vibrate;
    if (!canVibrate) return;

    // Padrões de vibração em ms
    const patterns: Record<HapticPattern, number | number[]> = {
      light: 10,           // Pequeno toque
      medium: 20,          // Toque médio
      heavy: 30,           // Toque forte
      success: [50, 30, 50],     // Padrão duplo
      warning: [100, 50, 100],   // Padrão triplo
      error: [200, 100, 200],    // Padrão de erro
      selection: [20],           // Seleção rápida
    };

    try {
      navigator.vibrate(patterns[pattern] || 20);
    } catch (error) {
      console.debug('[useHapticFeedback]', error);
    }
  };

  return {
    /**
     * Leve - ao focar em input
     */
    light: () => trigger('light'),

    /**
     * Médio - ao interagir com botões
     */
    medium: () => trigger('medium'),

    /**
     * Forte - ao completar ação importante
     */
    heavy: () => trigger('heavy'),

    /**
     * Sucesso - ao enviar mensagem ou completar tarefa
     */
    success: () => trigger('success'),

    /**
     * Aviso - ao receber erro ou alerta
     */
    warning: () => trigger('warning'),

    /**
     * Erro - ao falhar operação crítica
     */
    error: () => trigger('error'),

    /**
     * Seleção - ao selecionar item em lista
     */
    selection: () => trigger('selection'),

    /**
     * Personalizado - padrão customizado em ms
     */
    custom: (pattern: number | number[]) => {
      if (!enabled || typeof navigator === 'undefined') return;
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.debug('[useHapticFeedback]', error);
      }
    },
  };
}

export default useHapticFeedback;
