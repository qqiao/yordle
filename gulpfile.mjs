/**
 * Yordle - A URL shortener for Google App Engine.
 * Copyright (C) 2017 The Yordle Team
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

/* eslint import-x/no-extraneous-dependencies: "off" */
/* eslint camelcase: "off" */
/* eslint no-console: "off" */
import { exec, spawn } from 'child_process';
import gulp from 'gulp';

const BUILD_DIR = 'dist/';
const CLOUDSDK_CORE_PROJECT =
  process.env.CLOUDSDK_CORE_PROJECT ||
  (() => {
    console.error('No CLOUDSDK_CORE_PROJECT environmental variable set!');
    process.exit(1);
  })();
const DATASTORE_PORT = 23333;
const DATASTORE_HOST = `localhost:${DATASTORE_PORT}`;

const execCommand = (command, cb, options) => {
  const cli = exec(command, options, (err, stdout, stderr) => {
    if (stderr) console.error(stderr);
    cb(err);
  });
  cli.stdout.on('data', data => {
    process.stdout.write(data);
  });
  cli.stderr.on('data', data => {
    process.stderr.write(data);
  });

  return cli;
};

export const buildInfo = cb =>
  execCommand('app-tools buildinfo generate -f build_info.json', cb);

export const copy = gulp.series(buildInfo, () =>
  gulp
    .src(
      [
        'app.yaml',
        'build_info.json',
        'go.sum',
        'go.mod',
        'favicon.ico',
        'lit-localize.json',
        'manifest.json',
        'robots.txt',
        'images/**',
        '*.go',
        '**/*.go',
        '!dist/**',
        '!**/*_test.go',
      ],
      { base: '.' },
    )
    .pipe(gulp.dest(BUILD_DIR)),
);

export const datastoreEmulator = cb => {
  const cmd = [
    `CLOUDSDK_CORE_PROJECT=${CLOUDSDK_CORE_PROJECT}`,
    'gcloud beta emulators datastore start',
    `--no-store-on-disk --host-port=localhost:${DATASTORE_PORT}`,
  ].join(' ');
  return execCommand(cmd, cb);
};

const delay = milliseconds =>
  new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });

const waitForDatastore = async emulator => {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (emulator.exitCode !== null || emulator.signalCode !== null) {
      throw new Error('Datastore emulator exited before becoming ready');
    }

    try {
      const response = await fetch(`http://${DATASTORE_HOST}/`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {
      // The emulator refuses connections until its HTTP server is ready.
    }

    await delay(250);
  }

  throw new Error('Timed out waiting for the Datastore emulator');
};

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}`,
        ),
      );
    });
  });

const stopProcessGroup = async child => {
  if (child.exitCode !== null || child.signalCode !== null) return;

  const exited = new Promise(resolve => child.once('exit', resolve));
  const sendSignal = signal => {
    if (process.platform === 'win32') {
      child.kill(signal);
      return;
    }
    process.kill(-child.pid, signal);
  };

  try {
    sendSignal('SIGTERM');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }

  await Promise.race([exited, delay(5_000)]);
  if (child.exitCode === null && child.signalCode === null) {
    try {
      sendSignal('SIGKILL');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
    await exited;
  }
};

const go = cb => {
  const cmd = [
    `DATASTORE_EMULATOR_HOST=localhost:${DATASTORE_PORT}`,
    `DATASTORE_PROJECT_ID=${CLOUDSDK_CORE_PROJECT}`,
    'go run -tags local .',
  ].join(' ');
  return execCommand(cmd, cb, { cwd: BUILD_DIR });
};

export const test = async () => {
  const datastoreEnvironment = {
    ...process.env,
    CLOUDSDK_CORE_PROJECT,
    DATASTORE_EMULATOR_HOST: DATASTORE_HOST,
    DATASTORE_PROJECT_ID: CLOUDSDK_CORE_PROJECT,
    GOOGLE_CLOUD_PROJECT: CLOUDSDK_CORE_PROJECT,
  };
  const emulator = spawn(
    'gcloud',
    [
      'beta',
      'emulators',
      'datastore',
      'start',
      '--no-store-on-disk',
      '--use-firestore-in-datastore-mode',
      `--host-port=${DATASTORE_HOST}`,
      `--project=${CLOUDSDK_CORE_PROJECT}`,
    ],
    {
      detached: process.platform !== 'win32',
      env: datastoreEnvironment,
      stdio: 'inherit',
    },
  );

  try {
    await waitForDatastore(emulator);
    await runCommand('go', ['test', '-count=1', './...'], {
      cwd: '.',
      env: datastoreEnvironment,
    });
  } finally {
    await stopProcessGroup(emulator);
  }
};

export const deploy = cb => {
  const cmd = [
    'gcloud -q app deploy --no-promote',
    `--project=${CLOUDSDK_CORE_PROJECT}`,
  ].join(' ');
  return execCommand(cmd, cb, {
    cwd: BUILD_DIR,
  });
};

const start = gulp.parallel(datastoreEmulator, go);
export default start;
