/*!
 * Copyright 2017 Google Inc.
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

var _ = require('lodash');
var chalk = require('chalk');

var failureCount = 0;
var successCount = 0;

var failure = chalk.red;
var success = chalk.green;

var serviceAccount;

try {
  serviceAccount = require('../resources/key.json');
} catch(error) {
  console.log(chalk.red(
    'The integration test suite requires a service account key JSON file for a ' +
    'Firebase project to be saved to `test/resources/key.json`.',
    error
  ));
  process.exit(1);
}

var apiKey = process.argv[2];
if (typeof apiKey === 'undefined') {
  console.log(chalk.red(
    'The integration test suite requires an API key for a ' +
    'Firebase project to be specified as a command-line argument.'));
  process.exit(1);
}

/**
 * Returns the service account credential used for runnnig integration tests.
 *
 * @return {Object} A service account credential.
 */
function getCredential() {
  return serviceAccount;
}

/**
 * Returns the ID of the project the integration tests are executed against.
 *
 * @return {string} A project ID.
 */
function getProjectId() {
  return serviceAccount.project_id;
}

/**
 * Returns the API key of the project the integration tests are executed against.
 *
 * @return {string} A Firebase API key.
 */
function getApiKey() {
  return apiKey;
}

/**
 * Logs a message to the console in green text.
 *
 * @param {string} message The message to log.
 */
function logGreen(message) {
  console.log(chalk.green(message));
}

/**
 * Logs a message to the console in red text.
 *
 * @param {string} message The message to log.
 */
function logRed(message) {
  console.log(chalk.red(message));
}

/**
 * Logs the results and exits the program.
 */
function logResults() {
  var totalTestCount = successCount + failureCount;

  console.log('\nResults:');
  console.log(successCount + ' / ' + totalTestCount + ' tests passed\n');

  if (failureCount === 0) {
    logGreen('***************************');
    logGreen('***  SUCCESS! SHIP IT!  ***');
    logGreen('***************************');

    process.exit(0);
  } else {
    logRed('**********************************');
    logRed('***  FAILURE! DO NOT SHIP IT!  ***');
    logRed('**********************************');

    process.exit(1);
  }
}

/**
 * Generate a random string of the specified length, optionally using the specified alphabet.
 *
 * @param {number} length The length of the string to generate.
 * @return {string} A random string of the provided length.
 */
function generateRandomString(length) {
  var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  var text = '';
  for (var i = 0; i < length; i++) {
    text += alphabet.charAt(_.random(alphabet.length - 1));
  }

  return text;
}

/**
 * Asserts the truthiness of the provided condition and logs the result.
 *
 * @param {boolean} condition The condition to evaluate.
 * @param {string} testName The name of the test.
 * @param {string} failureMessage The message to log if the provided condition evaluates to false.
 */
function assert(condition, testName, failureMessage) {
  if (condition) {
    logSuccess(testName);
  } else {
    logFailure(testName, failureMessage);
  }
}

/**
 * Logs the provided message as a failure and increments the total test and failure counts.
 *
 * @param {string} testName The name of the test.
 * @param {string} failureMessage The failure message.
 */
function logFailure(testName, failureMessage) {
  failureCount++;
  logRed('[FAILURE] ' + testName + ': ' + failureMessage);
}

/**
 * Logs the provided message as a success and increments the total test count.
 *
 * @param {string} testName The name of the test.
 */
function logSuccess(testName) {
  successCount++;
  logGreen('[SUCCESS] ' + testName);
}


module.exports = {
  assert: assert,
  logFailure: logFailure,
  logSuccess: logSuccess,
  logResults: logResults,
  generateRandomString: generateRandomString,
  getCredential: getCredential,
  getProjectId: getProjectId,
  getApiKey: getApiKey
}
