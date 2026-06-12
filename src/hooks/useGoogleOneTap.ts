// src/hooks/useGoogleOneTap.ts
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleOneTapConfig) => void;
          prompt: (callback?: (notification: PromptMomentNotification) => void) => void;
          renderButton: (parent: HTMLElement, options: GsiButtonOptions) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface GsiButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
  click_listener?: () => void;
}

interface GoogleOneTapConfig {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
}

interface CredentialResponse {
  credential: string; // JWT ID token
  select_by?: string;
  clientId?: string;
}

interface PromptMomentNotification {
  isDisplayMoment(): boolean;
  isDisplayed(): boolean;
  isNotDisplayed(): boolean;
  getNotDisplayedReason(): string;
  isSkippedMoment(): boolean;
  getSkippedReason(): string;
  isDismissedMoment(): boolean;
  getDismissedReason(): string;
  getMomentType(): string;
}

interface UseGoogleOneTapOptions {
  /**
   * Google OAuth Client ID
   */
  clientId: string;

  /**
   * Callback quando o usuário faz login com sucesso
   * @param idToken - JWT ID token do Google
   */
  onSuccess: (idToken: string) => void | Promise<void>;

  /**
   * Callback quando ocorre um erro
   */
  onError?: (error: Error) => void;

  /**
   * Se deve exibir automaticamente o prompt One Tap
   * @default true
   */
  enabled?: boolean;

  /**
   * Se deve selecionar automaticamente a conta se houver apenas uma
   * @default false
   */
  autoSelect?: boolean;

  /**
   * Se deve cancelar ao clicar fora do prompt
   * @default true
   */
  cancelOnTapOutside?: boolean;
}

/**
 * Hook para integração com Google One Tap
 *
 * Permite login rápido e automático com contas Google do usuário.
 * Mostra um prompt elegante quando o usuário já está logado no Google.
 *
 * @example
 * ```tsx
 * useGoogleOneTap({
 *   clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
 *   onSuccess: async (idToken) => {
 *     await signInWithGoogleIdToken(idToken);
 *   },
 *   enabled: !user, // Só exibe se não estiver logado
 * });
 * ```
 */
export function useGoogleOneTap({
  clientId,
  onSuccess,
  onError,
  enabled = true,
  autoSelect = false,
  cancelOnTapOutside = true,
}: UseGoogleOneTapOptions) {
  const hasInitializedRef = useRef(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Não faz nada se desabilitado ou já processando
    if (!enabled || isProcessingRef.current) {
      return;
    }

    // Verifica se o clientId está configurado
    if (!clientId) {
      console.warn('[GoogleOneTap] Client ID não configurado. Configure VITE_GOOGLE_CLIENT_ID no .env');
      return;
    }

    // Aguarda o script do Google carregar
    const initializeOneTap = () => {
      if (!window.google?.accounts?.id) {
        console.warn('[GoogleOneTap] Script do Google ainda não carregou');
        return;
      }

      // Previne múltiplas inicializações
      if (hasInitializedRef.current) {
        return;
      }

      hasInitializedRef.current = true;

      try {
        // Configura o Google One Tap
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: CredentialResponse) => {
            // Previne múltiplos callbacks simultâneos
            if (isProcessingRef.current) {
              console.warn('[GoogleOneTap] Já está processando um login');
              return;
            }

            isProcessingRef.current = true;

            try {
              console.info('[GoogleOneTap] Credencial recebida');
              await onSuccess(response.credential);
            } catch (error) {
              console.error('[GoogleOneTap] Erro no callback de sucesso:', error);
              onError?.(error instanceof Error ? error : new Error(String(error)));
            } finally {
              isProcessingRef.current = false;
            }
          },
          auto_select: autoSelect,
          cancel_on_tap_outside: cancelOnTapOutside,
          context: 'signin',
          itp_support: true,
        });

        // Exibe o prompt One Tap
        window.google.accounts.id.prompt((notification) => {
          // Log detalhado do comportamento do prompt
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            console.info('[GoogleOneTap] Prompt não exibido:', reason);

            // Razões comuns:
            // - opt_out_or_no_session: Usuário desabilitou ou não tem sessão Google
            // - user_cancel: Usuário cancelou anteriormente
            // - tap_outside: Usuário clicou fora
            // - issuing_failed: Falha ao emitir credencial
          }

          if (notification.isSkippedMoment()) {
            console.info('[GoogleOneTap] Momento ignorado:', notification.getSkippedReason());
          }

          if (notification.isDismissedMoment()) {
            console.info('[GoogleOneTap] Momento dispensado:', notification.getDismissedReason());
          }

          if (notification.isDisplayed()) {
            console.info('[GoogleOneTap] Prompt exibido com sucesso');
          }
        });
      } catch (error) {
        console.error('[GoogleOneTap] Erro ao inicializar:', error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    // Tenta inicializar imediatamente se o script já carregou
    if (window.google?.accounts?.id) {
      initializeOneTap();
    } else {
      // Aguarda o script carregar
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          initializeOneTap();
        }
      }, 100);

      // Timeout de segurança (10s)
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google?.accounts?.id) {
          console.warn('[GoogleOneTap] Script do Google não carregou após 10s');
        }
      }, 10000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }

    // Cleanup quando o componente desmonta
    return () => {
      if (window.google?.accounts?.id && hasInitializedRef.current) {
        try {
          // Cancela o prompt se ainda estiver visível
          window.google.accounts.id.cancel();
        } catch (error) {
          console.warn('[GoogleOneTap] Erro ao cancelar prompt:', error);
        }
      }
    };
  }, [clientId, enabled, onSuccess, onError, autoSelect, cancelOnTapOutside]);
}

