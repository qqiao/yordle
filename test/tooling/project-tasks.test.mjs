/**
 * Yordle - A URL shortener for Google App Engine.
 * Copyright (C) 2026 The Yordle Team
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import {
  copyApplication,
  waitForDatastore,
} from '../../scripts/project-tasks.mjs';
import { startCommand, stopProcessGroup } from '../../scripts/processes.mjs';

const taskScript = fileURLToPath(
  new URL('../../scripts/project-tasks.mjs', import.meta.url),
);
const requiredFiles = [
  'app.yaml',
  'build_info.json',
  'go.sum',
  'go.mod',
  'favicon.ico',
  'lit-localize.json',
  'manifest.json',
  'robots.txt',
];

// Absolute Node shebangs and a PATH containing only these stubs ensure that even
// the deployment regression can never invoke a real cloud or Go executable.
const stubSource = `#!${process.execPath}
const { appendFileSync, existsSync, writeFileSync } = require('node:fs');
const { createServer } = require('node:http');
const { basename } = require('node:path');
const command = basename(process.argv[1]);
const args = process.argv.slice(2);
const record = event => appendFileSync(process.env.TASK_LOG, JSON.stringify({
  command, pid: process.pid, ...event,
}) + '\\n');
record({ event: 'call', args, cwd: process.cwd(), env: {
  CLOUDSDK_CORE_PROJECT: process.env.CLOUDSDK_CORE_PROJECT,
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
  DATASTORE_PROJECT_ID: process.env.DATASTORE_PROJECT_ID,
  DATASTORE_EMULATOR_HOST: process.env.DATASTORE_EMULATOR_HOST,
} });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    record({ event: 'stop', signal });
    if (command === 'gcloud' && process.env.EMULATOR_MODE === 'ignore-term' && signal === 'SIGTERM') return;
    process.exit(0);
  });
}
if (command === 'app-tools') {
  if (process.env.BUILDINFO_EXIT_CODE) process.exit(Number(process.env.BUILDINFO_EXIT_CODE));
  writeFileSync('build_info.json', '{"generated":true}');
} else if (command === 'gcloud' && args[0] === 'beta') {
  if (process.env.EMULATOR_MODE === 'exit') process.exit(23);
  let requests = 0;
  if (process.env.EMULATOR_MODE !== 'no-listener') createServer((request, response) => {
    const ready = ++requests > 1 && process.env.EMULATOR_MODE !== 'unhealthy';
    record({ event: 'health', ready, url: request.url });
    response.statusCode = ready ? 200 : 503;
    if (ready) writeFileSync(process.env.TASK_READY, 'ready');
    response.end(ready ? 'ok' : 'starting');
  }).listen(23333);
  else setInterval(() => {}, 1000);
  if (process.env.EMULATOR_MODE === 'fail-after-go') {
    setInterval(() => {
      if (existsSync(process.env.TASK_GO_STARTED)) process.exit(23);
    }, 10);
  }
} else if (command === 'go') {
  if (!existsSync(process.env.TASK_READY)) process.exit(91);
  writeFileSync(process.env.TASK_GO_STARTED, 'started');
  if (process.env.GO_MODE === 'hang') setInterval(() => {}, 1000);
  else process.exit(Number(process.env.GO_EXIT_CODE || 0));
} else if (command === 'gcloud') {
  process.exit(Number(process.env.DEPLOY_EXIT_CODE || 0));
}
`;

async function writeFixture(root, files) {
  await Promise.all(
    Object.entries(files).map(async ([name, contents]) => {
      await mkdir(dirname(join(root, name)), { recursive: true });
      await writeFile(join(root, name), contents);
    }),
  );
}

async function readEvents(fixture) {
  const source = await readFile(fixture.log, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  return source.trim() ? source.trim().split('\n').map(JSON.parse) : [];
}

function killGroup(pid) {
  try {
    process.kill(process.platform === 'win32' ? pid : -pid, 'SIGKILL');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
    try {
      process.kill(pid, 'SIGKILL');
    } catch (childError) {
      if (childError.code !== 'ESRCH') throw childError;
    }
  }
}

async function makeFixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'yordle-project-tasks-'));
  const bin = join(root, 'bin');
  const fixture = { root, bin, log: join(root, 'calls.jsonl'), tasks: [] };
  t.after(async () => {
    for (const { child } of fixture.tasks) {
      if (child.exitCode === null && child.signalCode === null)
        killGroup(child.pid);
    }
    for (const event of await readEvents(fixture)) {
      if (event.event === 'call') killGroup(event.pid);
    }
    await Promise.all(fixture.tasks.map(({ done }) => done.catch(() => {})));
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(bin);
  await mkdir(join(root, 'dist'));
  await writeFixture(
    root,
    Object.fromEntries(requiredFiles.map(name => [name, `fixture:${name}`])),
  );
  for (const command of ['app-tools', 'gcloud', 'go']) {
    await writeFile(join(bin, command), stubSource, { mode: 0o755 });
  }
  return fixture;
}

function runTask(fixture, command, extraEnvironment = {}) {
  const child = spawn(process.execPath, [taskScript, command], {
    cwd: fixture.root,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      PATH: fixture.bin,
      CLOUDSDK_CORE_PROJECT: 'local-test',
      GOOGLE_CLOUD_PROJECT: 'must-be-overridden',
      DATASTORE_PROJECT_ID: 'must-be-overridden',
      DATASTORE_EMULATOR_HOST: 'must-be-overridden',
      TASK_LOG: fixture.log,
      TASK_READY: join(fixture.root, 'ready'),
      TASK_GO_STARTED: join(fixture.root, 'go-started'),
      ...extraEnvironment,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', chunk => {
    output += chunk;
  });
  child.stderr.on('data', chunk => {
    output += chunk;
  });
  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      killGroup(child.pid);
      reject(new Error(`Task ${command} did not finish. Output: ${output}`));
    }, 8000);
    child.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, output });
    });
  });
  done.catch(() => {});
  const task = { child, done };
  fixture.tasks.push(task);
  return task;
}

async function waitUntil(predicate, description) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await delay(20);
  }
  assert.fail(`Timed out waiting for ${description}`);
}

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    throw error;
  }
}

async function assertChildrenStopped(fixture) {
  const calls = (await readEvents(fixture)).filter(
    event => event.event === 'call',
  );
  await waitUntil(
    () => calls.every(event => !isRunning(event.pid)),
    'child cleanup',
  );
}

async function listFiles(root, relative = '') {
  const entries = await readdir(join(root, relative), { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(entry => {
      const name = join(relative, entry.name);
      return entry.isDirectory() ? listFiles(root, name) : [name];
    }),
  );
  return nested.flat().sort();
}

// Keep these tests sequential: the production command owns localhost:23333.
test('copies application files with relative paths and excludes generated/hidden/test files', async t => {
  const fixture = await makeFixture(t);
  const included = {
    'main.go': 'package main',
    'api/nested/handler.go': 'package nested',
    'api/with spaces/source.go': 'package withspaces',
    'images/logo.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0xff]),
    'images/nested/icon.svg': '<svg/>',
  };
  await writeFixture(fixture.root, {
    ...included,
    'main_test.go': 'excluded',
    'api/nested/handler_test.go': 'excluded',
    '.hidden.go': 'excluded',
    '.cache/cached.go': 'excluded',
    'api/.cache/hidden.go': 'excluded',
    'node_modules/dependency/dependency.go': 'excluded',
    'out-tsc/generated.go': 'excluded',
    'dist/stale.go': 'existing output',
    'api/node_modules/dependency.go': 'excluded',
    'api/out-tsc/generated.go': 'excluded',
    'api/dist/generated.go': 'excluded',
    'images/.hidden.png': 'excluded',
    'README.md': 'excluded',
  });
  await copyApplication({ cwd: fixture.root });
  assert.deepEqual(
    await listFiles(join(fixture.root, 'dist')),
    [...requiredFiles, ...Object.keys(included), 'stale.go'].sort(),
  );
  for (const [name, contents] of Object.entries(included)) {
    assert.deepEqual(
      await readFile(join(fixture.root, 'dist', name)),
      Buffer.from(contents),
    );
  }
  assert.equal(
    await readFile(join(fixture.root, 'dist', 'app.yaml'), 'utf8'),
    'fixture:app.yaml',
  );
});

test('copy rejects missing required application files', async t => {
  const fixture = await makeFixture(t);
  await rm(join(fixture.root, 'app.yaml'));
  await assert.rejects(copyApplication({ cwd: fixture.root }), /ENOENT/);
});

test('copy generates build metadata before copying it', async t => {
  const fixture = await makeFixture(t);
  const result = await runTask(fixture, 'copy').done;
  assert.equal(result.code, 0, result.output);
  assert.equal(
    await readFile(join(fixture.root, 'dist', 'build_info.json'), 'utf8'),
    '{"generated":true}',
  );
  const calls = (await readEvents(fixture)).filter(
    event => event.event === 'call',
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'app-tools');
  assert.deepEqual(calls[0].args, [
    'buildinfo',
    'generate',
    '-f',
    'build_info.json',
  ]);
  assert.equal(calls[0].cwd, fixture.root);
});

test('copy fails when build metadata generation fails', async t => {
  const fixture = await makeFixture(t);
  const result = await runTask(fixture, 'copy', { BUILDINFO_EXIT_CODE: '17' })
    .done;
  assert.notEqual(result.code, 0, result.output);
  assert.deepEqual(await listFiles(join(fixture.root, 'dist')), []);
});

for (const command of ['copy', 'test', 'start', 'deploy']) {
  test(`${command} requires an explicit project before starting any command`, async t => {
    const fixture = await makeFixture(t);
    const result = await runTask(fixture, command, {
      CLOUDSDK_CORE_PROJECT: '',
    }).done;
    assert.notEqual(result.code, 0, result.output);
    assert.match(result.output, /CLOUDSDK_CORE_PROJECT/);
    assert.deepEqual(await readEvents(fixture), []);
  });
}

for (const [command, expectedArgs, workingDirectory] of [
  ['test', ['test', '-race', '-count=1', './...'], '.'],
  ['start', ['run', '-tags', 'local', '.'], 'dist'],
]) {
  test(`${command} waits for healthy Datastore and supplies the correct Go arguments/environment`, async t => {
    const fixture = await makeFixture(t);
    const result = await runTask(fixture, command).done;
    assert.equal(result.code, 0, result.output);
    const events = await readEvents(fixture);
    const emulator = events.find(
      event => event.command === 'gcloud' && event.event === 'call',
    );
    const go = events.find(
      event => event.command === 'go' && event.event === 'call',
    );
    assert.deepEqual(emulator.args, [
      'beta',
      'emulators',
      'datastore',
      'start',
      '--no-store-on-disk',
      '--use-firestore-in-datastore-mode',
      '--host-port=localhost:23333',
      '--project=local-test',
    ]);
    assert.deepEqual(go.args, expectedArgs);
    assert.equal(go.cwd, join(fixture.root, workingDirectory));
    for (const event of [emulator, go]) {
      assert.deepEqual(event.env, {
        CLOUDSDK_CORE_PROJECT: 'local-test',
        GOOGLE_CLOUD_PROJECT: 'local-test',
        DATASTORE_PROJECT_ID: 'local-test',
        DATASTORE_EMULATOR_HOST: 'localhost:23333',
      });
    }
    const health = events.filter(event => event.event === 'health');
    assert.ok(
      health.some(event => !event.ready),
      'unhealthy responses must be retried',
    );
    const readyIndex = events.findIndex(
      event => event.event === 'health' && event.ready,
    );
    assert.ok(
      readyIndex >= 0 && readyIndex < events.indexOf(go),
      'Go must start after health succeeds',
    );
    await assertChildrenStopped(fixture);
  });
}

for (const host of ['127.0.0.1', '::1']) {
  test(`an occupied ${host} emulator port fails before launching commands`, async t => {
    const fixture = await makeFixture(t);
    const server = createServer((request, response) =>
      response.end('unrelated healthy service'),
    );
    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(23333, host, resolve);
      });
    } catch (error) {
      if (
        host === '::1' &&
        ['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)
      ) {
        t.skip('IPv6 loopback is unavailable on this host');
        return;
      }
      throw error;
    }
    t.after(() => new Promise(resolve => server.close(resolve)));
    const result = await runTask(fixture, 'test', {
      EMULATOR_MODE: 'no-listener',
    }).done;
    assert.notEqual(result.code, 0, result.output);
    assert.deepEqual(
      await readEvents(fixture),
      [],
      'no child may reuse an occupied emulator endpoint',
    );
  });
}

test('a failing Go command fails the task and stops the emulator', async t => {
  const fixture = await makeFixture(t);
  const result = await runTask(fixture, 'test', { GO_EXIT_CODE: '19' }).done;
  assert.notEqual(result.code, 0, result.output);
  await assertChildrenStopped(fixture);
});

test('an emulator that exits before readiness fails without starting Go', async t => {
  const fixture = await makeFixture(t);
  const result = await runTask(fixture, 'test', { EMULATOR_MODE: 'exit' }).done;
  assert.notEqual(result.code, 0, result.output);
  assert.equal(
    (await readEvents(fixture)).some(event => event.command === 'go'),
    false,
  );
  await assertChildrenStopped(fixture);
});

test('an emulator that fails during Go execution fails the task and stops Go', async t => {
  const fixture = await makeFixture(t);
  const result = await runTask(fixture, 'test', {
    EMULATOR_MODE: 'fail-after-go',
    GO_MODE: 'hang',
  }).done;
  assert.notEqual(result.code, 0, result.output);
  assert.ok((await readEvents(fixture)).some(event => event.command === 'go'));
  await assertChildrenStopped(fixture);
});

for (const missingCommand of ['gcloud', 'go']) {
  test(`a missing ${missingCommand} executable fails and cleans up started children`, async t => {
    const fixture = await makeFixture(t);
    await rm(join(fixture.bin, missingCommand));
    const result = await runTask(fixture, 'test').done;
    assert.notEqual(result.code, 0, result.output);
    assert.match(result.output, /ENOENT|spawn/i);
    await assertChildrenStopped(fixture);
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  test(`${signal} interrupts the local server and stops both owned children`, async t => {
    const fixture = await makeFixture(t);
    const task = runTask(fixture, 'start', { GO_MODE: 'hang' });
    await waitUntil(
      async () =>
        (await readEvents(fixture)).some(event => event.command === 'go'),
      'Go startup',
    );
    task.child.kill(signal);
    const result = await task.done;
    assert.notEqual(result.code, 0, result.output);
    await assertChildrenStopped(fixture);
  });
}

test('SIGINT during final cleanup cannot turn an interrupted task into success', async t => {
  const fixture = await makeFixture(t);
  const task = runTask(fixture, 'test', { EMULATOR_MODE: 'ignore-term' });
  await waitUntil(
    async () =>
      (await readEvents(fixture)).some(
        event =>
          event.command === 'gcloud' &&
          event.event === 'stop' &&
          event.signal === 'SIGTERM',
      ),
    'emulator cleanup after Go success',
  );
  task.child.kill('SIGINT');
  const result = await task.done;
  assert.equal(result.code, 130, result.output);
  await assertChildrenStopped(fixture);
});

test('SIGTERM while awaiting readiness stops the emulator without starting Go', async t => {
  const fixture = await makeFixture(t);
  const task = runTask(fixture, 'start', { EMULATOR_MODE: 'unhealthy' });
  await waitUntil(
    async () =>
      (await readEvents(fixture)).some(event => event.event === 'health'),
    'initial health probe',
  );
  task.child.kill('SIGTERM');
  const result = await task.done;
  assert.notEqual(result.code, 0, result.output);
  assert.equal(
    (await readEvents(fixture)).some(event => event.command === 'go'),
    false,
  );
  await assertChildrenStopped(fixture);
});

test('deploy preserves no-promote, the exact project argument, and dist cwd using only a stub', async t => {
  const fixture = await makeFixture(t);
  const project = 'local-test;echo-should-not-run';
  const result = await runTask(fixture, 'deploy', {
    CLOUDSDK_CORE_PROJECT: project,
  }).done;
  assert.equal(result.code, 0, result.output);
  const calls = (await readEvents(fixture)).filter(
    event => event.event === 'call',
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'gcloud');
  assert.deepEqual(calls[0].args, [
    '-q',
    'app',
    'deploy',
    '--no-promote',
    `--project=${project}`,
  ]);
  assert.equal(calls[0].cwd, join(fixture.root, 'dist'));
});

test('deploy propagates a failing stub command', async t => {
  const fixture = await makeFixture(t);
  const result = await runTask(fixture, 'deploy', { DEPLOY_EXIT_CODE: '27' })
    .done;
  assert.notEqual(result.code, 0, result.output);
});

test('readiness times out while the emulator stays alive but unhealthy', async () => {
  const emulator = Object.assign(new EventEmitter(), {
    exitCode: null,
    signalCode: null,
  });
  let requests = 0;
  await assert.rejects(
    waitForDatastore(emulator, {
      timeoutMs: 20,
      fetchHealth: async () => {
        requests += 1;
        return { ok: false };
      },
    }),
    /timed out|timeout/i,
  );
  assert.ok(requests > 0);
});

test('readiness rejects an emulator that already exited', async () => {
  const emulator = Object.assign(new EventEmitter(), {
    exitCode: 23,
    signalCode: null,
  });
  await assert.rejects(
    waitForDatastore(emulator, {
      fetchHealth: async () => ({ ok: true }),
    }),
    /exit|stopp/i,
  );
});

test('process completion reports spawn errors and nonzero exits', async () => {
  const missing = startCommand(
    join(tmpdir(), 'yordle-command-that-does-not-exist'),
    [],
  );
  await assert.rejects(missing.completion, /ENOENT|spawn/i);
  const failing = startCommand(process.execPath, ['-e', 'process.exit(31)']);
  await assert.rejects(failing.completion, /31|failed|exit/i);
});

test('process cleanup escalates when a child ignores SIGTERM', async t => {
  const command = startCommand(
    process.execPath,
    [
      '-e',
      "process.on('SIGTERM', () => {}); process.stdout.write('ready'); setInterval(() => {}, 1000)",
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  t.after(() => stopProcessGroup(command.child, { graceMs: 20 }));
  await new Promise(resolve => command.child.stdout.once('data', resolve));
  await stopProcessGroup(command.child, { graceMs: 20 });
  await assert.rejects(command.completion, /SIGKILL|signal|exit/i);
  assert.equal(isRunning(command.child.pid), false);
});

test('process cleanup stops descendants after their parent has exited', async t => {
  const descendant =
    "process.stdout.write('descendant-ready'); setInterval(() => {}, 1000)";
  const source = `
    const { spawn } = require('node:child_process');
    spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], {
      stdio: ['ignore', 1, 2],
    }).unref();
  `;
  const command = startCommand(process.execPath, ['-e', source], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => killGroup(command.child.pid));
  await new Promise(resolve => command.child.stdout.once('data', resolve));
  await command.completion;
  assert.equal(command.child.exitCode, 0);
  const stdoutClosed = new Promise(resolve =>
    command.child.stdout.once('close', resolve),
  );
  await stopProcessGroup(command.child, { graceMs: 20 });
  let timeout;
  try {
    await Promise.race([
      stdoutClosed,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Descendant still owns stdout after cleanup')),
          1000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
});
