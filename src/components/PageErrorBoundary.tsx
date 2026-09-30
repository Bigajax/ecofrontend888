import { Component, ErrorInfo, ReactNode } from 'react';
import ReinoErro from '@/components/reino/ReinoErro';

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * PageErrorBoundary: proteção por rota. Diferente do RootErrorBoundary, só
 * reabre a rota, sem recarregar. Mostra a trilha interrompida (ReinoErro) na
 * versão compacta. Antes: triângulo amarelo e botão azul.
 */
export default class PageErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PageErrorBoundary]', error.message, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <ReinoErro inline onAbrirDeNovo={this.handleRetry} onVoltar={() => window.history.back()} rotuloVoltar="Voltar" />
    );
  }
}
