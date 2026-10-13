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

import { spawn } from 'node:child_process';

// POSIX process groups keep go run / gcloud descendants inside our cleanup scope.
// https://nodejs.org/download/release/v24.19.0/docs/api/child_process.html#optionsdetached
export function startCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    ...options,
    detached: process.platform !== 'win32',
  });
  const completion = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        const error = new Error(
          `${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}`,
        );
        error.exitCode = code || 1;
        reject(error);
      }
    });
  });
  // A companion process can fail while the caller is awaiting readiness.
  completion.catch(() => {});
  return { child, completion };
}

export async function stopProcessGroup(child, { graceMs = 5_000 } = {}) {
  if (child.pid === undefined) return;
  const exited =
    child.exitCode !== null || child.signalCode !== null
      ? Promise.resolve()
      : new Promise(resolve => child.once('exit', resolve));
  const sendSignal = signal => {
    try {
      if (process.platform === 'win32') child.kill(signal);
      else process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  };
  sendSignal('SIGTERM');
  let timer;
  try {
    await Promise.race([
      exited,
      new Promise(resolve => {
        timer = setTimeout(resolve, graceMs);
      }),
    ]);
    // Also reap descendants if their parent has already exited.
    sendSignal('SIGKILL');
    await exited;
  } finally {
    clearTimeout(timer);
  }
}
