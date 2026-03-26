import {StrictMode, Component, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#1e1e1e', color: '#ff4444', height: '100vh', fontFamily: 'monospace' }}>
          <h1>⚠️ AURA IDE CRITICAL ERROR</h1>
          <p>Aplikasi mengalami kegagalan fatal saat inisialisasi.</p>
          <pre style={{ background: '#000', padding: '20px', borderRadius: '8px', overflow: 'auto' }}>
            {this.state.error?.toString() || 'Unknown Error'}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #555', cursor: 'pointer' }}>
            Muat Ulang (Reload)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
