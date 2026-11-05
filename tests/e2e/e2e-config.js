/**
 * Shared settings for the browser end-to-end tests (tests/e2e/README.md).
 * They only ever run against staging: the base URL and project are fixed
 * here, not taken from the environment, so a test can't be pointed at prod.
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://wiof-staging.web.app';
// Staging's public web API key (it ships in the staging app bundle; not a secret).
const API_KEY = 'AIzaSyBru9kG2e19cnaeRwnGIp0zT9Op1DOcvWM';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.E2E_OUT || path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Set ${name} first (staging test account; see tests/e2e/README.md).`);
    process.exit(2);
  }
  return value;
}

// puppeteer-core is not a project dependency; it uses your installed Chrome.
let puppeteer;
try {
  puppeteer = require(process.env.PUPPETEER_CORE_PATH || 'puppeteer-core');
} catch {
  console.error('puppeteer-core not found. Run: npm i --no-save puppeteer-core  (or set PUPPETEER_CORE_PATH).');
  process.exit(2);
}

module.exports = { BASE, API_KEY, CHROME, OUT, puppeteer, requireEnv };
