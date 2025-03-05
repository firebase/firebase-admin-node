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
  await Promise.all([
    applyExtras(),
    fixHomePage(),
    fixTitles(),
  ]);
}

/**
 * Adds extra content to the generated markdown files. Content in each file in the `extras/`
 * directory is added/merged to the top of the corresponding markdown file in the `markdown/`
 * directory.
 */
async function applyExtras() {
  const extras = await getExtraFiles();
  await Promise.all(extras.map(applyExtraContentFrom));
}

/**
 * Replace dotted module names in the home page with the correct slash-separated names. For
 * example, `firebase-admin.foo` becomes `firebase-admin/foo`. Also replaces the term "Package"
 * with "Module" for accuracy.
 */
async function fixHomePage() {
  const homePage = path.join(__dirname, 'markdown', 'index.md');
  const content = await fs.readFile(homePage);
  const updatedText = content.toString()
    .replace(/\[firebase-admin\./g, '[firebase-admin/')
    .replace(/_package/g, '_module')
    .replace(/Package/g, 'Module');
  console.log(`Updating module listings in ${homePage}`);
  await fs.writeFile(homePage, updatedText);
}

/**
 * Replaces dotted module names and the term "package" in page titles. For example, the title text
 * `firebase-admin.foo package` becomes `firebase-admin/foo module`.
 */
async function fixTitles() {
  const markdownDir = path.join(__dirname, 'markdown');
  const files = await fs.readdir(markdownDir);
  await Promise.all(files.map((file) => fixTitleOf(path.join(markdownDir, file))));

  const tocFile = path.join(markdownDir, 'toc.yaml');
  await fixTocTitles(tocFile);
}

async function fixTitleOf(file) {
  const reader = readline.createInterface({
    input: fs.createReadStream(file),
  });

  const buffer = [];
  let updated = false;
  for await (let line of reader) {
    if (line.startsWith('{% block title %}')) {
      if (line.match(/firebase-admin\./)) {
        line = line.replace(/firebase-admin\./, 'firebase-admin/').replace('package', 'module');
        updated = true;
      } else {
        break;
      }
    }

    buffer.push(line);
  }

  if (updated) {
    console.log(`Updating title in ${file}`);
    const content = Buffer.from(buffer.join('\n'));
    await fs.writeFile(file, content);
  }
}

async function fixTocTitles(file) {
  const reader = readline.createInterface({
    input: fs.createReadStream(file),
  });

  const buffer = [];
  for await (let line of reader) {
    if (line.includes('- title: firebase-admin.')) {
      line = line.replace(/firebase-admin\./, 'firebase-admin/');
    }

    buffer.push(line);
  }

  console.log(`Updating titles in ${file}`);
  const content = Buffer.from(buffer.join('\n'));
  await fs.writeFile(file, content);
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

async function readExtraContentFrom(source) {
  const reader = readline.createInterface({
    input: fs.createReadStream(source),
  });
  const content = [];
  for await (const line of reader) {
    content.push(line);
  }

  return content;
}

async function writeExtraContentTo(target, extra) {
  const output = [];
  const reader = readline.createInterface({
    input: fs.createReadStream(target),
  });

  let firstHeadingSeen = false;
  for await (const line of reader) {
    // Insert extra content just before the first markdown heading.
    if (line.match(/^\#+ /)) {
      if (!firstHeadingSeen) {
        output.push(...extra);
        output.push('');
      }

      firstHeadingSeen = true;
    }

    output.push(line);
  }

  const outputBuffer = Buffer.from(output.join('\n'));
  console.log(`Writing extra content to ${target}`);
  await fs.writeFile(target, outputBuffer);
}

(async () => {
  try {
    await main();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
})();
