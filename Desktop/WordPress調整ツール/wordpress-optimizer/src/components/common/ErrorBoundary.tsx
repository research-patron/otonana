import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertTitle, Container, Button, Box } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="error">
            <AlertTitle>アプリケーションエラーが発生しました</AlertTitle>
            <Box sx={{ mt: 2, mb: 2 }}>
              <strong>エラー詳細:</strong>
              <pre style={{ fontSize: '0.8em', marginTop: '8px' }}>
                {this.state.error?.message || 'Unknown error'}
              </pre>
            </Box>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              sx={{ mt: 1 }}
            >
              ページを再読み込み
            </Button>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;