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
export = tryRequire;

import * as fs from 'then-fs';
import * as path from 'path';
import * as debugModule from 'debug';
import * as cloneDeep from 'lodash.clonedeep';
import * as lru from 'lru-cache';
let options = { max: 100, maxAge: 1000 * 60 * 60 };
let cache = lru(options);

let debug = debugModule('mosec:resolve:try-require');

function tryRequire(filename) {
    let cached = cache.get(filename);
    if (cached) {
        let res = cloneDeep(cached);
        /* istanbul ignore else */
        if (process.env.TAP) {
            res.__cached = true;
        }
        return Promise.resolve(res);
    }
    return fs.readFile(filename, 'utf8').then(function (pkgStr) {
        let leadingBOM = '';
        if (pkgStr && pkgStr[0] === '\ufeff') {
            // String starts with UTF BOM. Remove it so that JSON.parse doesn't
            // stumble, but remember it for later use.
            pkgStr = pkgStr.slice(1);
            leadingBOM = '\ufeff';
        }

        let pkg = JSON.parse(pkgStr);
        pkg.leading = leadingBOM + pkgStr.match(/^(\s*){/)[1];
        pkg.trailing = pkgStr.match(/}(\s*)$/)[1];
        return pkg;
    }).catch(function (e) {
        debug('tryRequire silently failing on %s', e.message);
        return null;
    }).then(function (pkg) {
        if (!pkg) {
            return pkg;
        }

        // fixes potential issues later on
        if (!pkg.devDependencies) {
            pkg.devDependencies = {};
        }

        if (!pkg.dependencies) {
            pkg.dependencies = {};
        }

        if (!pkg.name) {
            pkg.name = path.basename(path.dirname(filename));
        }

        pkg.__filename = filename;
        return pkg;
    }).then(function (pkg) {
        cache.set(filename, pkg);
        return cloneDeep(pkg);
    });
}

tryRequire.cache = cache;
