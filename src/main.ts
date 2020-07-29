/*
Copyright 2020 momosecurity.

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

export { checkProject };

import * as process from 'process';
import * as fs from 'then-fs';
import * as path from 'path';
import * as logger from './logger';
import {SocVulnResponse, Vulnerability} from "./types";

let axios = require('axios');
let util  = require('util');
let getDeps = require('./deps');

function statPath(fpath: string) {
    try {
        return fs.statSync(fpath);
    } catch (e) {
        return false;
    }
}

function printSingleVuln(vuln: Vulnerability) {
    logger.error(util.format("✗ %s severity vulnerability (%s - %s) found on %s@%s",
        vuln.severity, vuln.title, vuln.cve, vuln.packageName, vuln.version));

    if (vuln.from) {
        let fromArr = vuln.from;
        let fromStr = "";

        fromArr.forEach((fromDep) => {
            fromStr += fromDep + " > ";
        });

        fromStr = fromStr.substr(0, fromStr.length - 3);
        logger.log(util.format("- from: %s", fromStr));
    }

    if (vuln.target_version.length) {
        logger.info(util.format("! Fix version %s", JSON.stringify(vuln.target_version)));
    }

    logger.log('');
}

function checkProject(root: string, endpoint?: string, severity?: string, onlyProvenance?: boolean, withDev?: boolean) {

    let envEndpoint = process.env.MOSEC_ENDPOINT;
    if (!!envEndpoint) {
        endpoint = envEndpoint;
    }
    if (!endpoint) {
        return Promise.reject(new Error("endpoint not set. use --endpoint param or MOSEC_ENDPOINT env."));
    }

    if (statPath(path.resolve(root)) === false) {
        return Promise.reject(new Error("dir is not exists: " + root));
    }
    if (statPath(path.resolve(root, 'package.json')) === false) {
        return Promise.reject(new Error(root + " is not a node project."));
    }
    if (statPath(path.resolve(root, 'node_modules')) === false) {
        return Promise.reject(new Error("run 'npm install' first, please."));
    }

    return getDeps(root)
    .then((deps)  => getDeps.simplifyDeps(deps, onlyProvenance || false, withDev || false))
    .then((deps) => {
        // feed extra info
        set(deps, 'type', 'npm');
        set(deps, 'language', 'javascript');
        set(deps, 'severityLevel', severity || 'High');

        return axios({
            method: 'POST',
            url: endpoint,
            headers: {
                'Content-Type': 'application/json',
            },
            data: deps,
            timeout: 15 * 1000,
        }).then((res) => {
            let responseJson = res.data as SocVulnResponse;

            if (responseJson.ok) {
                logger.info(
                    util.format("✓ Tested %s dependencies for known vulnerabilities, no vulnerable paths found.",
                        responseJson.dependencyCount));
                return Promise.resolve();
            }

            if (responseJson.vulnerabilities) {
                responseJson.vulnerabilities.forEach((vuln) => {
                    printSingleVuln(vuln);
                });

                logger.warn(
                    util.format("Tested %s dependencies for known vulnerabilities, found %d vulnerable paths.",
                        responseJson.dependencyCount, responseJson.vulnerabilities.length));
            }

        }).catch((error) => {
            if (error.response) {
                throw new Error("API return data format error.");
            }
        });
    }).catch((error) => {
        return Promise.reject(error);
    });
}
