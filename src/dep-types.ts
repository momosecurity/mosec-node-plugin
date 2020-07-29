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
export = depTypes;

import { DepType, HasDependencySpecs } from "./types";

// Dependency types.
// We don't call out all of them, only the ones relevant to our behavior.
// extraneous means not found in package.json files, prod means not dev ATM
function depTypes(depName: string, pkg: HasDependencySpecs) {
  let type: string | null = null;
  let from = 'unknown';

  if (pkg.devDependencies && pkg.devDependencies[depName]) {
    type = depTypes.DEV;
    from = pkg.devDependencies[depName];
  }

  // production deps trump all
  if (pkg.dependencies && pkg.dependencies[depName]) {
    type = depTypes.PROD;
    from = pkg.dependencies[depName];
  }

  return {
    type: type as string,
    from: from,
  };
}

depTypes.EXTRANEOUS = 'extraneous' as DepType;
depTypes.OPTIONAL = 'optional' as DepType;
depTypes.PROD = 'prod' as DepType;
depTypes.DEV = 'dev' as DepType;
