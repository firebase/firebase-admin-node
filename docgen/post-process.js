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

const fs = require('mz/fs');
const path = require('path');
const readline = require('readline');

async function main() {
  const extras = await getExtraFiles();
  for (const source of extras) {
    await applyExtraContentFrom(source);
  }
}

async function getExtraFiles() {
  const extrasPath = path.join(__dirname, 'extras');
  const files = await fs.readdir(extrasPath);
  return files
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(__dirname, 'extras', name));
}

async function applyExtraContentFrom(source) {
  const target = path.join(__dirname, 'markdown', path.basename(source));
  if (!await fs.exists(target)) {
    console.log(`Target path not found: ${target}`);
    return;
  }

  const extra = await readExtraContentFrom(source);
  await writeExtraContentTo(target, extra);
}

async function writeExtraContentTo(target, extra) {
  const output = [];
  const reader = readline.createInterface({
    input: fs.createReadStream(target),
  });
  for await (const line of reader) {
    output.push(line);
    if (line.startsWith('{% block body %}')) {
      output.push(...extra);
    }
  }

  const outputBuffer = Buffer.from(output.join('\r\n'));
  console.log(`Writing extra content to ${target}`);
  await fs.writeFile(target, outputBuffer);
}

async function readExtraContentFrom(source) {
  const reader = readline.createInterface({
    input: fs.createReadStream(source),
  });
  const content = [''];
  for await (const line of reader) {
    content.push(line);
  }

  return content;
}

(async () => {
  try {
    await main();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
})();
