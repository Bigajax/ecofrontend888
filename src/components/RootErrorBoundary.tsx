import { Component, ErrorInfo, ReactNode } from 'react';

type RootErrorBoundaryProps = {
  children: ReactNode;
};

type RootErrorBoundaryState = {
  hasError: boolean;
};

export default class RootErrorBoundary extends Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  public state: RootErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RootErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.warn('[RootErrorBoundary] Render error capturado', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-6 text-center">
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-lg font-semibold text-gray-900">
              Opa, algo deu errado. Tentar recarregar.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
