/*!
 * Copyright 2018 Google Inc.
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

import * as admin from '../../lib/index';
import fs = require('fs');
import minimist = require('minimist');
import path = require('path');
import { random } from 'lodash';
import { GoogleOAuthAccessToken } from '../../src/credential/index';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chalk = require('chalk');

export let databaseUrl: string;
export let storageBucket: string;
export let projectId: string;
export let apiKey: string;

export let defaultApp: admin.app.App;
export let nullApp: admin.app.App;
export let nonNullApp: admin.app.App;
export let noServiceAccountApp: admin.app.App;

export let cmdArgs: any;

before(() => {
  /* tslint:disable:no-console */
  let serviceAccount: any;
  try {
    serviceAccount = require('../resources/key.json');
  } catch (error) {
    console.log(chalk.red(
      'The integration test suite requires a service account JSON file for a ' +
      'Firebase project to be saved to `test/resources/key.json`.',
      error,
    ));
    throw error;
  }

  try {
    apiKey = fs.readFileSync(path.join(__dirname, '../resources/apikey.txt')).toString().trim();
  } catch (error) {
    console.log(chalk.red(
      'The integration test suite requires an API key for a ' +
      'Firebase project to be saved to `test/resources/apikey.txt`.',
      error,
    ));
    throw error;
  }
  /* tslint:enable:no-console */

  projectId = serviceAccount.project_id;
  databaseUrl = 'https://' + projectId + '.firebaseio.com';
  storageBucket = projectId + '.appspot.com';

  defaultApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseUrl,
    storageBucket,
  });

  nullApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseUrl,
    databaseAuthVariableOverride: null,
    storageBucket,
  }, 'null');

  nonNullApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseUrl,
    databaseAuthVariableOverride: {
      uid: generateRandomString(20),
    },
    storageBucket,
  }, 'nonNull');

  noServiceAccountApp = admin.initializeApp({
    credential: new CertificatelessCredential(admin.credential.cert(serviceAccount)),
    serviceAccountId: serviceAccount.client_email,
    projectId,
  }, 'noServiceAccount');

  cmdArgs = minimist(process.argv.slice(2));
});

after(() => {
  return Promise.all([
    defaultApp.delete(),
    nullApp.delete(),
    nonNullApp.delete(),
    noServiceAccountApp.delete(),
  ]);
});

class CertificatelessCredential implements admin.credential.Credential {
  private readonly delegate: admin.credential.Credential;

  constructor(delegate: admin.credential.Credential) {
    this.delegate = delegate;
  }

  public getAccessToken(): Promise<GoogleOAuthAccessToken> {
    return this.delegate.getAccessToken();
  }
}

/**
 * Generate a random string of the specified length, optionally using the specified alphabet.
 *
 * @param length The length of the string to generate.
 * @param allowNumbers Whether to allow numbers in the generated string. The default is true.
 * @return A random string of the provided length.
 */
export function generateRandomString(length: number, allowNumbers = true): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
      (allowNumbers ? '0123456789' : '');
  let text = '';
  for (let i = 0; i < length; i++) {
    text += alphabet.charAt(random(alphabet.length - 1));
  }
  return text;
}
