import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Error Boundary Component to catch React errors
 * Prevents entire app from crashing
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo)
        this.setState({ error, errorInfo })
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
        window.location.reload()
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100dvh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    background: '#f5f5f5'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '48px',
                        maxWidth: '500px',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                        <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '24px' }} />
                        <h1 style={{ fontSize: '24px', marginBottom: '12px', color: '#1f2937' }}>
                            Something went wrong
                        </h1>
                        <p style={{ color: '#6b7280', marginBottom: '24px', lineHeight: '1.6' }}>
                            {this.props.fallbackMessage || 'The profile page encountered an error. Please try refreshing the page.'}
                        </p>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details style={{
                                marginBottom: '24px',
                                padding: '16px',
                                background: '#fef2f2',
                                borderRadius: '8px',
                                textAlign: 'left',
                                fontSize: '12px',
                                color: '#991b1b'
                            }}>
                                <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '8px' }}>
                                    Error Details
                                </summary>
                                <pre style={{ overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={this.handleReset}
                            style={{
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px 24px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <RefreshCw size={18} />
                            Reload Page
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
