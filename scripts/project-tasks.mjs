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

/* eslint no-console: "off" */
import { lookup } from 'node:dns/promises';
import { copyFile, glob, mkdir, stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { startCommand, stopProcessGroup } from './processes.mjs';

const DATASTORE_HOST = 'localhost:23333';
const REQUIRED_FILES = [
  'app.yaml',
  'build_info.json',
  'go.sum',
  'go.mod',
  'favicon.ico',
  'lit-localize.json',
  'manifest.json',
  'robots.txt',
];

export async function copyApplication({ cwd = process.cwd() } = {}) {
  const copy = async relative => {
    const source = join(cwd, relative);
    const destination = join(cwd, 'dist', relative);
    if ((await stat(source)).isDirectory()) {
      await mkdir(destination, { recursive: true });
    } else {
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(source, destination);
    }
  };
  for (const file of REQUIRED_FILES) await copy(file);
  // Native glob keeps the old relative layout without another glob dependency.
  // https://nodejs.org/download/release/v24.19.0/docs/api/fs.html#fspromisesglobpattern-options
  for await (const file of glob(['images/**', '**/*.go'], {
    cwd,
    exclude: [
      '**/dist/**',
      '**/node_modules/**',
      '**/out-tsc/**',
      '**/*_test.go',
    ],
  }))
    await copy(file);
}

export async function waitForDatastore(
  child,
  { timeoutMs = 30_000, fetchHealth = fetch, signal } = {},
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error('Datastore emulator exited before becoming ready');
    }
    try {
      const timeout = AbortSignal.timeout(
        Math.min(1_000, Math.max(1, deadline - Date.now())),
      );
      const response = await fetchHealth(`http://${DATASTORE_HOST}/`, {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (response.ok) return;
    } catch {
      signal?.throwIfAborted();
    }
    await delay(Math.min(250, Math.max(0, deadline - Date.now())), undefined, {
      signal,
    });
  }
  throw new Error('Timed out waiting for the Datastore emulator');
}

async function requireFreeDatastorePort() {
  // fetch may fall back between IPv6 and IPv4; check every localhost address.
  const addresses = await lookup('localhost', { all: true });
  for (const address of new Set(addresses.map(entry => entry.address))) {
    const server = createServer();
    try {
      await new Promise((done, reject) => {
        server.once('error', reject);
        server.listen({ port: 23333, host: address, ipv6Only: true }, () =>
          server.close(done),
        );
      });
    } catch (error) {
      if (!['EADDRNOTAVAIL', 'EAFNOSUPPORT'].includes(error.code)) throw error;
    }
  }
}

export async function runProjectTask(task) {
  if (!['copy', 'test', 'start', 'deploy'].includes(task)) {
    throw new Error(
      'Usage: node scripts/project-tasks.mjs copy|test|start|deploy',
    );
  }
  const project = process.env.CLOUDSDK_CORE_PROJECT;
  if (!project)
    throw new Error('No CLOUDSDK_CORE_PROJECT environmental variable set!');
  const cwd = process.cwd();
  const controller = new AbortController();
  const children = [];
  let rejectInterrupted;
  let interruptionError;
  const interrupted = new Promise((_, reject) => {
    rejectInterrupted = reject;
  });
  interrupted.catch(() => {});
  const onSignal = signal => {
    if (interruptionError) return;
    const error = new Error(`Interrupted by ${signal}`);
    error.exitCode = signal === 'SIGINT' ? 130 : 143;
    interruptionError = error;
    controller.abort(error);
    rejectInterrupted(error);
  };
  const onInterrupt = () => onSignal('SIGINT');
  const onTerminate = () => onSignal('SIGTERM');
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);
  const launch = (command, args, options = {}) => {
    controller.signal.throwIfAborted();
    const processHandle = startCommand(command, args, { cwd, ...options });
    children.push(processHandle.child);
    return processHandle;
  };
  const execute = async () => {
    if (task === 'copy') {
      await launch('app-tools', [
        'buildinfo',
        'generate',
        '-f',
        'build_info.json',
      ]).completion;
      controller.signal.throwIfAborted();
      await copyApplication({ cwd });
      return;
    }
    if (task === 'deploy') {
      await launch(
        'gcloud',
        ['-q', 'app', 'deploy', '--no-promote', `--project=${project}`],
        {
          cwd: join(cwd, 'dist'),
        },
      ).completion;
      return;
    }
    await requireFreeDatastorePort();
    const env = {
      ...process.env,
      CLOUDSDK_CORE_PROJECT: project,
      DATASTORE_EMULATOR_HOST: DATASTORE_HOST,
      DATASTORE_PROJECT_ID: project,
      GOOGLE_CLOUD_PROJECT: project,
    };
    const emulator = launch(
      'gcloud',
      [
        'beta',
        'emulators',
        'datastore',
        'start',
        '--no-store-on-disk',
        '--use-firestore-in-datastore-mode',
        `--host-port=${DATASTORE_HOST}`,
        `--project=${project}`,
      ],
      { env },
    );
    const emulatorExit = emulator.completion.then(() => {
      throw new Error('Datastore emulator exited unexpectedly');
    });
    emulatorExit.catch(() => {});
    await Promise.race([
      waitForDatastore(emulator.child, { signal: controller.signal }),
      emulatorExit,
    ]);
    const go = launch(
      'go',
      task === 'test'
        ? ['test', '-race', '-count=1', './...']
        : ['run', '-tags', 'local', '.'],
      {
        cwd: task === 'start' ? join(cwd, 'dist') : cwd,
        env,
      },
    );
    await Promise.race([go.completion, emulatorExit]);
  };
  let failure;
  try {
    await Promise.race([execute(), interrupted]);
  } catch (error) {
    failure = error;
  } finally {
    controller.abort();
    try {
      await Promise.all(children.map(child => stopProcessGroup(child)));
    } catch (error) {
      failure ||= error;
    } finally {
      process.off('SIGINT', onInterrupt);
      process.off('SIGTERM', onTerminate);
    }
  }
  // A signal can arrive after execute() succeeded, while cleanup is pending.
  if (interruptionError) throw interruptionError;
  if (failure) throw failure;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    await runProjectTask(process.argv[2]);
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode || 1;
  }
}
