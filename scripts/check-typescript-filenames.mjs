import { lstat, readdir } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const TYPESCRIPT_EXTENSION = /\.(?:[cm]?ts|tsx)$/;
const KEBAB_CASE_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isKebabCaseTypeScriptFilename(filename) {
  const extension = filename.match(TYPESCRIPT_EXTENSION)?.[0];
  if (extension === undefined) return false;

  const stem = filename.slice(0, -extension.length);
  return stem.split('.').every(segment => KEBAB_CASE_SEGMENT.test(segment));
}

async function findInvalidAtPath(path) {
  const stats = await lstat(path);
  if (stats.isFile()) {
    const filename = basename(path);
    if (
      TYPESCRIPT_EXTENSION.test(filename) &&
      !isKebabCaseTypeScriptFilename(filename)
    ) {
      return [path];
    }
    return [];
  }
  if (!stats.isDirectory()) return [];

  const entries = await readdir(path, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  const invalidFiles = await Promise.all(
    entries.map(entry => findInvalidAtPath(join(path, entry.name))),
  );
  return invalidFiles.flat();
}

export async function findInvalidTypeScriptFilenames(paths) {
  const invalidFiles = await Promise.all(paths.map(findInvalidAtPath));
  return invalidFiles.flat().sort();
}

const invokedPath = process.argv[1];
if (
  invokedPath !== undefined &&
  import.meta.url === pathToFileURL(invokedPath).href
) {
  const paths = process.argv.slice(2);
  const invalidFiles = await findInvalidTypeScriptFilenames(
    paths.length > 0 ? paths : ['src', 'test'],
  );

  if (invalidFiles.length > 0) {
    console.error('TypeScript filenames must use lowercase kebab-case:');
    for (const filename of invalidFiles) {
      console.error(`- ${relative(process.cwd(), filename)}`);
    }
    process.exitCode = 1;
  }
}
