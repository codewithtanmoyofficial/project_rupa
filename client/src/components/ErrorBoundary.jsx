import { Component } from 'react';

// Shows the error on screen instead of a blank white page
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen grid place-items-center p-4 bg-page">
        <div className="card p-6 max-w-lg w-full">
          <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
          <p className="text-sm text-slate-500 mt-1">Please send this message to the developer:</p>
          <pre className="mt-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto whitespace-pre-wrap">{String(this.state.error?.stack || this.state.error)}</pre>
          <button className="btn-primary mt-4" onClick={() => window.location.assign('/')}>Reload</button>
        </div>
      </div>
    );
  }
}
