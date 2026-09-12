import { Component } from 'react';

/**
 * Catches a render-time crash so one broken subtree does not leave the player
 * staring at a blank page with no way out.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ui] render error', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="grid min-h-[50dvh] place-items-center px-4 py-16">
        <div className="panel max-w-md p-6 text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-danger/40 bg-danger/10 text-xl text-danger"
          >
            ⚠
          </div>

          <h1 className="text-lg font-semibold text-ink">Something broke on this screen</h1>
          <p className="mt-2 text-sm text-muted">
            Your character and every quest you have completed are safe on the server. Reloading
            usually clears it.
          </p>

          {import.meta.env.DEV ? (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-void/70 p-3 text-left text-2xs text-danger">
              {this.state.error?.message}
            </pre>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload the page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
