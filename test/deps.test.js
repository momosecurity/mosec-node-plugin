/*
Copyright 2017 Snyk Ltd.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */
let test = require('tap-only');
let deps = require('../src/deps');
let path = require('path');
let npm2fixture = path.resolve(__dirname,
  'fixtures/bundle/node_modules/snyk-resolve-deps-fixtures',
  'node_modules/uglify-package');
let npm3fixture = path.resolve(__dirname,
  'fixtures/bundle/node_modules/snyk-resolve-deps-fixtures');


test('deps - npm@3', function (t) {
  deps(npm3fixture).then(function (res) {
    t.ok(!!res, 'package loaded');
  }).catch(t.fail).then(t.end);
});

// fixture uglify-package does not exist, and newer versions of npm care
const legacyNpm = Number(
  require('child_process').execSync('npm -v').toString().split('.', 1)[0]
) < 5;

legacyNpm && test('deps - with uglify-package', function (t) {
  deps(npm2fixture).then(function (res) {
    t.equal(res.name, 'uglify-package', 'package name matches');
    t.type(res.dependencies, 'object', 'has dependencies');
    t.equal(Object.keys(res.dependencies).length, 3, 'has 3 file dependencies');

    let ugdeep = res.dependencies['ug-deep'];
    t.equal(ugdeep.name, 'ug-deep', 'ug-deep exists');
  }).catch(function (e) {
    t.fail(e.stack);
  }).then(t.end);
});

legacyNpm && test('deps - with extraFields', function (t) {
  deps(npm2fixture, null, { extraFields: [ 'main', 'super-bogus-field' ]}).then(function (res) {
    t.equal(res.main, 'index.js', 'includes extraFields');
    t.equal(res['super-bogus-field'], null, 'produces null for empty extraFields fields');
  }).catch(function (e) {
    t.fail(e.stack);
  }).then(t.end);
});

test('deps - throws without path', function (t) {
  deps().then(function () {
    t.fail('without a path deps should not succeed');
  }).catch(function (e) {
    t.type(e, 'Error', 'error received');
    t.equal(e.message, 'module path must be a string', 'error is correct');
  }).then(t.end);
});

// See test/fixtures/pkg-yarn-renamed-deps/README.md
test('deps - yarn with renamed dep', function (t) {
  deps('fixtures/pkg-yarn-renamed-deps').then(function (res) {
    t.equal(res.name, 'pkg-renamed-dep', 'package name matches');
    t.type(res.dependencies, 'object', 'has dependencies');
    t.equal(Object.keys(res.dependencies).length, 2, 'has 2 deps');
  }).catch(function (e) {
    t.fail(e.stack);
  }).then(t.end);
});

test('deps - pkg undefined deps', function (t) {
  deps('fixtures/pkg-undef-deps').then(function (res) {
    t.equal(res.name, 'pkg-undef-deps', 'package name matches');
    t.type(res.dependencies, 'object', 'has dependencies');
  }).catch(function (e) {
    t.fail(e.stack);
  }).then(t.end);
});
