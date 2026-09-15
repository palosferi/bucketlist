const config = require('./config');

/**
 * Sends transactional mail through Resend's HTTP API.
 *
 * Resend rather than direct SMTP because this runs from a home connection, and
 * residential IP ranges are blocklisted by essentially every inbox provider —
 * verification mail sent directly would silently never arrive.
 *
 * With no API key configured (development, or before the key is set) mail is
 * logged to the console instead of being dropped, so the flows stay testable.
 */
async function send({ to, subject, text, html }) {
  if (!config.resendApiKey) {
    // The body carries a bearer link. In development printing it is the point;
    // in production it would put a working reset token into the container logs,
    // defeating the fact that only a hash of it is stored.
    console.warn(`[mail] no RESEND_API_KEY; dropped "${subject}" for ${to}`);
    if (!config.isProd) console.warn(`[mail] body (dev only):\n${text}`);
    return { delivered: false, reason: 'no-api-key' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: config.mailFrom, to: [to], subject, text, html }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // Surfaced to the caller, never to the visitor: a mail failure must not
    // reveal whether an address is registered.
    throw new Error(`Resend responded ${res.status}: ${detail.slice(0, 200)}`);
  }

  return { delivered: true };
}

const layout = (heading, body, action) => `
<!doctype html>
<html><body style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#16202c;line-height:1.55">
  <h2 style="margin:0 0 12px">${heading}</h2>
  <p style="margin:0 0 16px">${body}</p>
  ${action ? `<p style="margin:0 0 16px"><a href="${action.href}" style="display:inline-block;padding:10px 18px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${action.label}</a></p>
  <p style="margin:0 0 8px;color:#5d6b7a;font-size:13px">Or paste this into your browser:<br><span style="word-break:break-all">${action.href}</span></p>` : ''}
  <p style="margin:24px 0 0;color:#5d6b7a;font-size:13px">${config.brand}</p>
</body></html>`;

function sendVerification(to, token) {
  const href = config.url(`/verify?token=${encodeURIComponent(token)}`);
  return send({
    to,
    subject: `Confirm your email for ${config.brand}`,
    text: `Confirm your email address by opening this link:\n\n${href}\n\nIt expires in 24 hours. If you did not sign up, ignore this message.`,
    html: layout(
      'Confirm your email',
      'Tap the button to confirm this address. The link expires in 24 hours. If you did not sign up, you can ignore this message.',
      { href, label: 'Confirm email' }
    ),
  });
}

function sendPasswordReset(to, token) {
  const href = config.url(`/reset?token=${encodeURIComponent(token)}`);
  return send({
    to,
    subject: `Reset your ${config.brand} password`,
    text: `Reset your password by opening this link:\n\n${href}\n\nIt expires in 1 hour. If you did not ask for this, ignore this message — your password will not change.`,
    html: layout(
      'Reset your password',
      'Tap the button to choose a new password. The link expires in 1 hour. If you did not ask for this, ignore this message and nothing will change.',
      { href, label: 'Choose a new password' }
    ),
  });
}

module.exports = { send, sendVerification, sendPasswordReset };
