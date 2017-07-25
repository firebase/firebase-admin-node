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
var readline = require('readline');

var admin = require('../../lib/index');

var utils = require('./utils');

var app = require('./app');
var auth = require('./auth');
var database = require('./database');
var messaging = require('./messaging');

var apiRequest = require('../../lib/utils/api-request');
var url = require('url');

var serviceAccount = utils.getCredential();
var databaseURL = 'https://' + utils.getProjectId() + '.firebaseio.com';

var defaultApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL,
});

var nullApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL,
  databaseAuthVariableOverride: null,
}, 'null');

var nonNullApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL,
  databaseAuthVariableOverride: {
    uid: utils.generateRandomString(20),
  },
}, 'nonNull');


console.log('Admin namespace:');

utils.assert(_.isEqual(defaultApp, admin.app()), 'admin.app()', 'App instances do not match.');
utils.assert(_.isEqual(nullApp, admin.app('null')), 'admin.app("null")', 'App instances do not match.');
utils.assert(_.isEqual(nonNullApp, admin.app('nonNull')), 'admin.app("nonNull")', 'App instances do not match.');

utils.assert(admin.app().name === '[DEFAULT]', 'admin.app().name', 'App name is incorrect.');
utils.assert(admin.app('null').name === 'null', 'admin.app("null").name', 'App name is incorrect.');
utils.assert(admin.app('nonNull').name === 'nonNull', 'admin.app("nonNull").name', 'App name is incorrect.');

utils.assert(
  _.isEqual(admin.auth(defaultApp).app, defaultApp),
  'admin.auth(app).app',
  'App instances do not match.'
);
utils.assert(
  _.isEqual(admin.database(nullApp).app, nullApp),
  'admin.database(app).app',
  'App instances do not match.'
);
utils.assert(
  _.isEqual(admin.messaging(nonNullApp).app, nonNullApp),
  'admin.messaging(app).app',
  'App instances do not match.'
);

/**
 * Prompts the developer whether the Database rules should be
 * overwritten with the relevant rules for the integration tests.
 * The developer has 3 options:
 * yes/y to agree to the rules overwrite.
 * skip to skip the overwrite (rules already manually configured) and continue
 * with the tests.
 * no/n or other to abort.
 * @return {Promise} A promise that resolves when the rules change is processed.
 */
function promptForUpdateRules() {
  return new Promise(function(resolve, reject) {
    // Defines prompt interface.
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    // Options to display to end user.
    var question = 'Warning: This test will overwrite your ';
    question += 'project\'s existing Database rules.\n';
    question += 'Overwrite Database rules for tests?\n';
    // Yes to overwrite the rules.
    question += '* \'yes\' to agree\n'
    // Skip to continue without overwriting the rules.
    question += '* \'skip\' to continue without the overwrite\n';
    // No to cancel.
    question += '* \'no\' to cancel\n';
    // Prompt user with the 3 options.
    rl.question(question, function(answer) {
      rl.close();
      // Resolve the promise with the answer.
      resolve(answer);
    });
  })
  .then(function(answer) {
    switch (answer.toLowerCase()) {
      case 'y':
      case 'yes':
        // Proceed and update the rules.
        return updateRules();
      case 'skip':
        // Continue without updating the rules.
        return Promise.resolve();
      case 'no':
      case 'n':
      default:
        // Abort and exit.
        throw new Error('Integration test aborted!');
    }
  });
}

function updateRules() {
  // Update database rules to the defaults. Rest of the test suite
  // expects it.
  const client = new apiRequest.SignedApiRequestHandler(defaultApp);
  const dbUrl =  url.parse(defaultApp.options.databaseURL);
  const defaultRules = {
    rules : {
      '.read': 'auth != null',
      '.write': 'auth != null',
    },
  };
  const headers = {
    'Content-Type': 'application/json',
  };
  return client.sendRequest(dbUrl.host, 443, '/.settings/rules.json', 
    'PUT', defaultRules, headers, 10000);
}

return Promise.resolve()
  .then(promptForUpdateRules)
  .then(_.partial(app.test, utils))
  .then(_.partial(auth.test, utils))
  .then(_.partial(database.test, utils))
  .then(_.partial(messaging.test, utils))
  .then(utils.logResults)
  .catch(function(error) {
    console.log(chalk.red('\nSOMETHING WENT WRONG!', error));
    process.exit(1);
  });
