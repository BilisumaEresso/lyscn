import { Component } from 'react';

/**
 * Error boundary — catches unexpected render errors and shows a calm
 * recovery screen instead of a blank white page.
 * The reload action lets users self-recover without manual URL typing.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Only log in development
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            textAlign: 'center',
            background: '#F5F8F7',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <div style={{ marginBottom: '24px', fontSize: '48px' }}>⚠️</div>
          <h1
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: '22px',
              color: '#121A2C',
              marginBottom: '10px',
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: '#5B6B7A', fontSize: '14px', marginBottom: '28px', maxWidth: '300px' }}>
            An unexpected error occurred. Reloading the page usually fixes this.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 28px',
              borderRadius: '12px',
              background: 'var(--color-primary, #14B8A6)',
              color: 'var(--color-on-primary, #FFFFFF)',
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
              fontSize: '15px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
