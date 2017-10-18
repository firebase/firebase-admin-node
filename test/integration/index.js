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

/**
 * Runs Firebase Admin SDK integration tests.
 * Usage:
 * node index.js
 * Where the following configuration files need to be provided:
 * test/resources/key.json: The service account key file.
 * test/resources/apikey.txt: The API key for the same project.
 *
 * Accepts an optional flag to specify whether to overwrite
 * the specified project's Database rules or skip that step.
 * node index.js --overwrite yes|skip
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
var storage = require('./storage');
var firestore = require('./firestore');

var apiRequest = require('../../lib/utils/api-request');
var url = require('url');

var serviceAccount = utils.getCredential();
var databaseURL = 'https://' + utils.getProjectId() + '.firebaseio.com';
var storageBucket = utils.getProjectId() + '.appspot.com';

var defaultApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL,
  storageBucket: storageBucket,
});

var nullApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL,
  databaseAuthVariableOverride: null,
  storageBucket: storageBucket,
}, 'null');

var nonNullApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL,
  databaseAuthVariableOverride: {
    uid: utils.generateRandomString(20),
  },
  storageBucket: storageBucket,
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
utils.assert(
  _.isEqual(admin.storage(nonNullApp).app, nonNullApp),
  'admin.storage(app).app',
  'App instances do not match.'
);

// Firestore should not be loaded yet.
var gcloud = require.cache[require.resolve('@google-cloud/firestore')];
utils.assert(
  typeof gcloud === 'undefined',
  'require(firebase-admin)',
  'Firestore module already loaded'
);

// Calling admin.firestore should load Firestore
const firestoreNamespace = admin.firestore;
utils.assert(
  typeof firestoreNamespace !== 'undefined',
  'admin.firestore',
  'Firestore namespace could not be loaded.'
);

gcloud = require.cache[require.resolve('@google-cloud/firestore')];
utils.assert(
  typeof gcloud !== 'undefined',
  'admin.firestore',
  'Firestore module not loaded'
);

/**
 * Prompts the developer whether the Database rules should be
 * overwritten with the relevant rules for the integration tests.
 * The developer has 3 options:
 * yes/y to agree to the rules overwrite.
 * skip to skip the overwrite (rules already manually configured) and continue
 * with the tests.
 * no/n or other to abort.
 * @param {*|undefined} overwrite An optional answer that can be provided to
 *     bypass the need to prompt the user whether to proceed with, skip or abort
 *     the Database rules overwrite.
 * @return {Promise} A promise that resolves when the rules change is processed.
 */
function promptForUpdateRules(overwrite) {
  return new Promise(function(resolve, reject) {
    // Overwrite answer already provided.
    if (typeof overwrite === 'string') {
      resolve(overwrite);
      return;
    }
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

/**
 * Parses the script arguments and returns all the provided flags.
 * @param {Array<string>} argv The process.argv list of script arguments.
 * @return {Object} A key/value object with the provided script flags and
 *     their values.
 */
function getScriptArguments(argv) {
  // Dictionary of flags.
  var flags = {};
  var lastFlag = null;
  // Skip first 2 arguments: node index.js
  // Expected format: --flagA valueA --flagB --flagC valueC
  for (var i = 2; i < argv.length; i++) {
    if (argv[i].indexOf('--') === 0) {
      // Get the last flag name.
      lastFlag = argv[i].substr(2);
      // If flag passed with no argument, set to true.
      flags[lastFlag] = true;
    } else if (lastFlag) {
      // Argument provided for last flag, overwrite its value.
      flags[lastFlag] = argv[i];
      lastFlag = null;
    } else {
      // Value provided without a flag name.
      throw new Error('Invalid script argument: "' + argv[i] + '"!');
    }
  }
  return flags;
}

var flags = getScriptArguments(process.argv);
return promptForUpdateRules(flags['overwrite'])
  .then(_.partial(app.test, utils))
  .then(_.partial(auth.test, utils))
  .then(_.partial(database.test, utils))
  .then(_.partial(messaging.test, utils))
  .then(_.partial(storage.test, utils))
  .then(_.partial(firestore.test, utils))
  .then(utils.logResults)
  .catch(function(error) {
    console.log(chalk.red('\nSOMETHING WENT WRONG!', error));
    process.exit(1);
  });
