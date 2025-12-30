import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import logger from '../utils/logger';
import { Error as ErrorIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              textAlign: 'center'
            }}
          >
            <Paper
              elevation={3}
              sx={{
                padding: 4,
                borderRadius: 2,
                maxWidth: 600
              }}
            >
              <ErrorIcon
                sx={{ fontSize: 80, color: 'error.main', marginBottom: 2 }}
              />
              <Typography variant="h4" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ marginBottom: 3 }}>
                {this.state.error?.message || 'An unexpected error occurred'}
              </Typography>
              {import.meta.env.DEV && this.state.errorInfo && (
                <Box
                  sx={{
                    textAlign: 'left',
                    marginBottom: 3,
                    padding: 2,
                    backgroundColor: 'grey.100',
                    borderRadius: 1,
                    maxHeight: 200,
                    overflow: 'auto'
                  }}
                >
                  <Typography variant="caption" component="pre">
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </Box>
              )}
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReset}
              >
                Return to Home
              </Button>
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
