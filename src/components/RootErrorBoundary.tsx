import { Component, ErrorInfo, ReactNode } from 'react';

type RootErrorBoundaryProps = {
  children: ReactNode;
};

type RootErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
};

/**
 * RootErrorBoundary - Camada global de proteção contra erros do React
 *
 * Garante que o usuário NUNCA veja tela branca, sempre mostrando:
 * - Mensagem amigável
 * - Botão de recarregar
 * - Opção de voltar ao login
 *
 * Crítico para Safari Mobile que pode descarregar a aba após inatividade.
 */
export default class RootErrorBoundary extends Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  public state: RootErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCount: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<RootErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const newErrorCount = this.state.errorCount + 1;

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[RootErrorBoundary] 🚨 ERRO CRÍTICO CAPTURADO');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Erro:', error);
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Count:', newErrorCount);
    console.error('Timestamp:', new Date().toISOString());
    console.error('User Agent:', navigator.userAgent);
    console.error('URL:', window.location.href);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    this.setState({
      errorInfo,
      errorCount: newErrorCount,
    });

    // Se erros múltiplos em sequência, limpar localStorage
    if (newErrorCount >= 3) {
      console.warn('[RootErrorBoundary] ⚠️ Múltiplos erros detectados. Limpando storage...');
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error('[RootErrorBoundary] Falha ao limpar storage:', e);
      }
    }
  }

  private handleReload = () => {
    console.info('[RootErrorBoundary] 🔄 Usuário clicou em recarregar');

    // Se múltiplos erros, limpar tudo antes de recarregar
    if (this.state.errorCount >= 2) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        console.info('[RootErrorBoundary] ✅ Storage limpo antes do reload');
      } catch (e) {
        console.error('[RootErrorBoundary] Erro ao limpar storage:', e);
      }
    }

    window.location.reload();
  };

  private handleGoToLogin = () => {
    console.info('[RootErrorBoundary] 🏠 Usuário clicou em voltar ao login');

    try {
      // Limpar storage antes de ir para login
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('[RootErrorBoundary] Erro ao limpar storage:', e);
    }

    window.location.href = '/login';
  };

  private handleShowDetails = () => {
    const { error, errorInfo } = this.state;

    const details = `
═══════════════════════════════════════
    DETALHES DO ERRO
═══════════════════════════════════════

⏰ Timestamp: ${new Date().toISOString()}
📱 User Agent: ${navigator.userAgent}
🔗 URL: ${window.location.href}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${error?.toString() || 'Desconhecido'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STACK TRACE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${error?.stack || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPONENT STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${errorInfo?.componentStack || 'N/A'}

═══════════════════════════════════════
`;

    console.info(details);
    alert('Detalhes do erro foram logados no console (F12)');
  };

  render() {
    if (this.state.hasError) {
      const isMultipleErrors = this.state.errorCount >= 2;
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
          <div className="w-full max-w-md space-y-6">
            {/* Card Principal */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
              {/* Ícone de Erro */}
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                  <svg
                    className="h-10 w-10 text-red-600"
                    fill="none"
                    strokeWidth="2"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </div>
              </div>

              {/* Mensagem */}
              <div className="mb-8 space-y-3 text-center">
                <h1 className="text-2xl font-bold text-slate-900">
                  {isMultipleErrors ? 'Ops, algo deu muito errado' : 'Algo deu errado'}
                </h1>
                <p className="text-sm leading-relaxed text-slate-600">
                  {isMultipleErrors ? (
                    <>
                      Detectamos múltiplos erros. Vamos limpar os dados locais e tentar novamente.
                    </>
                  ) : isSafari ? (
                    <>
                      O aplicativo encontrou um erro após o recarregamento.
                      Tente recarregar ou voltar ao login.
                    </>
                  ) : (
                    <>
                      O aplicativo encontrou um erro inesperado.
                      Recarregue a página para continuar.
                    </>
                  )}
                </p>

                {this.state.errorCount > 1 && (
                  <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2">
                    <p className="text-xs font-medium text-amber-800">
                      ⚠️ {this.state.errorCount} erros consecutivos
                    </p>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="w-full rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40 active:scale-[0.98]"
                >
                  🔄 Recarregar Aplicativo
                </button>

                <button
                  type="button"
                  onClick={this.handleGoToLogin}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                >
                  🏠 Voltar ao Login
                </button>
              </div>
            </div>

            {/* Botão de Detalhes (para desenvolvedores) */}
            <button
              type="button"
              onClick={this.handleShowDetails}
              className="w-full rounded-lg border border-slate-200 bg-white/50 px-4 py-2.5 text-xs font-medium text-slate-500 backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-700"
            >
              🔍 Ver Detalhes Técnicos (Console)
            </button>

            {/* Info Adicional */}
            <div className="text-center">
              <p className="text-xs text-slate-400">
                Erro #{this.state.errorCount} • {new Date().toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
