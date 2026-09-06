#!/usr/bin/env node
/**
 * Runs the Firestore/Storage security-rules emulator tests (tests/rules/)
 * without depending on — or changing — the machine's default JAVA_HOME/PATH.
 *
 * firebase-tools' bundled emulators require Java 21+. This machine's default
 * `java` may still be an older version used by other tools, so this wrapper
 * locates a JDK 21+ install itself and only overrides the environment for
 * this one child process.
 *
 * Invoked as `npm run test:rules`, and automatically before every
 * `npm run deploy:*` script via npm's pre<script> convention.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CANDIDATE_JDK_DIRS = [
  'C:\\Program Files\\Eclipse Adoptium',
  'C:\\Program Files\\Java'
];

/** Returns the install dir of the highest-major JDK >= 21 found, or null. */
function findJdk21Plus() {
  let best = null;
  let bestMajor = 0;

  for (const dir of CANDIDATE_JDK_DIRS) {
    if (!fs.existsSync(dir)) continue;

    for (const name of fs.readdirSync(dir)) {
      const match = name.match(/^jdk-?(\d+)/i);
      if (!match) continue;
      const major = parseInt(match[1], 10);
      if (major >= 21 && major > bestMajor) {
        bestMajor = major;
        best = path.join(dir, name);
      }
    }
  }

  return best;
}

const jdkHome = findJdk21Plus();
const env = { ...process.env };

if (jdkHome) {
  env.JAVA_HOME = jdkHome;
  env.PATH = `${path.join(jdkHome, 'bin')}${path.delimiter}${process.env.PATH || ''}`;
} else {
  console.warn(
    'WARNING: No JDK 21+ found under known install locations (checked: ' +
    CANDIDATE_JDK_DIRS.join(', ') + ').\n' +
    '         Falling back to the default `java` on PATH — the Firestore/Storage\n' +
    '         emulators require Java 21+ and will fail to start on an older one.'
  );
}

// Built as a single command-line string (rather than an args array) because
// `shell: true` does not add quoting around array elements — the quoted
// inner command here must survive as one argument to `emulators:exec`.
const command =
  'firebase emulators:exec --project demo-wiof-rules-test --only firestore,storage ' +
  '"node --test --test-concurrency=1 tests/rules"';

const result = spawnSync(command, { stdio: 'inherit', shell: true, env });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
