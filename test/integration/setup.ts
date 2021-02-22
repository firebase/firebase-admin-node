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

import fs = require('fs');
import minimist = require('minimist');
import path = require('path');
import { random } from 'lodash';
import {
  App, Credential, GoogleOAuthAccessToken, cert, deleteApp, initializeApp,
} from '../../lib/app/index'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chalk = require('chalk');

export let databaseUrl: string;
export let storageBucket: string;
export let projectId: string;
export let apiKey: string;

export let defaultApp: App;
export let nullApp: App;
export let nonNullApp: App;
export let noServiceAccountApp: App;

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

  defaultApp = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: databaseUrl,
    storageBucket,
  });

  nullApp = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: databaseUrl,
    databaseAuthVariableOverride: null,
    storageBucket,
  }, 'null');

  nonNullApp = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: databaseUrl,
    databaseAuthVariableOverride: {
      uid: generateRandomString(20),
    },
    storageBucket,
  }, 'nonNull');

  noServiceAccountApp = initializeApp({
    credential: new CertificatelessCredential(cert(serviceAccount)),
    serviceAccountId: serviceAccount.client_email,
    projectId,
  }, 'noServiceAccount');

  cmdArgs = minimist(process.argv.slice(2));
});

after(() => {
  return Promise.all([
    deleteApp(defaultApp),
    deleteApp(nullApp),
    deleteApp(nonNullApp),
    deleteApp(noServiceAccountApp),
  ]);
});

class CertificatelessCredential implements Credential {
  private readonly delegate: Credential;

  constructor(delegate: Credential) {
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
