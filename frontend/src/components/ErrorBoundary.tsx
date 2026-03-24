'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional fallback component to render on error */
  fallback?: ReactNode
  /** Optional callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Optional component name for error context */
  componentName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Error Boundary component for catching and recovering from render errors.
 * Wraps risky components (data fetching, third-party integrations, lazy loading)
 * to prevent entire app crashes.
 *
 * @example
 * <ErrorBoundary componentName="ContentFeed">
 *   <ContentFeed />
 * </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo })

    // Log error with context
    const context = {
      componentName: this.props.componentName || 'Unknown',
      componentStack: errorInfo.componentStack,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', context)
    }

    // Call optional error callback (for Sentry, analytics, etc.)
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div
          className="flex flex-col items-center justify-center p-6 rounded-xl bg-surface-1 border border-border text-center min-h-[200px]"
          role="alert"
          aria-live="assertive"
        >
          <div className="mb-4 p-3 rounded-full bg-red-500/10">
            <AlertTriangle className="h-8 w-8 text-red-400" aria-hidden="true" />
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">
            Something went wrong
          </h3>

          <p className="text-sm text-white/60 mb-4 max-w-md">
            {this.props.componentName
              ? `The ${this.props.componentName} component encountered an error.`
              : 'This section encountered an error.'}
            {' '}You can try again or return to the home page.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4 w-full max-w-md text-left">
              <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60">
                Error details (dev only)
              </summary>
              <pre className="mt-2 p-2 text-xs bg-black/30 rounded overflow-auto max-h-32 text-red-400">
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90 text-white text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try Again
            </button>

            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] border border-border hover:bg-white/[0.08] text-white text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
