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

// List of module entry points. We generate a separate report for each entry point.
const entryPoints = {
  'firebase-admin': './lib/default-namespace.d.ts',
  'firebase-admin/app': './lib/app/index.d.ts',
  'firebase-admin/auth': './lib/auth/index.d.ts',
  'firebase-admin/database': './lib/database/index.d.ts',
  'firebase-admin/firestore': './lib/firestore/index.d.ts',
  'firebase-admin/instance-id': './lib/instance-id/index.d.ts',
  'firebase-admin/messaging': './lib/messaging/index.d.ts',
  'firebase-admin/security-rules': './lib/security-rules/index.d.ts',
  'firebase-admin/remote-config': './lib/remote-config/index.d.ts',
};

const tempConfigFile = 'api-extractor.tmp';

async function generateReports() {
  for (const key in entryPoints) {
    await generateReportForEntryPoint(key);
  }
}

async function generateReportForEntryPoint(key) {
  console.log(`\nGenerating API report for ${key}`)
  console.log('========================================================\n');

  const safeName = key.replace('/', '.');
  console.log('Updating configuration for entry point...');
  config.apiReport.reportFileName = `${safeName}.api.md`;
  config.mainEntryPointFilePath = entryPoints[key];
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
  } finally {
    await fs.unlink(tempConfigFile);
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
