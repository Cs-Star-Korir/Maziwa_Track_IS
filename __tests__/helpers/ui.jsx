/* eslint-disable react/only-export-components -- test helper, not part of the app */
// Helpers for the UI tests: render a screen inside the router and the login context,
// and fake API objects so no backend is needed.
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../../src/context/AuthContext';

// Shows which page the app went to, e.g. "/farmer" after logging in.
function WhereAmI() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

// Renders `element` at `route`. Any navigation elsewhere shows <WhereAmI />.
export function renderAt(element, { route = '/', path = route } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={<WhereAmI />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// A fake for every function in src/services/api.js. Nobody is logged in unless `user` is given.
export function fakeApi(api, user = null) {
  for (const name of [
    'login', 'verifyCode', 'resendCode', 'forgotPassword', 'resetPassword', 'register', 'me', 'logout',
    'getConfig', 'createBatch', 'myBatches', 'batchesToTest', 'verifyBatch', 'listBatches',
    'approvePayment', 'resendReceipt', 'logReport', 'auditLogs',
  ]) api[name] = vi.fn();
  api.me.mockResolvedValue(user);
  api.logout.mockResolvedValue({});
  api.getConfig.mockResolvedValue({ price_per_litre: 50, cooperative_name: 'MaziwaTrack Dairy Cooperative' });
  return api;
}

export const USERS = {
  farmer: { user_id: 3, full_name: 'Wanjiku Mwangi', email: 'wanjiku@example.com', role: 'farmer' },
  grader: { user_id: 2, full_name: 'Peter Otieno', email: 'grader@example.com', role: 'grader' },
  admin: { user_id: 1, full_name: 'Grace Njeri', email: 'admin@example.com', role: 'admin' },
};

// A batch in the shape the API returns
export const batch = (over = {}) => ({
  batch_id: 7, batch_number: 'MT-20261109-0007', farmer_id: 3, farmer_name: 'Wanjiku Mwangi',
  declared_litres: 20, status: 'recorded', delivered_at: '2026-11-09T07:30:00Z',
  grader_id: null, measured_litres: null, quality_result: null, grader_notes: null, tested_at: null,
  payment: null, ...over,
});
