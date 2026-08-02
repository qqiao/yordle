import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  findInvalidTypeScriptFilenames,
  isKebabCaseTypeScriptFilename,
} from '../../scripts/check-typescript-filenames.mjs';

test('accepts kebab-case TypeScript filenames and conventional suffixes', () => {
  for (const filename of [
    'locale.mts',
    'short-url.mts',
    'short-url.test.mts',
    'component.spec.tsx',
    'global.d.ts',
  ]) {
    assert.equal(isKebabCaseTypeScriptFilename(filename), true, filename);
  }
});

test('rejects camelCase, PascalCase, snake_case, and malformed kebab-case', () => {
  for (const filename of [
    'shortUrl.mts',
    'YordleAdmin.ts',
    'short_url.ts',
    'short--url.ts',
    'short-.ts',
  ]) {
    assert.equal(isKebabCaseTypeScriptFilename(filename), false, filename);
  }
});

test('recursively reports invalid TypeScript filenames and ignores other files', async t => {
  const root = await mkdtemp(join(tmpdir(), 'yordle-filenames-'));
  t.after(() => rm(root, { force: true, recursive: true }));

  await mkdir(join(root, 'nested'));
  await Promise.all([
    writeFile(join(root, 'short-url.mts'), ''),
    writeFile(join(root, 'shortUrl.mts'), ''),
    writeFile(join(root, 'readme.md'), ''),
    writeFile(join(root, 'nested', 'YordleAdmin.ts'), ''),
    writeFile(join(root, 'nested', 'valid-component.ts'), ''),
  ]);

  assert.deepEqual(await findInvalidTypeScriptFilenames([root]), [
    join(root, 'nested', 'YordleAdmin.ts'),
    join(root, 'shortUrl.mts'),
  ]);
});
