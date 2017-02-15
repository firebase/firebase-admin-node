var _ = require('lodash');
var chalk = require('chalk');

var admin = require('../../lib/index');

var utils = require('./utils');

var app = require('./app');
var auth = require('./auth');
var database = require('./database');
var messaging = require('./messaging');

var serviceAccount;
try {
  serviceAccount = require('../resources/key.json');
} catch(error) {
  console.log(chalk.red(
    'The integration test suite requires a service account key JSON file for the ' +
    '`admin-sdks-test` project to be saved to `test/resources/key.json`.',
    error
  ));
  process.exit(1);
}

var defaultApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://admin-sdks-test.firebaseio.com',
});

var nullApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://admin-sdks-test.firebaseio.com',
  databaseAuthVariableOverride: null,
}, 'null');

var nonNullApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://admin-sdks-test.firebaseio.com',
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
