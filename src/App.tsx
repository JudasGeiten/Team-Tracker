import { useState } from 'react';
import { AppBar, Box, Container, CssBaseline, Toolbar, Typography, Tabs, Tab } from '@mui/material';
import PlayersPage from './pages/PlayersPage';
import TeamsPage from './pages/TeamsPage';
import ReportsPage from './pages/ReportsPage';
import DashboardPage from './pages/DashboardPage';
import GroupsPage from './pages/GroupsPage';

function App() {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Team Manager</Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" indicatorColor="secondary">
            <Tab label="Dashboard" />
            <Tab label="Players" />
            <Tab label="Groups" />
            <Tab label="Teams" />
            <Tab label="Reports" />
          </Tabs>
        </Toolbar>
      </AppBar>
      <Container sx={{ flexGrow: 1, py: 2 }}>
        {tab === 0 && <DashboardPage />}
        {tab === 1 && <PlayersPage />}
        {tab === 2 && <GroupsPage />}
        {tab === 3 && <TeamsPage />}
        {tab === 4 && <ReportsPage />}
      </Container>
    </Box>
  );
}

export default App;
