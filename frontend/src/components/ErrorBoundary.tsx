import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-fog px-4">
          <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 shadow-card">
            <h2 className="font-display text-xl text-red-800">Something went wrong</h2>
            <p className="mt-2 text-sm text-red-700">
              An unexpected error occurred. Please refresh the page.
            </p>
            <p className="mt-2 rounded bg-red-100 px-3 py-2 font-mono text-xs text-red-800">
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
