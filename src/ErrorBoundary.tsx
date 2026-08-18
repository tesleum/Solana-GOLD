import React from "react";
import { Box, Typography, Button } from "@mui/material";

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
          <Typography variant="h5" color="error" gutterBottom>Something went wrong</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {this.state.error?.message}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
