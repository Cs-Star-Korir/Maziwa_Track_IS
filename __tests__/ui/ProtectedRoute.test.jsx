// Pages are only shown to the right role (X1, X2, X3 in the test plan).
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import { fakeApi, renderAt, USERS } from '../helpers/ui.jsx';

const api = vi.hoisted(() => ({}));
vi.mock('../../src/services/api', () => ({ api, USE_MOCK: false }));

const adminPage = <ProtectedRoute role="admin"><h1>Approvals page</h1></ProtectedRoute>;

describe('ProtectedRoute', () => {
  it('X3: sends a visitor who is not logged in to the login page', async () => {
    fakeApi(api, null);
    renderAt(adminPage, { route: '/admin' });
    expect(await screen.findByTestId('location')).toHaveTextContent('/login');
  });

  it('X1: sends a farmer who opens an admin page back to the farmer page', async () => {
    fakeApi(api, USERS.farmer);
    renderAt(adminPage, { route: '/admin' });
    expect(await screen.findByTestId('location')).toHaveTextContent('/farmer');
  });

  it('X2: sends a grader who opens an admin page back to the grader page', async () => {
    fakeApi(api, USERS.grader);
    renderAt(adminPage, { route: '/admin' });
    expect(await screen.findByTestId('location')).toHaveTextContent('/grader');
  });

  it('shows the page to the right role', async () => {
    fakeApi(api, USERS.admin);
    renderAt(adminPage, { route: '/admin' });
    expect(await screen.findByRole('heading', { name: 'Approvals page' })).toBeInTheDocument();
  });
});
