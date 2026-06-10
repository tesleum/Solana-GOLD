import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./ErrorBoundary";
import { ThemeProvider, createTheme, CssBaseline, alpha, Box, CircularProgress } from '@mui/material';

const App = lazy(() => import('./App'));
const AdminPanel = lazy(() => import('./AdminPanel'));

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#D4AF37', light: '#F3E5AB', dark: '#AA8529', contrastText: '#1a1b1f' },
    secondary: { main: '#1a1b1f' },
    background: { default: '#000000', paper: '#121214' },
    divider: alpha('#D4AF37', 0.15),
  },
  shape: { borderRadius: 20 },
  typography: {
    fontFamily: '"Montserrat", "Inter", "Vazirmatn", sans-serif',
    h1: { fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          overflowX: 'hidden',
          width: '100%',
          margin: 0,
          padding: 0,
        },
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          WebkitTapHighlightColor: 'transparent',
          backgroundColor: '#000000',
          overscrollBehaviorY: 'none',
          overflowX: 'hidden',
          width: '100%',
          margin: 0,
          padding: 0,
        },
        '#root': {
          overflowX: 'hidden',
          width: '100%',
        },
        '*': {
          userSelect: 'none',
        },
        'p, h1, h2, h3, h4, h5, h6, span': {
           userSelect: 'none',
        },
        'input, textarea': {
           userSelect: 'text',
        }
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 24, padding: '12px 24px', minHeight: '48px',
          transition: 'transform 0.1s ease-in-out, opacity 0.1s',
          boxShadow: 'none',
          '&:active': { transform: 'scale(0.96)', opacity: 0.8 },
        },
        contained: {
          color: '#1a1b1f', backgroundColor: '#D4AF37',
          '&:hover': { backgroundColor: '#F3E5AB' }
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', backgroundColor: '#121214',
          borderRadius: 24, border: `1px solid ${alpha('#ffffff', 0.08)}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#000000', 0.65), backdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: `1px solid ${alpha('#ffffff', 0.08)}`, boxShadow: 'none',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#000000', 0.75), backdropFilter: 'saturate(180%) blur(20px)',
          borderTop: `1px solid ${alpha('#ffffff', 0.08)}`, height: '80px',
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: alpha('#ffffff', 0.4), minWidth: 'auto', padding: '6px 0', transition: 'color 0.2s',
          '&.Mui-selected': { color: '#D4AF37' },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.65rem', fontWeight: 500, marginTop: '4px',
            '&.Mui-selected': { fontSize: '0.7rem', fontWeight: 600 }
          }
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          fontSize: '16px', // Prevent auto-zoom on iOS
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
          backgroundColor: '#121214',
          backgroundImage: 'none',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' }
      }
    }
  },
});

export default function Root() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#000' }}>
              <CircularProgress sx={{ color: '#D4AF37' }} />
            </Box>
          }>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/admin/*" element={<AdminPanel />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
