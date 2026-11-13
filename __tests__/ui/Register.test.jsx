// Farmer registration form (FR1): checks every field before calling the server.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../src/i18n';
import Register from '../../src/pages/Register';
import { fakeApi, renderAt } from '../helpers/ui.jsx';

const api = vi.hoisted(() => ({}));
vi.mock('../../src/services/api', () => ({ api, USE_MOCK: false }));

async function fill({ name = 'Test Farmer', phone = '0712 345 678', email = ' Test.Farmer@Example.com ', password = 'Password123', confirm = password } = {}) {
  if (name) await userEvent.type(screen.getByLabelText('Full name'), name);
  if (phone) await userEvent.type(screen.getByLabelText('Phone'), phone);
  if (email) await userEvent.type(screen.getByLabelText('Email'), email);
  if (password) await userEvent.type(screen.getByLabelText('Password'), password);
  if (confirm) await userEvent.type(screen.getByLabelText('Confirm password'), confirm);
}
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Create account' }));

describe('Register', () => {
  beforeEach(() => fakeApi(api));

  it('shows a message under every empty field and does not call the server', async () => {
    renderAt(<Register />, { route: '/register' });
    await screen.findByRole('heading', { name: 'Register (farmers only)' });
    await submit();
    for (const message of ['Enter your full name.', 'Enter a phone number like 0712 345 678.',
      'Enter a valid email address.', 'Password must be at least 8 characters.']) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
    expect(api.register).not.toHaveBeenCalled();
  });

  it('refuses passwords that do not match', async () => {
    renderAt(<Register />, { route: '/register' });
    await fill({ confirm: 'Different123' });
    await submit();
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });

  it('error messages switch language straight away', async () => {
    renderAt(<Register />, { route: '/register' });
    await screen.findByRole('heading', { name: 'Register (farmers only)' });
    await submit();
    await i18n.changeLanguage('sw');
    expect(await screen.findByText('Weka jina lako kamili.')).toBeInTheDocument();
    expect(screen.queryByText('Enter your full name.')).not.toBeInTheDocument();
  });

  it('A8: sends tidied-up details to the server, then opens the login page', async () => {
    api.register.mockResolvedValue({ user_id: 30, role: 'farmer' });
    renderAt(<Register />, { route: '/register' });
    await fill();
    await submit();
    expect(api.register).toHaveBeenCalledWith({
      full_name: 'Test Farmer', phone: '0712345678', email: 'test.farmer@example.com', password: 'Password123',
    });
    expect(await screen.findByTestId('location')).toHaveTextContent('/login');
  });

  it('A9: shows the server message for an email that is already used', async () => {
    api.register.mockRejectedValue(new Error('An account with this email already exists.'));
    renderAt(<Register />, { route: '/register' });
    await fill();
    await submit();
    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument();
  });
});
