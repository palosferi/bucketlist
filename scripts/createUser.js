#!/usr/bin/env node
/**
 * Creates an account from the command line.
 *
 * This is how accounts are made while public signups are closed. Run it inside
 * the container so it uses the same database and environment:
 *
 *   docker compose exec bucketlist node scripts/createUser.js \
 *     --email you@example.com --handle feri --name "Feri" --verified
 *
 * With no --password it generates a strong one and prints it once.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const db = require('../config/db');
const UserModel = require('../models/user');
const ListModel = require('../models/list');
const { RESERVED_HANDLES } = require('../lib/validate');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : null;
}
const has = (name) => process.argv.includes(`--${name}`);

async function main() {
  const email = (arg('email') || '').trim().toLowerCase();
  const handle = (arg('handle') || '').trim().toLowerCase();
  const name = arg('name') || handle;
  let password = arg('password');

  const problems = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push('--email must be a valid address');
  if (!/^[a-z0-9-]{3,30}$/.test(handle)) problems.push('--handle must be 3-30 chars of a-z, 0-9, -');
  if (RESERVED_HANDLES.has(handle)) problems.push(`--handle "${handle}" is reserved`);
  if (password && password.length < 10) problems.push('--password must be at least 10 characters');
  if (problems.length) {
    console.error('Cannot create the account:');
    for (const p of problems) console.error(`  - ${p}`);
    console.error('\nUsage: node scripts/createUser.js --email E --handle H [--name N] [--password P] [--verified]');
    process.exit(1);
  }

  let generated = false;
  if (!password) {
    password = crypto.randomBytes(15).toString('base64url');
    generated = true;
  }

  await db.connectToDatabase();

  const clash = await UserModel.findOne({ $or: [{ email }, { handle }] });
  if (clash) {
    console.error(`An account already uses that ${clash.email === email ? 'email' : 'handle'}.`);
    process.exit(1);
  }

  const user = await UserModel.create({
    email,
    handle,
    displayName: name,
    passwordHash: await bcrypt.hash(password, 12),
    emailVerifiedAt: has('verified') ? new Date() : null,
  });

  await ListModel.create({
    name: 'My Bucketlist',
    _owner: user._id,
    visibility: 'private',
    isDefault: true,
  });

  console.log(`Created ${user.displayName} <${user.email}> @${user.handle}`);
  console.log(`  verified: ${user.emailVerifiedAt ? 'yes' : 'no (cannot publish until verified)'}`);
  if (generated) console.log(`  password: ${password}\n  Save it now — it is not stored anywhere in plain text.`);

  await db.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
