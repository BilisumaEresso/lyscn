import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mb-5 text-2xl">
            ⚠️
          </div>
          <h1 className="font-display font-bold text-2xl text-ink mb-2">
            Something went wrong
          </h1>
          <p className="text-ink-muted text-sm mb-7 max-w-xs">
            An unexpected error occurred. Reloading the page usually fixes this.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-teal text-white rounded-xl font-display font-semibold text-sm hover:bg-teal/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
