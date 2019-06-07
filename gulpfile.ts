// Yordle - A URL shortener for Google App Engine.
// Copyright (C) 2017 The Yordle Team
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program; if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.

/* eslint camelcase: "off" */
/* eslint no-console: "off" */
import {ChildProcess, exec} from 'child_process';
import gulp from 'gulp';

import ts from 'gulp-typescript';

const BUILD_DIR = 'dist/';
const CLOUDSDK_CORE_PROJECT = process.env.CLOUDSDK_CORE_PROJECT || (() => {
    console.error('No CLOUDSDK_CORE_PROJECT environmental variable set!');
    process.exit(1);
})();
const DATASTORE_PORT = 23333;

const execCommand = (command, cb, options?) :ChildProcess => {
    let cli = exec(command, options, (err, stdout, stderr) => {
        stderr && console.error(stderr);
        cb(err);
    });
    cli.stdout.on('data', (data) => {
        process.stdout.write(data);
    });
    cli.stderr.on('data', (data) => {
        process.stderr.write(data);
    });

    return cli;
};

export const buildInfo = (cb) => {
    return execCommand('app-tools buildinfo generate -f build_info.json',
        cb);
};

export const datastoreEmulator = (cb) => {
    const cmd = [
        `CLOUDSDK_CORE_PROJECT=${CLOUDSDK_CORE_PROJECT}`,
        'gcloud beta emulators datastore start',
        `--no-store-on-disk --host-port=localhost:${DATASTORE_PORT}`,
    ].join(' ');
    return execCommand(cmd, cb);
};

const go = (cb) => {
    const cmd = [
        `DATASTORE_EMULATOR_HOST=localhost:${DATASTORE_PORT}`,
        `DATASTORE_PROJECT_ID=${CLOUDSDK_CORE_PROJECT}`,
        'go run -tags local .',
    ].join(' ');
    return execCommand(cmd, cb, {cwd: BUILD_DIR});
};

const watch = (cb) => {
    return execCommand('rollup -w -c rollup.config.ts', cb);
}

export const copy = gulp.series(buildInfo, () => {
    return gulp.src([
        'app.yaml',
        'build_info.json',
        '*.go',
        'go.sum',
        'go.mod',
        '**/*.go',
        '!**/*_test.go',
    ], {base: '.'}).pipe(gulp.dest(BUILD_DIR));
});

export const test = gulp.parallel(datastoreEmulator, (cb) => {
    const cmd = [
        `DATASTORE_EMULATOR_HOST=localhost:${DATASTORE_PORT}`,
        `DATASTORE_PROJECT_ID=${CLOUDSDK_CORE_PROJECT}`,
        'SERVER_ENV=dev',
        'go test ./...',
    ].join(' ');
    return execCommand(cmd, cb, {
        cwd: '.',
    });
});

export const deploy = (cb) => {
    const cmd = [
        'gcloud -q app deploy --no-promote',
        `--project=${CLOUDSDK_CORE_PROJECT}`
    ].join(' ');
    return execCommand(cmd, cb, {
        cwd: BUILD_DIR,
    });
};

const start = gulp.series(copy, gulp.parallel(datastoreEmulator, watch, go));
export default start;
