/*!
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require('fs');

/**
 * Used by the build system to prepare the distributable. This prevents having to
 * specify /lib within import paths by allowing npm pack to run inside the /lib folder,
 * resulting in the source files being at the top-level of the package.
 */
function main() {
  const source = fs.readFileSync(__dirname + "/../package.json").toString('utf-8');
  const sourceObj = JSON.parse(source);

  sourceObj.scripts = {};
  sourceObj.devDependencies = {};

  if (sourceObj.main.startsWith("lib/")) {
    sourceObj.main = sourceObj.main.slice(4);
  }
  if (sourceObj.types.startsWith("lib/")) {
    sourceObj.types = sourceObj.types.slice(4);
  }

  sourceObj.files = sourceObj.files.map(
    (file) => file.startsWith("lib/") ? file.slice(4) : file);

  fs.writeFileSync(__dirname + "/package.json",
    Buffer.from(JSON.stringify(sourceObj, null, 2), "utf-8") );
}

main();
