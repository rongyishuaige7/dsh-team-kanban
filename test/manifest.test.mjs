import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* The bundle identity is spelled in three places the host reads independently:
   the package manifest, the loader id inside `client.js`, and the row that
   `cordis.patch.yml` inserts into a profile. A rename that misses one of them
   installs cleanly and then silently never loads, so pin them together here. */
const ROOT = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('package.json', ROOT), 'utf8'));
const source = readFileSync(new URL('client.js', ROOT), 'utf8');
const patch = readFileSync(new URL('cordis.patch.yml', ROOT), 'utf8');

function constant(name) {
  const match = source.match(new RegExp(`const ${name} = '([^']+)';`));
  assert.ok(match, `client.js no longer declares ${name}`);
  return match[1];
}

test('the loader id, PKG and package name agree', () => {
  const loaderId = source.match(/__ModuleLoader__\.load\(\{\s*\n\s*id: '([^']+)'/);
  assert.ok(loaderId, 'client.js no longer declares a loader id');
  assert.equal(loaderId[1], manifest.name);
  assert.equal(constant('PKG'), manifest.name);
  assert.match(patch, new RegExp(`name: '${manifest.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
});

test('the published name is unscoped and no longer the local placeholder', () => {
  assert.equal(manifest.name, 'dsh-team-kanban');
  assert.ok(!manifest.name.startsWith('@'), 'an unscoped name keeps the install command short');
  assert.equal(manifest.private, undefined, 'a private package cannot be published');
  assert.equal(manifest.license, 'MIT');
});

test('the client revision tracks the package version', () => {
  assert.equal(constant('CLIENT_REV'), manifest.version);
  assert.equal(manifest.version, '0.5.0');
});

test('the sidebar tab kind is namespaced away from the host vocabulary', () => {
  const kind = constant('KIND');
  assert.notEqual(kind, 'team-board');
  assert.match(kind, /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/, 'a dotted namespace keeps `sidebar://<kind>` URL-safe');
  assert.ok(kind.startsWith(`${manifest.name}.`), 'the kind should live under the package name');
});

test('the host engines range admits the verified DSH line', () => {
  assert.match(manifest.engines.dsh, /^>=0\.2\.2-rc\.\d+ <0\.3\.0$/);
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(manifest.dsh.client.platform, 'web');
});
