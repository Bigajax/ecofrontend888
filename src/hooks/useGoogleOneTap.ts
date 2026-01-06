// src/hooks/useGoogleOneTap.ts
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleOneTapConfig) => void;
          prompt: (callback?: (notification: PromptMomentNotification) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
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
