import { Component } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

/**
 * Catches render errors in children and shows a fallback UI instead of a blank screen.
 */
export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-4 p-6">
          <Link
            to={this.props.backTo || '/admin/users'}
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700"
          >
            <ArrowLeft className="h-4 w-4" /> {this.props.backLabel || 'Back'}
          </Link>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">Something went wrong</h3>
              <p className="text-sm text-amber-800 mt-1">
                {this.props.message ||
                  'This page encountered an error. Try going back or refreshing.'}
              </p>
              {this.state.error && (
                <p className="text-xs text-amber-700 mt-2 font-mono truncate" title={this.state.error.message}>
                  {this.state.error.message}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
