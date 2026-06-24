import mixpanel from './mixpanel';

/**
 * Eventos do módulo "Ritual Boa Noite" no app LOGADO (não o funil guest, que tem
 * seus próprios eventos em mixpanelSonoGuestEvents). Convenção do app:
 * "Domínio · Ação" em pt-BR. Diferencia guest vs logado via `is_logged_in`.
 */

const RITUAL_ID = 'ritual_boa_noite';

export type RitualProgressStatus = 'new' | 'in_progress' | 'completed_today' | 'all_done';

export interface RitualEventProps {
  userId?: string | null;
  /** nº de noites concluídas (0–7) */
  currentStep?: number;
  /** próxima noite a tocar (1–7) */
  currentNight?: number;
  /** estado do ritual no momento do evento */
  progressStatus?: RitualProgressStatus;
  /** de onde veio (ex.: 'home_carousel', 'modulo') */
  source?: string;
}

function track(action: string, props: RitualEventProps = {}): void {
  try {
    mixpanel.track(`Ritual Boa Noite · ${action}`, {
      ritual_id: RITUAL_ID,
      is_logged_in: Boolean(props.userId),
      is_guest: !props.userId,
      ...(props.userId ? { user_id: props.userId } : {}),
      ...(typeof props.currentStep === 'number' ? { current_step: props.currentStep } : {}),
      ...(typeof props.currentNight === 'number' ? { current_night: props.currentNight } : {}),
      ...(props.progressStatus ? { progress_status: props.progressStatus } : {}),
      ...(props.source ? { source: props.source } : {}),
      timestamp: new Date().toISOString(),
    });
  } catch {
    // tracking nunca pode quebrar a UI
  }
}

/** Card do Ritual entrou em foco no carrossel da home. */
export const trackRitualCardViewed = (p?: RitualEventProps) => track('Card visto', p);
/** Clique no CTA do card da home. */
export const trackRitualCardClicked = (p?: RitualEventProps) => track('Card clicado', p);
/** Usuário iniciou uma noite do ritual (mode app). */
export const trackRitualStarted = (p?: RitualEventProps) => track('Iniciado', p);
/** Passo/tela do ritual visto. */
export const trackRitualStepViewed = (p?: RitualEventProps) => track('Passo visto', p);
/** Áudio da noite começou. */
export const trackRitualAudioStarted = (p?: RitualEventProps) => track('Áudio iniciado', p);
/** Áudio da noite concluído (≥80%). */
export const trackRitualAudioCompleted = (p?: RitualEventProps) => track('Áudio concluído', p);
/** Noite concluída (avança o progresso). */
export const trackRitualCompleted = (p?: RitualEventProps) => track('Concluído', p);
/** Repetir/ouvir novamente uma noite já concluída. */
export const trackRitualReplayed = (p?: RitualEventProps) => track('Repetido', p);
