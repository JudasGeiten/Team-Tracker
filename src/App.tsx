import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppBar, Box, Container, CssBaseline, Toolbar, Typography, Tabs, Tab, useMediaQuery } from '@mui/material';
import { useEffect } from 'react';
import teamtallyLogoPath from '../teamtally.png';
import { useTheme } from '@mui/material/styles';
import PlayersPage from './pages/PlayersPage';
import TeamsPage from './pages/TeamsPage';
import ReportsPage from './pages/ReportsPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  const [tab, setTab] = useState(0);
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // Ensure favicon points to the bundled logo asset
  useEffect(()=> {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]') || (()=> {
      const l = document.createElement('link');
      l.rel = 'icon';
      document.head.appendChild(l);
      return l;
    })();
    link.href = teamtallyLogoPath;
  }, []);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Box sx={{ display:'flex', alignItems:'center', gap:1, flexGrow:1, minWidth:0 }}>
            <Box component="img" src={teamtallyLogoPath} alt="TeamTally" sx={{ height:{ xs:40, sm:48 }, width:{ xs:40, sm:48 }, objectFit:'contain', display:'block' }} />
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} sx={{ whiteSpace:'nowrap', fontWeight:600 }}>
              {t('appTitle')}
            </Typography>
          </Box>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            textColor="inherit"
            indicatorColor="secondary"
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons={isMobile ? 'auto' : false}
          >
            <Tab label={t('nav.dashboard')} />
            <Tab label={t('nav.players')} />
            <Tab label={t('nav.teams')} />
            <Tab label={t('nav.reports')} />
          </Tabs>
        </Toolbar>
      </AppBar>
      <Container sx={{ flexGrow: 1, py: 2 }}>
  {tab === 0 && <DashboardPage />}
  {tab === 1 && <PlayersPage />}
  {tab === 2 && <TeamsPage />}
  {tab === 3 && <ReportsPage />}
      </Container>
    </Box>
  );
}

export default App;