interface UseGoogleSignInButtonOptions {
  /** Google OAuth Client ID. Vazio/ausente → `ready` fica false (use o fallback). */
  clientId: string;

  /** Recebe o JWT ID token quando o usuário escolhe uma conta no popup. */
  onSuccess: (idToken: string) => void | Promise<void>;

  /** Erro ao processar a credencial (ex.: falha no signInWithIdToken). */
  onError?: (error: Error) => void;

  /** Clique no botão (antes do popup abrir) — útil pra analytics/watchdog. */
  onClick?: () => void;

  /** Largura do botão em px (GIS aceita no máx. 400). Default: largura do container. */
  width?: number;
}

/** Estado do botão oficial do Google.
 * - `loading`: script GSI ainda carregando (mostre um placeholder neutro, NUNCA
 *   o fallback de redirect — senão a gente navega pra fora por puro timing).
 * - `ready`: botão renderizado, popup disponível (caminho feliz, sem redirect).
 * - `failed`: GSI não carregou no prazo / clientId ausente — só aqui faz sentido
 *   cair no fallback (ex.: OAuth por redirect), como último recurso. */
export type GoogleSignInButtonStatus = 'loading' | 'ready' | 'failed';

/**
 * Renderiza o botão oficial do Google (GIS) que abre o seletor de contas em
 * popup — sem redirect, a página atual permanece viva e a sessão chega via
 * `onSuccess(idToken)`. Complementa o One Tap acima reaproveitando o mesmo
 * script GSI (index.html) e a mesma `initialize`.
 *
 * Retorna `{ containerRef, status, ready }`. O <div> do `containerRef` precisa
 * estar SEMPRE montado (escondido enquanto não está `ready`) — o GIS renderiza
 * dentro dele. Use `status` pra distinguir "ainda carregando" (placeholder) de
 * "desistiu" (fallback de redirect). `ready` é mantido como atalho de
 * `status === 'ready'` pra compatibilidade.
 *
 * @example
 * ```tsx
 * const { containerRef, status } = useGoogleSignInButton({
 *   clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
 *   onSuccess: (idToken) => signInWithGoogleIdToken(idToken),
 * });
 * return (
 *   <>
 *     <div ref={containerRef} className={status === 'ready' ? '' : 'hidden'} />
 *     {status === 'loading' && <Placeholder />}
 *     {status === 'failed' && <FallbackButton />}
 *   </>
 * );
 * ```
 */
export function useGoogleSignInButton({
  clientId,
  onSuccess,
  onError,
  onClick,
  width,
}: UseGoogleSignInButtonOptions): {
  containerRef: React.RefObject<HTMLDivElement>;
  status: GoogleSignInButtonStatus;
  ready: boolean;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<GoogleSignInButtonStatus>('loading');

  // Callbacks via refs: handlers sempre atuais sem re-inicializar o GIS
  // (mesmo padrão do useMediaSession).
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onClickRef = useRef(onClick);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  onClickRef.current = onClick;

  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!clientId) {
      console.warn('[GoogleSignInButton] Client ID não configurado. Configure VITE_GOOGLE_CLIENT_ID no .env');
      setStatus('failed');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    const renderInto = () => {
      const gsi = window.google?.accounts?.id;
      const container = containerRef.current;
      if (cancelled || !gsi || !container) return;

      try {
        gsi.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;
            try {
              await onSuccessRef.current(response.credential);
            } catch (error) {
              onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
            } finally {
              isProcessingRef.current = false;
            }
          },
          itp_support: true,
        });

        gsi.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'center',
          locale: 'pt-BR',
          // offsetWidth pode ser 0 se o container estiver display:none — prefira
          // escondê-lo com h-0/overflow-hidden pra manter a largura mensurável.
          width: Math.min(400, width ?? (container.offsetWidth || 400)),
          click_listener: () => onClickRef.current?.(),
        });

        setStatus('ready');
      } catch (error) {
        console.error('[GoogleSignInButton] Erro ao renderizar botão:', error);
        setStatus('failed');
        onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    // Script GSI é async/defer no index.html — normalmente já carregou quando o
    // usuário chega aqui. Se ainda não, espera até ~8s antes de declarar `failed`
    // (rede móvel lenta precisa de folga). Enquanto espera, o status fica
    // `loading` pra UI mostrar um placeholder — nunca o redirect prematuro.
    if (window.google?.accounts?.id) {
      renderInto();
      return () => {
        cancelled = true;
      };
    }

    const checkInterval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(checkInterval);
        renderInto();
      }
    }, 100);
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      if (!window.google?.accounts?.id && !cancelled) {
        console.warn('[GoogleSignInButton] Script do Google não carregou em 8s — usando fallback');
        setStatus('failed');
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [clientId, width]);

  return { containerRef, status, ready: status === 'ready' };
}
