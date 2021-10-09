/**
 * Yordle - A URL shortener for Google App Engine.
 * Copyright (C) 2021 The Yordle Team
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

import { createSpaConfig } from '@open-wc/building-rollup';

import dynamicImportVars from '@rollup/plugin-dynamic-import-vars';
import replace from '@rollup/plugin-replace';
import merge from 'deepmerge';

const production = process.env.ROLLUP_WATCH !== 'true';
const buildType = process.env.BUILD_TYPE;

const ENTRY_POINTS = ['./index.html', './admin.html'];

const createBaseConfig = () =>
  merge(
    createSpaConfig({
      developmentMode: !production,
      injectServiceWorker: false,
      nodeResolve: { browser: true, dedupe: ['lit-html'] },
    }),
    {
      plugins: [
        replace({
          preventAssignment: true,
          values: {
            'process.env.NODE_ENV': JSON.stringify(
              production ? 'production' : 'development'
            ),
            'process.env.BUILD_TYPE': JSON.stringify(buildType),
          },
        }),
        dynamicImportVars.default(),
      ],
    }
  );

export default ENTRY_POINTS.map(entryPoint =>
  merge(createBaseConfig(), {
    input: entryPoint,
  })
);
