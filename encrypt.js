#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ITERATIONS = 600_000;
const KEY_LEN = 32;
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

const password = process.argv[2];
if (!password) {
  console.error('Usage: node encrypt.js <password>');
  process.exit(1);
}

const src = path.join(__dirname, 'trip-data.js');
const dst = path.join(__dirname, 'trip-data.js.enc');

if (!fs.existsSync(src)) {
  console.error('trip-data.js not found — nothing to encrypt.');
  process.exit(1);
}

const plaintext = fs.readFileSync(src, 'utf8');
const salt = crypto.randomBytes(SALT_LEN);
const iv = crypto.randomBytes(IV_LEN);
const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, 'sha256');

const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();

const blob = Buffer.concat([salt, iv, tag, encrypted]);
fs.writeFileSync(dst, blob.toString('base64'));

console.log(`Encrypted ${plaintext.length} bytes → ${dst} (${blob.length} bytes, base64)`);
