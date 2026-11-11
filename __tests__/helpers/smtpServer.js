// A tiny fake email (SMTP) server for the API tests.
// The real server code sends its emails here through nodemailer, exactly as it would to
// Mailtrap or Gmail, so the tests can read login codes, receipts and reset links.
// It can also be told to refuse emails, to test what happens when sending fails.
import net from 'node:net';

// "=?UTF-8?Q?Payment_receipt_=E2=80=93?=" -> "Payment receipt –"
function decodeHeader(value) {
  return value.replace(/=\?([^?]+)\?([QBqb])\?([^?]*)\?=\s*/g, (_, charset, enc, text) => {
    const bytes = enc.toUpperCase() === 'B'
      ? Buffer.from(text, 'base64')
      : Buffer.from(text.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16))), 'binary');
    return bytes.toString('utf8');
  });
}

// Quoted-printable body ("=3D" means "=", "=" at a line end joins two lines)
function decodeQP(text) {
  const bytes = text.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16)));
  return Buffer.from(bytes, 'binary').toString('utf8');
}

function decodeBody(headers, body) {
  const cte = (headers['content-transfer-encoding'] || '').toLowerCase();
  if (cte === 'quoted-printable') return decodeQP(body);
  if (cte === 'base64') return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8');
  return body;
}

function splitHeaders(raw) {
  const end = raw.indexOf('\r\n\r\n');
  const head = raw.slice(0, end === -1 ? raw.length : end).replace(/\r\n[ \t]+/g, ' ');
  const headers = {};
  for (const line of head.split('\r\n')) {
    const i = line.indexOf(':');
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return { headers, body: end === -1 ? '' : raw.slice(end + 4) };
}

// Turns the raw message into { to, subject, text, html }.
function parseMessage(raw, rcpt) {
  const { headers, body } = splitHeaders(raw);
  const mail = { to: rcpt, subject: decodeHeader(headers.subject || ''), text: '', html: '' };
  const boundary = /boundary="?([^";]+)"?/i.exec(headers['content-type'] || '')?.[1];
  const parts = boundary
    ? body.split(`--${boundary}`).slice(1, -1).map((p) => splitHeaders(p.replace(/^\r\n/, '')))
    : [{ headers, body }];
  for (const part of parts) {
    const type = (part.headers['content-type'] || 'text/plain').toLowerCase();
    if (type.startsWith('text/plain')) mail.text = decodeBody(part.headers, part.body);
    if (type.startsWith('text/html')) mail.html = decodeBody(part.headers, part.body);
  }
  return mail;
}

export function startSmtpServer() {
  const inbox = [];
  const state = { refuse: false };

  const server = net.createServer((socket) => {
    socket.setEncoding('utf8');
    let buffer = '';
    let inData = false;
    let authLinesLeft = 0;
    let rcpt = [];
    const send = (line) => socket.write(`${line}\r\n`);

    send('220 test-smtp ready');
    socket.on('error', () => {});
    socket.on('data', (chunk) => {
      buffer += chunk;
      for (;;) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end === -1) return;
          const raw = buffer.slice(0, end).replace(/\r\n\.\./g, '\r\n.'); // undo "dot stuffing"
          buffer = buffer.slice(end + 5);
          inData = false;
          inbox.push(parseMessage(raw, rcpt));
          send('250 OK queued');
          continue;
        }
        const i = buffer.indexOf('\r\n');
        if (i === -1) return;
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 2);

        if (authLinesLeft) { // AUTH LOGIN: username, then password (any value is accepted)
          authLinesLeft -= 1;
          send(authLinesLeft ? '334 UGFzc3dvcmQ6' : '235 Authenticated');
          continue;
        }
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === 'EHLO') socket.write('250-test-smtp\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n');
        else if (cmd === 'HELO') send('250 test-smtp');
        else if (cmd === 'AUTH') {
          if (/^AUTH LOGIN\s*$/i.test(line)) { authLinesLeft = 2; send('334 VXNlcm5hbWU6'); }
          else if (/^AUTH LOGIN \S+/i.test(line)) { authLinesLeft = 1; send('334 UGFzc3dvcmQ6'); }
          else send('235 Authenticated');
        } else if (cmd === 'MAIL') {
          if (state.refuse) send('550 Mailbox unavailable (refused by the test)');
          else { rcpt = []; send('250 OK'); }
        } else if (cmd === 'RCPT') {
          rcpt.push(line.replace(/^RCPT TO:\s*<?([^>\s]*)>?.*$/i, '$1'));
          send('250 OK');
        } else if (cmd === 'DATA') { inData = true; send('354 End data with <CR><LF>.<CR><LF>'); }
        else if (cmd === 'QUIT') { send('221 Bye'); socket.end(); }
        else send('250 OK');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        inbox,
        // refuse(true): every email fails, as if the mail provider were down
        refuse(on = true) { state.refuse = on; },
        clear() { inbox.length = 0; },
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
