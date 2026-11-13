// Login screen: password, then the emailed 6-digit code (2FA).
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '../../src/pages/Login';
import { fakeApi, renderAt, USERS } from '../helpers/ui.jsx';

const api = vi.hoisted(() => ({}));
vi.mock('../../src/services/api', () => ({ api, USE_MOCK: false }));

async function enterPassword(email = 'wanjiku@example.com', password = 'Password123') {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('Login', () => {
  beforeEach(() => fakeApi(api));

  it('shows the login form with links to register, reset the password and get help', async () => {
    renderAt(<Login />, { route: '/login' });
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: 'Register here' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Need help?' })).toHaveAttribute('href', '/help');
  });

  it('A1: shows the server message when the password is wrong', async () => {
    api.login.mockRejectedValue(new Error('Incorrect email or password. Please try again.'));
    renderAt(<Login />, { route: '/login' });
    await enterPassword('wanjiku@example.com', 'wrong');
    expect(await screen.findByText('Incorrect email or password. Please try again.')).toBeInTheDocument();
  });

  it('A2 + A3: asks for the emailed code, then opens the farmer page', async () => {
    api.login.mockResolvedValue({ twoFactor: true });
    api.verifyCode.mockResolvedValue(USERS.farmer);
    renderAt(<Login />, { route: '/login' });

    await enterPassword();
    expect(api.login).toHaveBeenCalledWith('wanjiku@example.com', 'Password123');
    expect(await screen.findByRole('heading', { name: 'Enter your code' })).toBeInTheDocument();
    expect(screen.getByText(/We emailed a 6-digit code to wanjiku@example.com/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('6-digit code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(api.verifyCode).toHaveBeenCalledWith('123456');
    expect(await screen.findByTestId('location')).toHaveTextContent('/farmer');
  });

  it('A4: a wrong code shows how many tries are left and stays on the code screen', async () => {
    api.login.mockResolvedValue({ twoFactor: true });
    api.verifyCode.mockRejectedValue(new Error('That code is not right. 4 tries left.'));
    renderAt(<Login />, { route: '/login' });
    await enterPassword();
    await userEvent.type(await screen.findByLabelText('6-digit code'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByText('That code is not right. 4 tries left.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Enter your code' })).toBeInTheDocument();
  });

  it('A5: when the server says to log in again, goes back to the password step', async () => {
    api.login.mockResolvedValue({ twoFactor: true });
    api.verifyCode.mockRejectedValue(new Error('Too many wrong codes. Please log in again.'));
    renderAt(<Login />, { route: '/login' });
    await enterPassword();
    await userEvent.type(await screen.findByLabelText('6-digit code'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('Too many wrong codes. Please log in again.')).toBeInTheDocument();
  });

  it('A6: "Resend code" shows the server reply', async () => {
    api.login.mockResolvedValue({ twoFactor: true });
    api.resendCode.mockResolvedValue({ message: 'A new code has been sent to your email.' });
    renderAt(<Login />, { route: '/login' });
    await enterPassword();
    await userEvent.click(await screen.findByRole('button', { name: 'Resend code' }));
    expect(await screen.findByText('A new code has been sent to your email.')).toBeInTheDocument();
  });

  it('sends an admin to the approvals page', async () => {
    api.login.mockResolvedValue({ twoFactor: true });
    api.verifyCode.mockResolvedValue(USERS.admin);
    renderAt(<Login />, { route: '/login' });
    await enterPassword('admin@example.com');
    await userEvent.type(await screen.findByLabelText('6-digit code'), '654321');
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByTestId('location')).toHaveTextContent('/admin');
  });

  it('works in Kiswahili', async () => {
    localStorage.setItem('lang', 'sw');
    const { default: i18n } = await import('../../src/i18n');
    await i18n.changeLanguage('sw');
    renderAt(<Login />, { route: '/login' });
    expect(await screen.findByRole('heading', { name: 'Ingia' })).toBeInTheDocument();
    expect(screen.getByLabelText('Barua pepe')).toBeInTheDocument();
    expect(screen.getByLabelText('Nenosiri')).toBeInTheDocument();
  });
});
