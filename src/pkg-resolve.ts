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
import set = Reflect.set;

export { resolvePkg, sync };

import * as fs from 'then-fs';
import * as path from 'path';
import * as debugModule from 'debug';

let debug = debugModule('mosec:resolve');

function resolvePkg(name, basedir) {
  if (!basedir) {
    basedir = process.cwd();
  }

  let filename = path.resolve(basedir, 'node_modules', name, 'package.json');
  debug('%s: %s', name, filename);
  return fs.stat(filename).then(function (stat) {
    if (stat.isFile()) {
      return path.dirname(filename);
    }
  }).catch(function (error) {
    debug('%s: not found on %s (root? %s)', name, basedir, isRoot(basedir));
    if (isRoot(basedir)) {
      debug('at root');
      error = new Error('package not found ' + name);
      error.code = 'NO_PACKAGE_FOUND';
      throw error;
    }
  }).then(function (dir) {
    if (dir) {
      debug('%s: FOUND AT %s', name, dir);
      return dir;
    }

    debug('%s: cycling down', name);
    return resolvePkg(name, path.resolve(basedir, '..'));
  });
}

function sync(name, basedir) {
  if (!basedir) {
    basedir = process.cwd();
  }

  let filename = path.resolve(basedir, 'node_modules', name, 'package.json');
  debug('%s: %s', name, filename);

  let isFile = function (file) {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return false;
      }
    }
    return stat.isFile() || stat.isFIFO();
  };

  if (isFile(filename)) {
    debug('%s: FOUND AT %s', name, filename);
    return path.dirname(filename);
  }

  if (isRoot(basedir)) {
    debug('%s: not found on %s (now at root)', name, filename);
    let error = new Error('package not found ' + name);
    set(error, 'code', 'NO_PACKAGE_FOUND');
    throw error;
  }

  debug('%s: cycling down', name);
  return sync(name, path.resolve(basedir, '..'));
}

function isRoot(dir) {
  let parsed = parse(dir);
  return parsed.root === parsed.dir && !parsed.base;
}

// FIXME determine whether this would work properly on windows in 0.10
function parse(dir) {
  /* istanbul ignore else  */
  // jscs:disable requireEarlyReturn
  if (path.parse) {
    return path.parse(dir);
  } else {
    let split = dir.split(path.sep);
    let root = split[0] + path.sep;
    return {
      base: split[1],
      root: root,
      dir: dir,
    };
  }
  // jscs:enable requireEarlyReturn
}
