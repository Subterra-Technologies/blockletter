#!/usr/bin/env node
/**
 * The examples install Blockletter the way an app does: from npm once the packages are published,
 * and until then from the tarballs `npm pack` makes of this repository's packages. A tarball holds
 * exactly the files `npm publish` would upload, so an example exercises the `exports`, the types,
 * the stylesheet and the dependencies a user gets, not the workspace source.
 *
 *   node scripts/examples.mjs pack               build both packages and pack them into examples/.packs
 *   node scripts/examples.mjs install [name...]  install every example, or the ones named, against them
 *
 * `install` runs `npm install --no-save <tarballs>` in an example, for the Blockletter packages its
 * package.json lists. npm takes those packages from the tarballs and everything else from the
 * registry, and writes neither package.json nor a lockfile, so the example keeps the version ranges
 * it will install from npm once the packages are published.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const examplesDir = join(root, 'examples');
const packsDir = join(examplesDir, '.packs');

/** The packages the examples use, by workspace. */
const PACKAGES = [
  { name: '@subterra-technologies/blockletter', workspace: 'packages/core' },
  { name: '@subterra-technologies/blockletter-react', workspace: 'packages/react' },
];

/**
 * `@subterra-technologies/blockletter-react` → `blockletter-react.tgz`: the same name whatever the
 * version, so the commands in the examples' READMEs never change.
 */
const tarballName = (name) => `${name.split('/').pop()}.tgz`;

/**
 * Runs npm with the npm that launched this script when there is one (`npm run examples:pack`), so
 * no shell is needed to find `npm.cmd` on Windows.
 */
function npm(args, options = {}) {
  const execPath = process.env.npm_execpath;
  const [command, commandArgs] = execPath ? [process.execPath, [execPath, ...args]] : ['npm', args];
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: !execPath && process.platform === 'win32',
    ...options,
  });
  if (result.status !== 0) {
    console.error(
      `npm ${args.join(' ')} failed${options.cwd ? ` in ${relative(root, options.cwd)}` : ''}.`,
    );
    process.exit(result.status ?? 1);
  }
  return result;
}

function pack() {
  const workspaces = PACKAGES.flatMap(({ workspace }) => ['-w', workspace]);
  npm(['run', 'build', ...workspaces]);

  rmSync(packsDir, { recursive: true, force: true });
  mkdirSync(packsDir, { recursive: true });
  const result = npm(['pack', ...workspaces, '--pack-destination', packsDir, '--json'], {
    stdio: ['inherit', 'pipe', 'inherit'],
    encoding: 'utf8',
  });
  for (const { name, filename } of JSON.parse(result.stdout)) {
    renameSync(join(packsDir, filename), join(packsDir, tarballName(name)));
  }

  console.log(`\nPacked into ${relative(root, packsDir)}/:`);
  for (const { name } of PACKAGES) console.log(`  ${tarballName(name)}  ${name}`);
  console.log('\nInstall the examples against them with `npm run examples:install`.');
}

/** Every example: a directory under examples/ with a package.json. */
const examples = () =>
  readdirSync(examplesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(examplesDir, name, 'package.json')));

function install(names) {
  const all = examples();
  const unknown = names.filter((name) => !all.includes(name));
  if (unknown.length > 0) {
    console.error(`No such example: ${unknown.join(', ')}. The examples are ${all.join(', ')}.`);
    process.exit(1);
  }
  const missing = PACKAGES.filter(({ name }) => !existsSync(join(packsDir, tarballName(name))));
  if (missing.length > 0) {
    console.error('The packages are not packed yet. Run `npm run examples:pack` first.');
    process.exit(1);
  }

  for (const example of names.length > 0 ? names : all) {
    const dir = join(examplesDir, example);
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const listed = { ...manifest.dependencies, ...manifest.devDependencies };
    const tarballs = PACKAGES.filter(({ name }) => name in listed).map(
      ({ name }) => `../.packs/${tarballName(name)}`,
    );
    console.log(`\n${example}: npm install --no-save ${tarballs.join(' ')}`);
    npm(['install', '--no-save', '--no-audit', '--no-fund', ...tarballs], { cwd: dir });
  }
}

const [command, ...args] = process.argv.slice(2);
if (command === 'pack') {
  pack();
} else if (command === 'install') {
  install(args);
} else {
  console.error('Usage: node scripts/examples.mjs pack | install [example...]');
  process.exit(1);
}
