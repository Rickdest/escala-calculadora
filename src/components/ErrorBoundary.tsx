import React from 'react';
import { useLocation } from 'react-router-dom';

interface State { hasError: boolean }

class ErrorBoundaryClass extends React.Component<
  { children: React.ReactNode; resetKey: string },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <span className="text-4xl">😵</span>
            <h1 className="text-lg font-bold text-foreground">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">Ocorreu um erro inesperado. Tente recarregar a página.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
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

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <ErrorBoundaryClass resetKey={location.pathname}>
      {children}
    </ErrorBoundaryClass>
  );
}
