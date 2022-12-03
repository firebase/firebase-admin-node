/**
 * @license
 * Copyright 2021 Google Inc.
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

const path = require('path');
const fs = require('mz/fs');

async function main() {
  const entryPoints = require('./entrypoints.json');
  for (const entryPoint in entryPoints) {
    const info = entryPoints[entryPoint];
    if (info.legacy) {
      continue;
    }

    await generateEsmWrapper(entryPoint, info.dist);
  }
}

async function generateEsmWrapper(entryPoint, source) {
  console.log(`Generating ESM wrapper for ${entryPoint}`);
  const target = getTarget(entryPoint);
  const output = getEsmOutput(source, target);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await Promise.all([
    fs.writeFile(target, output),
    fs.writeFile('./lib/esm/package.json', JSON.stringify({type: 'module'}))
  ]);
}

function getTarget(entryPoint) {
  const child = entryPoint.replace('firebase-admin/', '');
  return `./lib/esm/${child}/index.js`;
}

function getEsmOutput(source, target) {
  const sourcePath = path.resolve(source);
  const cjsSource = require.resolve(sourcePath);
  const keys = getExports(cjsSource);
  const targetPath = path.resolve(target);
  const importPath = getImportPath(targetPath, cjsSource);

  let output = `import mod from ${JSON.stringify(importPath)};`;
  output += '\n\n';
  for (const key of keys) {
    output += `export const ${key} = mod.${key};\n`;
  }

  return output;
}

function getImportPath(from, to) {
  const fromDir = path.dirname(from);
  return path.relative(fromDir, to).replace(/\\/g, '/');
}

function getExports(cjsSource) {
  const mod = require(cjsSource);
  const keys = new Set(Object.getOwnPropertyNames(mod));
  keys.delete('__esModule');
  return [...keys].sort();
}

(async () => {
  try {
    await main();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
})();
