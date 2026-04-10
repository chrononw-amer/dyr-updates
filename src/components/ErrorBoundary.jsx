import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: '#fff', background: '#222', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <h1 style={{ color: '#ff4961' }}>Something went wrong.</h1>
                    <p>The application encountered an unexpected error.</p>
                    <pre style={{ background: '#333', padding: '10px', borderRadius: '5px', maxWidth: '80%', overflow: 'auto' }}>
                        {this.state.error && this.state.error.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '20px', padding: '10px 20px', background: '#c5a059', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Reload Application
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm("This will clear all local settings and cached data. Are you sure?")) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                        style={{ marginTop: '10px', padding: '10px 20px', background: '#ff4757', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Reset App Data & Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
