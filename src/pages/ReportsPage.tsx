import { useTranslation } from 'react-i18next';
import { usePlayersStore } from '../state/usePlayersStore';
import { Paper, Typography, Box } from '@mui/material';
import WeeklyPlayerLines from '../components/stats/WeeklyPlayerLines';
import UnifiedDeviationChart from '../components/stats/UnifiedDeviationChart';

export default function ReportsPage() {
  const { t } = useTranslation();
  const importMode = usePlayersStore(s => s.importMode);
  return (
    <Box>
      {importMode === 'match' && (
        <Paper sx={{ p: 2, mb: 3, borderColor: 'warning.main' }} variant="outlined">
          <Typography variant="subtitle2" color="warning.main">{t('reportsPage.matchModeWarning') || 'Reports are only available in Season mode. Switch to Season import to view charts.'}</Typography>
        </Paper>
      )}
      <UnifiedDeviationChart unit={'week'} />
      <WeeklyPlayerLines />
      <Typography variant="body2" color="text.secondary" sx={{ mt:2 }}>{t('reportsPage.placeholder')}</Typography>
    </Box>
  );
}
