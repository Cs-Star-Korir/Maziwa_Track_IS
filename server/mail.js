// One place that sends every email in MaziwaTrack (receipts, reset links, login codes).
const nodemailer = require('nodemailer');

// Create the connection to the SMTP server once, only if mail settings exist.
// Without SMTP_HOST (e.g. a teammate with no mail settings) emails are printed instead.
const transport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465', // port 465 is encrypted from the start; 587/2525 are not
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000, // give up after 10 seconds if the server can't be reached
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })
  : null;

// True when mail settings exist (used to tell "not configured" apart from "failed").
const mailConfigured = () => Boolean(transport);

// Sends one email. Returns true if it was handed to the SMTP server, false otherwise.
// It never throws, so a mail problem can't crash a route or undo a payment.
async function sendMail({ to, subject, text, html }) {
  if (!transport) {
    // No mail settings: show the email in the terminal instead of sending it
    console.log(`[email not configured] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return false;
  }
  try {
    await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text, html });
    return true;
  } catch (err) {
    console.error('Email failed:', err.message);
    return false;
  }
}

// Makes text safe to put inside HTML: a name like "<b>Ann</b>" shows as text instead of formatting.
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// A simple branded layout shared by every email: heading, then the body HTML.
function layout(title, bodyHtml) {
  const coop = escapeHtml(process.env.COOPERATIVE_NAME || 'MaziwaTrack Dairy Cooperative');
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;color:#1f2937">
      <h2 style="color:#1d4ed8;margin:0 0 4px">${coop}</h2>
      <p style="margin:0 0 16px;color:#6b7280">${escapeHtml(title)}</p>
      ${bodyHtml}
      <p style="margin-top:24px;font-size:12px;color:#9ca3af">Sent by MaziwaTrack. Please do not reply to this email.</p>
    </div>`;
}

module.exports = { sendMail, mailConfigured, escapeHtml, layout };