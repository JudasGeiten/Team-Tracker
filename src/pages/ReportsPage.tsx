import { useTranslation } from 'react-i18next';

export default function ReportsPage() {
  const { t } = useTranslation();
  return <div>{t('reportsPage.placeholder')}</div>;
}
