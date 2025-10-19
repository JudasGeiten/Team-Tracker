import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppBar, Box, Container, CssBaseline, Toolbar, Typography, Tabs, Tab } from '@mui/material';
import PlayersPage from './pages/PlayersPage';
import TeamsPage from './pages/TeamsPage';
import ReportsPage from './pages/ReportsPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  const [tab, setTab] = useState(0);
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{t('appTitle')}</Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" indicatorColor="secondary">
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
