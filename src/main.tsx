import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';
import './i18n';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#195790',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#da191f',
      contrastText: '#ffffff'
    }
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
