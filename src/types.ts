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
export type DepType = 'extraneous' | 'optional'| 'prod' | 'dev';

export interface DepSpecDict {
    [name: string]: string;
}

export interface DepExpandedDict {
    [name: string]: PackageExpanded;
}

export interface AbbreviatedVersion {
    readonly name: string;
    readonly version: string;
    readonly deprecated?: string;
    readonly dependencies?: {readonly [name: string]: string};
    readonly devDependencies?: {readonly [name: string]: string};
    readonly peerDependencies?: {readonly [name: string]: string};
    readonly directories?: readonly string[];
    readonly [key: string]: unknown;
}

// Intermediate type used during parsing
export interface PackageJsonEnriched extends AbbreviatedVersion {
    full: string;
    from: string[];
}

export interface HasDependencySpecs {
    readonly dependencies?: {readonly [name: string]: string};
    readonly devDependencies?: {readonly [name: string]: string};
}

// Similar to package-json.AbbreviatedVersion, but with deps expanded
export interface PackageExpanded {
    name: string;
    version: string;
    dep: string; // this is the npm version range spec that was resolved to `version`
    license: string;
    depType: DepType;
    hasDevDependencies: boolean;
    full: string;
    from: string[];
    __devDependencies: DepSpecDict;
    __dependencies: DepSpecDict;
    __filename: string;
    devDependencies: DepExpandedDict;
    dependencies: DepExpandedDict;
    __used?: boolean;
    problems?: string[];
    extraneous?: boolean;
}

export interface Vulnerability {
    id: string;
    severity: string;
    packageName: string;
    version: string;
    from: string[];
    target_version: string[];
    title: string;
    cve: string;
}

export interface SocVulnResponse {
    ok: boolean;
    dependencyCount: bigint;
    vulnerabilities: Vulnerability[];
}
