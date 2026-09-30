'use strict';

const mongoose = require('mongoose');
const config = require('./index');

// Never logs the password. It reports only structural problems that make Atlas answer
// "bad auth" — a placeholder left in place, quotes or whitespace swallowed from a
// copy/paste, or a password whose symbols were not URL-encoded.
function describeMongoUri(raw) {
  if (!raw) return { findings: ['MONGODB_URI is empty or unset'], username: '' };
  const trimmed = raw.trim();
  const findings = [];
  let username = '';
  if (raw !== trimmed) findings.push('has leading/trailing whitespace');
  if (/^["'].+["']$/.test(trimmed)) findings.push('is wrapped in quotes');
  if (trimmed.startsWith('MONGODB_URI=')) findings.push('includes the "MONGODB_URI=" prefix');
  if (/<[^>]*>/.test(trimmed)) {
    findings.push('still has an <angle-bracket> placeholder — replace <db_username> and <db_password> with real values');
    return { findings, username };
  }

  const noQuery = trimmed.split('?')[0];
  const atCount = (noQuery.match(/@/g) || []).length;
  if (atCount !== 1) {
    findings.push('the credentials hold an unencoded "@" — the password contains symbols that must be percent-encoded, so regenerate it with letters and numbers only');
    return { findings, username };
  }

  let password = '';
  try {
    const u = new URL(trimmed);
    username = decodeURIComponent(u.username || '');
    password = decodeURIComponent(u.password || '');
    if (!username) findings.push('has no username before the colon');
    if (!password) findings.push('has no password between the colon and the "@"');
    else if (password.length < 8) findings.push(`password is only ${password.length} characters`);
    else if (/[^A-Za-z0-9]/.test(password)) {
      findings.push(`password (${password.length} chars) contains symbols — Atlas needs them percent-encoded`);
    }
  } catch (_err) {
    findings.push('cannot be parsed as a mongodb:// connection string');
  }
  return { findings, username };
}

async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  mongoose.set('strictQuery', true);
  const uri = config.env === 'test' ? process.env.TEST_MONGODB_URI || config.mongoUri : config.mongoUri;
  try {
    await mongoose.connect(uri);
  } catch (err) {
    const { findings, username } = describeMongoUri(uri);
    console.error(`[db] connect failed (${err.codeName || err.name}): ${err.message}`);
    console.error(findings.length
      ? `[db] MONGODB_URI looks malformed — ${findings.join('; ')}`
      : `[db] MONGODB_URI is well-formed — it authenticates as Atlas user "${username}", so that user or its password is not what Atlas has`);
    throw err;
  }
  return mongoose.connection;
}

async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = { connectDb, disconnectDb };
