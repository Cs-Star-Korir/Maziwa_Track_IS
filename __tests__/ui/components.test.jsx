// Small shared components: status label, language switch (NFR3), appearance switch (X4), pop-up.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import i18n from '../../src/i18n';
import LanguageToggle from '../../src/components/LanguageToggle';
import Modal from '../../src/components/Modal';
import StatusBadge from '../../src/components/StatusBadge';
import ThemeToggle from '../../src/components/ThemeToggle';

describe('StatusBadge', () => {
  it.each([
    ['recorded', 'Recorded', 'text-bg-secondary'],
    ['passed', 'Passed', 'text-bg-primary'],
    ['rejected', 'Rejected', 'text-bg-danger'],
    ['paid', 'Paid', 'text-bg-success'],
  ])('shows %s as "%s" in its colour', (status, label, colour) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toHaveClass('badge', colour);
  });

  it('shows the status in Kiswahili', async () => {
    await i18n.changeLanguage('sw');
    render(<StatusBadge status="paid" />);
    expect(screen.getByText('Imelipwa')).toBeInTheDocument();
  });
});

describe('LanguageToggle (EN | SW)', () => {
  it('switches the whole app to Kiswahili, sets <html lang> and remembers the choice', async () => {
    render(<LanguageToggle />);
    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(screen.getByRole('radio', { name: 'Kiswahili' }));

    expect(i18n.language).toBe('sw');
    expect(document.documentElement.lang).toBe('sw');
    expect(localStorage.getItem('lang')).toBe('sw');
    expect(screen.getByRole('radiogroup', { name: 'Lugha' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Kiswahili' })).toHaveAttribute('aria-checked', 'true');
  });
});

describe('ThemeToggle', () => {
  it('X4: switches to dark and light and remembers the choice', async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'light');
  });
});

describe('Modal', () => {
  it('shows the title and content, and closes with the × button', async () => {
    const onClose = vi.fn();
    render(<Modal title="Receipt" onClose={onClose}><p>Amount paid</p></Modal>);
    expect(screen.getByRole('dialog')).toHaveTextContent('Receipt');
    expect(screen.getByText('Amount paid')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
