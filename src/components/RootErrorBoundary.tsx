import { Component, ErrorInfo, ReactNode } from 'react';

import mixpanel from '@/lib/mixpanel';
import ReinoErro from '@/components/reino/ReinoErro';

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
 * RootErrorBoundary: camada global contra erros do React. Nunca tela branca:
 * mostra a trilha interrompida (ReinoErro), com abrir de novo, voltar para
 * Hoje e, se repetir, começar do zero neste aparelho. Os detalhes vão para o
 * console e para o Mixpanel.
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
    // Conta entre recargas (5 min): só assim "começar do zero" aparece quando repete.
    let newErrorCount = this.state.errorCount + 1;
    try {
      const antes = JSON.parse(sessionStorage.getItem('eco.erros') || 'null') as { n: number; t: number } | null;
      if (antes && Date.now() - antes.t < 5 * 60 * 1000) newErrorCount = Math.max(newErrorCount, antes.n + 1);
      sessionStorage.setItem('eco.erros', JSON.stringify({ n: newErrorCount, t: Date.now() }));
    } catch {
      // sem sessionStorage: conta só nesta tela
    }

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

    // Instrumenta o crash: sem isso o Mixpanel fica cego exatamente onde o
    // usuário vê "Algo deu errado" e recarrega — jornadas com reload silencioso
    // no meio de fluxos (ex.: cadastro do /assinar) ficam sem explicação.
    // sendBeacon + send_immediately porque um reload pode vir logo em seguida.
    try {
      mixpanel.track(
        'App · Erro fatal',
        {
          error_message: error.message,
          path: window.location.pathname,
          error_count: newErrorCount,
        },
        { transport: 'sendBeacon', send_immediately: true },
      );
    } catch {
      // tracking nunca pode quebrar a UI de erro
    }

    this.setState({
      errorInfo,
      errorCount: newErrorCount,
    });
  }

  // Abrir de novo não apaga nada (antes limpava o armazenamento a partir do
  // segundo erro, e o terceiro limpava sozinho: ia junto o progresso local).
  private handleReload = () => {
    window.location.reload();
  };

  private handleVoltar = () => {
    window.location.href = '/app';
  };

  // Só quando a pessoa escolhe, e o botão diz o que apaga.
  private handleDoZero = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // sem storage: segue para a entrada mesmo assim
    }
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <ReinoErro
          vezes={Math.max(1, this.state.errorCount)}
          onAbrirDeNovo={this.handleReload}
          onVoltar={this.handleVoltar}
          onDoZero={this.handleDoZero}
        />
      );
    }

    return this.props.children;
  }
}
