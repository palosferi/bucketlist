/**
 * Central runtime configuration. Everything the app needs to know about the
 * outside world is read here once, so nothing else reaches into process.env.
 */
const isProd = process.env.NODE_ENV === 'production';

/** Absolute base URL, used in emails where a relative link is meaningless. */
const baseUrl = (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/**
 * Path the app is mounted under, e.g. '/adventures'. Empty when it owns the
 * whole origin. Normalised to have a leading slash and no trailing one, so
 * `basePath + '/lists'` is always well formed.
 */
const basePath = (process.env.BASE_PATH || '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/^(?!\/)(.+)/, '/$1');

module.exports = {
  isProd,
  baseUrl,
  basePath,
  /** Prefixes an app-absolute path with the mount point. */
  path: (p) => `${basePath}${p.startsWith('/') ? p : `/${p}`}`,
  // Signups are closed by default: opening them means accepting responsibility
  // for other people's data, so it has to be a deliberate act.
  signupsOpen: process.env.SIGNUPS_OPEN === 'true',
  brand: process.env.BRAND_NAME || 'Adventures',
  port: Number.parseInt(process.env.PORT || '3000', 10),
  sessionSecret: process.env.SESSION_SECRET,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bucketlist',
  resendApiKey: process.env.RESEND_API_KEY || '',
  mailFrom: process.env.MAIL_FROM || 'Adventures <onboarding@resend.dev>',
  // Contact address shown in the privacy policy and abuse reports.
  contactEmail: process.env.CONTACT_EMAIL || '',
  url: (p) => `${baseUrl}${basePath}${p.startsWith('/') ? p : `/${p}`}`,
};
