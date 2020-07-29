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
export = loadModules;

import * as depTypes from './dep-types';
import * as tryRequire from './try-require';
import * as resolve from './pkg-resolve';
import * as fs from 'then-fs';
import * as _assign from 'lodash.assign';
import * as _flatten from 'lodash.flatten';
import * as debugModule from 'debug';
import * as path from 'path';
import * as semver from 'semver';
import {AbbreviatedVersion, PackageExpanded, PackageJsonEnriched, DepExpandedDict} from './types';

const debug = debugModule('mosec:resolve:deps');

function loadModules(root, depType) {
    tryRequire.cache.reset(); // reset the package cache on re-run
    let pkgRoot = root;

    return loadModulesInternal(
        pkgRoot,
        depType || null,
        null,
    ).then(function (tree) {
        // ensure there's no missing packages our known root deps
        let missing: Array<Promise<PackageExpanded>> = [];
        if (tree.__dependencies) {
            Object.keys(tree.__dependencies).forEach(function (name) {
                if (!tree.dependencies[name]) {
                    missing.push(resolve.resolvePkg(name, pkgRoot).then(function (dir) {
                        return loadModulesInternal(dir, depTypes.PROD, {
                            from: [tree.name + '@' + tree.version, name],
                        });
                    }).catch(function (e) {
                        if (e.code === 'NO_PACKAGE_FOUND') {
                            return false;
                        }
                    }));
                }
            });
        }
        if (missing.length) {
            return Promise.all(missing).then(function (packages) {
                packages.filter(Boolean).forEach(function (pkg) {
                    pkg.dep = tree.__dependencies[pkg.name];
                    tree.dependencies[pkg.name] = pkg;
                });
                return tree;
            });
        }

        return tree;
    });

}

function loadModulesInternal(root, rootDepType, parent): Promise<PackageExpanded> {
    if (!rootDepType) {
        rootDepType = depTypes.EXTRANEOUS;
    }

    if (typeof root !== 'string') {
        return Promise.reject(new Error('module path must be a string'));
    }

    let modules;
    let dir = path.resolve(root, 'package.json');
    // 1. read package.json for written deps
    return tryRequire(dir).then(function (pkg: PackageJsonEnriched) {
        // create root pkg node
        if (pkg) {
            let full = pkg.name + '@' + (pkg.version || '0.0.0');
            modules = {} as PackageExpanded;
            _assign(modules, {
                name: pkg.name,
                version: pkg.version || '0.0.0',
                license: pkg.license || 'none',
                depType: rootDepType,
                hasDevDependencies: !!pkg.devDependencies,
                full: full,
                from: (parent || {from: []}).from,
                __devDependencies: pkg.devDependencies,
                __dependencies: pkg.dependencies,
                __filename: pkg.__filename,
            });

            // allows us to add to work out the full path that the package was
            // introduced via
            pkg.from = modules.from.concat(full);
            pkg.full = modules.full;

            // this is a special case for the root package to get a consistent
            // from path, so that the complete path (including it's own pkg name)
            if (modules.from.length === 0) {
                modules.from.push(full);
            }
        } else {
            throw new Error(dir + ' is not a node project');
        }
        modules.dependencies = {};

        // 2. check actual installed deps
        return fs.readdir(path.resolve(root, 'node_modules')).then(function (dirs) {
            let res: AbbreviatedVersion[] = dirs.map(function (directory) {
                // completely ignore `.bin` npm helper dir
                // ~ can be a symlink to node_modules itself
                // (https://www.npmjs.com/package/link-tilde)
                if (['.bin', '.DS_Store', '~'].indexOf(directory) >= 0) {
                    return null;
                }

                // this is a scoped namespace, and we'd expect to find directories
                // inside *this* `dir`, so treat differently
                if (directory.indexOf('@') === 0) {
                    debug('scoped reset on %s', directory);
                    directory = path.resolve(root, 'node_modules', directory);
                    return fs.readdir(directory).then(function (directories) {
                        return Promise.all(directories.map(function (scopedDir) {
                            return tryRequire(path.resolve(directory, scopedDir, 'package.json'));
                        }));
                    });
                }

                // otherwise try to load a package.json from this node_module dir
                directory = path.resolve(root, 'node_modules', directory, 'package.json');
                return tryRequire(directory) as AbbreviatedVersion;
            });

            return Promise.all(res).then(function (response) {
                response = _flatten(response).filter(Boolean);

                response.reduce(function (acc, curr) {
                    let license;
                    let licenses = curr.license as any || curr.licenses as any;

                    if (Array.isArray(licenses)) {
                        license = licenses.reduce(function (accumulator, current) {
                            accumulator.push((current || {}).type || current);
                            return accumulator;
                        }, []).join('/');
                    } else {
                        license = (licenses || {}).type || licenses;
                    }

                    let depInfo = depTypes(curr.name!, pkg);
                    let depType = depInfo.type || rootDepType;
                    let depFrom = depInfo.from;

                    let valid = false;
                    if (depFrom) {
                        valid = semver.satisfies(curr.version as string, depFrom);
                    }

                    let full = curr.name + '@' + (curr.version || '0.0.0');
                    acc[curr.name!] = {} as PackageExpanded;
                    _assign(acc[curr.name!], {
                        name: curr.name,
                        version: curr.version || null,
                        full: full,
                        valid: valid,
                        depType: depType,
                        license: license || 'none',
                        dep: depFrom || null,
                        from: pkg.from.concat(full),
                        __devDependencies: curr.devDependencies,
                        __dependencies: curr.dependencies,
                        __filename: curr.__filename,
                    });
                    return acc;
                }, modules.dependencies);

                return modules;
            });
        }).then(function (mods) {
            let deps = Object.keys(mods.dependencies);

            let promises = deps.map(function (dep) {
                let depType = mods.dependencies[dep].depType;
                let directory = path.dirname(mods.dependencies[dep].__filename);
                return loadModulesInternal(directory, depType, pkg);
            });

            return Promise.all(promises).then(function (res) {
                res.forEach(function (mod) {
                    mods.dependencies[mod.name].dependencies = mod.dependencies;
                });

                return mods;
            });
        }).catch(function (error) {
            /* istanbul ignore else  */
            if (error.code === 'ENOENT') {
                // there's no node_modules directory, that's fine, there's no deps
                modules.dependencies = {};
                return modules;
            }

            /* istanbul ignore next */
            throw error;
        });
    });
}

function simplifyDeps(deps: PackageExpanded, onlyProvenance: boolean, noDev: boolean) {
    let allowProp = ['name', 'version', 'dependencies', 'from'];

    if (!deps) {
        return ;
    }

    // remove extraneous dependencies
    Object.keys(deps.dependencies).forEach((name) => {
        if (deps.dependencies[name].depType === depTypes.EXTRANEOUS) {
            delete deps.dependencies[name];
        }
    });

    if (noDev) {
        // remove dev dependencies
        Object.keys(deps.dependencies).forEach((name) => {
            if (deps.dependencies[name].depType === depTypes.DEV) {
                delete deps.dependencies[name];
            }
        });
    }

    if (onlyProvenance) {
        // only check top level dependencies
        if (deps.from.length > 1) {
            deps.dependencies = {};
        }
    }

    Object.keys(deps).forEach((name) => {
        if (allowProp.indexOf(name) === -1) {
            delete deps[name];
        }
    });

    if (deps.dependencies) {
        Object.keys(deps.dependencies).forEach((name) => {
            simplifyDeps(deps.dependencies[name], onlyProvenance, noDev);
        });
    }
    return deps;
}

loadModules.simplifyDeps = simplifyDeps;
