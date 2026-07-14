/**
 * @license
 * Copyright 2021 Google LLC
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
const yargs = require('yargs');
const { Extractor, ExtractorConfig } = require('@microsoft/api-extractor');

const { local: localMode } = yargs
  .option('local', {
    boolean: true,
    description: 'Run API Extractor with --local flag',
  })
  .version(false)
  .help().argv;

// API Extractor configuration file.
const config = require('./api-extractor.json');

const tempConfigFile = 'api-extractor.tmp';

// Regex to validate that the entrypoint name consists of safe alphanumeric, underscore,
// and dash characters, optionally separated by single slashes.
const ENTRY_POINT_REGEX = /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/;

// Regex to validate that the typing file path is a local relative declaration file path
// inside the "./lib" directory.
const TYPING_FILE_PATH_REGEX = /^\.\/lib\/[a-zA-Z0-9_\-\/]+\.d\.ts$/;

async function generateReports() {
  const entryPoints = require('./entrypoints.json');
  for (const entryPoint in entryPoints) {
    // Validate entryPoint to prevent path traversal
    if (!ENTRY_POINT_REGEX.test(entryPoint)) {
      throw new Error(`Invalid entryPoint format: ${entryPoint}`);
    }
    const filePath = entryPoints[entryPoint].typings;
    if (filePath.includes('..') || !TYPING_FILE_PATH_REGEX.test(filePath)) {
      throw new Error(`Invalid typing file path: ${filePath}`);
    }
    await generateReportForEntryPoint(entryPoint, filePath);
  }
}

async function generateReportForEntryPoint(entryPoint, filePath) {
  console.log(`\nGenerating API report for ${entryPoint}`)
  console.log('========================================================\n');

  const safeName = entryPoint.replace('/', '.');
  if (safeName.includes('..') || safeName.includes('/') || safeName.includes('\\')) {
    throw new Error(`Invalid safeName calculated: ${safeName}`);
  }
  console.log('Updating configuration for entry point...');
  config.apiReport.reportFileName = `${safeName}.api.md`;
  config.mainEntryPointFilePath = filePath;
  console.log(`Report file name: ${config.apiReport.reportFileName}`);
  console.log(`Entry point declaration: ${config.mainEntryPointFilePath}`);
  await fs.writeFile(tempConfigFile, JSON.stringify(config));

  try {
    const configFile = ExtractorConfig.loadFile(tempConfigFile);
    const extractorConfig = ExtractorConfig.prepare({
      configObject: configFile,
      configObjectFullPath: path.resolve(tempConfigFile),
      packageJson: {
        name: safeName,
      },
      packageJsonFullPath: path.resolve('package.json'),
    });
    const extractorResult = Extractor.invoke(extractorConfig, {
      localBuild: localMode,
      showVerboseMessages: true
    });
    if (!extractorResult.succeeded) {
      throw new Error(`API Extractor completed with ${extractorResult.errorCount} errors`
        + ` and ${extractorResult.warningCount} warnings`);
    }

    console.error(`API Extractor completed successfully`);

    // Strip @excludeFromDocs APIs from the generated docModel so they aren't documented in reference docs.
    const tempDir = path.resolve('temp');
    const apiJsonPath = path.resolve(tempDir, `${safeName}.api.json`);
    const relativePath = path.relative(tempDir, apiJsonPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`Path traversal detected: ${apiJsonPath}`);
    }
    await stripHiddenDocsFromApiJson(apiJsonPath);
  } finally {
    await fs.unlink(tempConfigFile);
  }
}

async function stripHiddenDocsFromApiJson(apiJsonPath) {
  if (!await fs.exists(apiJsonPath)) {
    return;
  }
  const content = await fs.readFile(apiJsonPath, 'utf8');
  const data = JSON.parse(content);

  let removedCount = 0;
  function removeHidden(node) {
    if (node.members) {
      const originalLength = node.members.length;
      // Filter out any member whose docComment includes @excludeFromDocs
      node.members = node.members.filter(m => !(m.docComment && /@excludeFromDocs\b/.test(m.docComment)));
      removedCount += (originalLength - node.members.length);
      node.members.forEach(removeHidden);
    }
  }

  removeHidden(data);
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} @excludeFromDocs items from ${path.basename(apiJsonPath)}`);
    await fs.writeFile(apiJsonPath, JSON.stringify(data, null, 2));
  }
}

(async () => {
  try {
    await generateReports();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
})();
