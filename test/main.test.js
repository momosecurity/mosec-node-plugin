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
let check = require("../src/main");

test('main - empty dir', function (t) {
    check.checkProject('fixtures/empty-dir', 'fake endpoint').then(function (res) {
        t.fail('empty dir should not succeed', res);
    }).catch(function (e) {
        t.type(e, 'Error', 'error received');
        t.notEqual(e.message.indexOf(' is not a node project'), -1, 'error is correct');
    }).then(t.end);
});

test('main - none exist dir', function (t) {
    check.checkProject('fixtures/im_not_exist', 'fake endpoint').then(function (res) {
        t.fail('none exist dir should not succeed', res);
    }).catch(function (e) {
        t.type(e, 'Error', 'error received');
        t.notEqual(e.message.indexOf('dir is not exists'), -1, 'error is correct');
    }).then(t.end);
});

test('main - pkg-not-install', function (t) {
    check.checkProject('fixtures/pkg-not-install', 'fake endpoint').then(function (res) {
        t.fail('not install pkg dir should not succeed.', res)
    }).catch(function (e) {
        t.type(e, 'Error', 'error received');
        t.notEqual(e.message.indexOf("run 'npm install' first"), -1, 'error is correct')
    }).then(t.end);
});
