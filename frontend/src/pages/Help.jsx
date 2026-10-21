// W1 – Help. Shown inside the normal layout when logged in, or as a card when logged out.
import { Link } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import Layout from '../components/Layout';
import { useAuth, homeFor } from '../context/AuthContext';

const steps = {
  Farmers: [
    'Log in.',
    'Click Record delivery and enter the litres.',
    'Note your batch number.',
    'Check status; open the receipt once Paid.',
  ],
  Graders: [
    'Open Batches to test.',
    'Select a batch, enter measured litres.',
    'Choose Pass or Reject and save.',
  ],
  Admin: [
    'Open Approvals, review tested batches.',
    'Approve payment; the farmer is emailed.',
    'Use Reports and Audit log from the menu.',
  ],
};

function HelpContent() {
  return Object.entries(steps).map(([who, list]) => (
    <div key={who} className="mb-3">
      <h3 className="h6 mb-1">{who}</h3>
      <ol className="mb-0 ps-3">
        {list.map((s) => <li key={s}>{s}</li>)}
      </ol>
    </div>
  ));
}

export default function Help() {
  const { user } = useAuth();

  if (!user) {
    return (
      <AuthCard title="Help">
        <HelpContent />
        <Link to="/login" className="small">Back to login</Link>
      </AuthCard>
    );
  }

  return (
    <Layout title="Help" subtitle="How to use MaziwaTrack for each role">
      <div style={{ maxWidth: 640 }}>
        <div className="card"><div className="card-body"><HelpContent /></div></div>
        <Link to={homeFor(user.role)} className="d-inline-block mt-3 small">Back to my dashboard</Link>
      </div>
    </Layout>
  );
}
