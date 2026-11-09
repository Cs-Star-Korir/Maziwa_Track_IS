// The backend answers in English. This turns its known messages into the
// current language. Unknown messages are shown as they are.
import i18n from './index';
import en from './en.json';

// exact message -> key, built from the "server" section of en.json
const exact = Object.fromEntries(
  Object.entries(en.server)
    .filter(([, text]) => !text.includes('{{'))
    .map(([key, text]) => [text, `server.${key}`])
);

// messages with a number or field name inside
const patterns = [
  [/^That code is not right\. (\d+) tries? left\.$/, (m) => i18n.t('server.codeWrong', { count: m[1] })],
  [/^Please wait (\d+) seconds? before asking for a new code\.$/, (m) => i18n.t('server.wait', { seconds: m[1] })],
  [/must be (a date )?like \d{4}-\d{2}-\d{2}\.?$/, () => i18n.t('server.badDate')],
];

export function translateServer(msg) {
  if (!msg || typeof msg !== 'string' || i18n.language === 'en') return msg;
  if (exact[msg]) return i18n.t(exact[msg]);
  if (msg === 'Failed to fetch' || msg === 'Load failed' || msg.startsWith('NetworkError')) return i18n.t('errors.network');
  for (const [re, fn] of patterns) {
    const m = msg.match(re);
    if (m) return fn(m);
  }
  return msg;
}
