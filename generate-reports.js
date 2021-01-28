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

const { exec } = require('child-process-promise');
const fs = require('mz/fs');
const yargs = require('yargs');

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
  'firebase-admin/instance-id': './lib/instance-id/index.d.ts',
};

const apiExtractorBin = './node_modules/.bin/api-extractor run';

const tempConfigFile = 'api-extractor.tmp';

async function generateReports() {
  for (const key in entryPoints) {
    await generateReportForEntryPoint(key);
  }
}

async function generateReportForEntryPoint(key) {
  console.log(`Generating API report for ${key}`)
  console.log('========================================================\n');

  console.log('Updating configuration for entry point...');
  config.apiReport.reportFileName = `${key.replace('/', '.')}.api.md`;
  config.mainEntryPointFilePath = entryPoints[key];
  console.log(`Report file name: ${config.apiReport.reportFileName}`);
  console.log(`Entry point declaration: ${config.mainEntryPointFilePath}`);
  await fs.writeFile(tempConfigFile, JSON.stringify(config));

  let command = `${apiExtractorBin} -c ${tempConfigFile}`;
  if (localMode) {
    command += ' --local';
  }

  console.log(`Running command: ${command}`);
  try {
    const output = await exec(command);
    console.log(output.stdout);
  } catch (err) {
    if (err.stdout) {
      console.log(err.stdout);
    }

    throw err.stderr;
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
