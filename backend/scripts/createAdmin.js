#!/usr/bin/env node

const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const emailArg = process.argv.slice(2).find(arg => arg.startsWith('--email='));
const email = emailArg && emailArg.slice('--email='.length).trim();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: node scripts/createAdmin.js --email=admin@example.com');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
  process.exit(1);
}

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function promptPassword() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Run this script in an interactive terminal to enter the password securely.');
  }

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const stdin = process.stdin;
    let password = '';

    process.stdout.write('Admin password (input hidden): ');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (key) => {
      if (key === '\u0003') {
        stdin.setRawMode(false);
        stdin.removeListener('data', onData);
        rl.close();
        reject(new Error('Password entry cancelled.'));
      } else if (key === '\r' || key === '\n') {
        stdin.setRawMode(false);
        stdin.removeListener('data', onData);
        rl.close();
        process.stdout.write('\n');
        resolve(password);
      } else if (key === '\u007f' || key === '\b') {
        password = password.slice(0, -1);
      } else {
        password += key;
      }
    };

    stdin.on('data', onData);
  });
}

async function createAdmin() {
  const password = await promptPassword();
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
  });

  if (error) throw error;

  console.log(`Admin account created for ${data.user.email} (${data.user.id}).`);
}

createAdmin().catch((error) => {
  console.error('Admin provisioning failed:', error.message);
  process.exitCode = 1;
});
