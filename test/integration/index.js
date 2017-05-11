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

var admin = require('../../lib/index');

var utils = require('./utils');

var app = require('./app');
var auth = require('./auth');
var database = require('./database');
var messaging = require('./messaging');

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


return Promise.resolve()
  .then(_.partial(app.test, utils))
  .then(_.partial(auth.test, utils))
  .then(_.partial(database.test, utils))
  .then(_.partial(messaging.test, utils))
  .then(utils.logResults)
  .catch(function(error) {
    console.log(chalk.red('\nSOMETHING WENT WRONG!', error));
    process.exit(1);
  });
