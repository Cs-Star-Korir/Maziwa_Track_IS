// Email helpers (server/mail.js). With no SMTP_HOST, emails are printed in the terminal (X7).
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
let mail;

beforeAll(() => {
  vi.stubEnv('SMTP_HOST', ''); // no mail settings, as on a teammate's machine without Mailtrap
  vi.stubEnv('COOPERATIVE_NAME', 'Test Dairy <Co-op>');
  mail = require('../../server/mail.js');
});

afterAll(() => vi.unstubAllEnvs());

describe('escapeHtml', () => {
  it('makes names safe to put inside an email', () => {
    expect(mail.escapeHtml('<b>Ann</b> & "Bob" \'O\'')).toBe('&lt;b&gt;Ann&lt;/b&gt; &amp; &quot;Bob&quot; &#39;O&#39;');
  });
});

describe('layout', () => {
  it('wraps the body with the cooperative name (escaped) and the title', () => {
    const html = mail.layout('Payment receipt', '<p>Body</p>');
    expect(html).toContain('Test Dairy &lt;Co-op&gt;');
    expect(html).toContain('Payment receipt');
    expect(html).toContain('<p>Body</p>');
    expect(html).toContain('Please do not reply');
  });
});

describe('sending without mail settings', () => {
  it('X7: reports mail as not configured', () => {
    expect(mail.mailConfigured()).toBe(false);
  });

  it('X7: prints the email in the terminal instead and returns false, never throwing', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const sent = await mail.sendMail({ to: 'a@example.com', subject: 'Your MaziwaTrack login code: 123456', text: 'Code 123456' });
    expect(sent).toBe(false);
    const printed = log.mock.calls.flat().join('\n');
    expect(printed).toContain('[email not configured] To: a@example.com');
    expect(printed).toContain('123456');
    log.mockRestore();
  });
});
