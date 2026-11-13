// W1 – Help. Shown inside the normal layout when logged in, or as a card when logged out.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthCard from '../components/AuthCard';
import Layout from '../components/Layout';
import { useAuth, homeFor } from '../context/AuthContext';

// Translation keys for each role's steps (text in src/i18n/en.json and sw.json, under "help").
const steps = {
  farmers: ['farmer1', 'farmer2', 'farmer3', 'farmer4'],
  graders: ['grader1', 'grader2', 'grader3'],
  admin: ['admin1', 'admin2', 'admin3'],
};

function HelpContent() {
  const { t } = useTranslation();
  return Object.entries(steps).map(([who, list]) => (
    <div key={who} className="mb-3">
      <h3 className="h6 mb-1">{t(`help.${who}`)}</h3>
      <ol className="mb-0 ps-3">
        {list.map((k) => <li key={k}>{t(`help.${k}`)}</li>)}
      </ol>
    </div>
  ));
}

export default function Help() {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!user) {
    return (
      <AuthCard title={t('help.title')}>
        <HelpContent />
        <Link to="/login" className="small">{t('help.backToLogin')}</Link>
      </AuthCard>
    );
  }

  return (
    <Layout title={t('help.title')} subtitle={t('help.subtitle')}>
      <div style={{ maxWidth: 640 }}>
        <div className="card"><div className="card-body"><HelpContent /></div></div>
        <Link to={homeFor(user.role)} className="d-inline-block mt-3 small">{t('help.backToDashboard')}</Link>
      </div>
    </Layout>
  );
}
