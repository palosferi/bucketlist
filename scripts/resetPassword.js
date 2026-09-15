#!/usr/bin/env node
/**
 * Sets a user's password from the command line.
 *
 * While signups are closed there is no mail provider configured, so the
 * emailed reset flow cannot deliver anything. This is the recovery path:
 *
 *   docker compose -f docker-compose.bucketlist.yml exec bucketlist \
 *     node scripts/resetPassword.js --email you@example.com
 *
 * With no --password it generates a strong one and prints it once. Like the
 * emailed flow, it invalidates every existing session for that account.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const db = require('../config/db');
const UserModel = require('../models/user');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : null;
}

async function main() {
  const email = (arg('email') || '').trim().toLowerCase();
  let password = arg('password');

  if (!email) {
    console.error('Usage: node scripts/resetPassword.js --email E [--password P]');
    process.exit(1);
  }
  if (password && password.length < 10) {
    console.error('--password must be at least 10 characters.');
    process.exit(1);
  }

  let generated = false;
  if (!password) {
    password = crypto.randomBytes(15).toString('base64url');
    generated = true;
  }

  await db.connectToDatabase();

  const user = await UserModel.findOne({ email });
  if (!user) {
    console.error(`No account for ${email}.`);
    process.exit(1);
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  // Same rule as the emailed reset: logs out every existing session.
  user.sessionsValidFrom = new Date();
  await user.save();

  console.log(`Password updated for ${user.email} (@${user.handle}).`);
  console.log('  All existing sessions have been logged out.');
  if (generated) console.log(`  password: ${password}\n  Save it now — it is not stored anywhere in plain text.`);

  await db.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
