/*!
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

import * as _ from 'lodash';
import * as admin from '../../lib/index';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import fs = require('fs');
import path = require('path');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chalk = require('chalk');

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

let appId: string;

describe('admin.appCheck', () => {
  before(async () => {
    try {
      appId = fs.readFileSync(path.join(__dirname, '../resources/appid.txt')).toString().trim();
    } catch (error) {
      console.log(chalk.yellow(
        'Unable to find an an App ID. Skipping tests that require a valid App ID.',
        error,
      ));
    }
  });

  describe('createToken', () => {
    it('should succeed with a vaild token', function() {
      if (!appId) {
        this.skip();
      }
      return admin.appCheck().createToken(appId as string)
        .then((token) => {
          expect(token).to.have.keys(['token', 'ttlMillis']);
          expect(token.token).to.be.a('string').and.to.not.be.empty;
          expect(token.ttlMillis).to.be.a('number');
          expect(token.ttlMillis).to.equals(3600000);
        });
    });

    it('should succeed with a valid token and a custom ttl', function() {
      if (!appId) {
        this.skip();
      }
      return admin.appCheck().createToken(appId as string, { ttlMillis: 1800000 })
        .then((token) => {
          expect(token).to.have.keys(['token', 'ttlMillis']);
          expect(token.token).to.be.a('string').and.to.not.be.empty;
          expect(token.ttlMillis).to.be.a('number');
          expect(token.ttlMillis).to.equals(1800000);
        });
    });

    it('should propagate API errors', () => {
      // rejects with invalid-argument when appId is incorrect
      return admin.appCheck().createToken('incorrect-app-id')
        .should.eventually.be.rejected.and.have.property('code', 'app-check/invalid-argument');
    });

    const invalidAppIds = ['', null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
    invalidAppIds.forEach((invalidAppId) => {
      it(`should throw given an invalid appId: ${JSON.stringify(invalidAppId)}`, () => {
        expect(() => admin.appCheck().createToken(invalidAppId as any))
          .to.throw('appId` must be a non-empty string.');
      });
    });
  });

  describe('verifyToken', () => {
    let validToken: admin.appCheck.AppCheckToken;

    before(async () => {
      if (!appId) {
        return;
      }
      // obtain a valid app check token
      validToken = await admin.appCheck().createToken(appId as string);
    });

    it('should succeed with a decoded verifed token response', function() {
      if (!appId) {
        this.skip();
      }
      return admin.appCheck().verifyToken(validToken.token)
        .then((verifedToken) => {
          expect(verifedToken).to.have.keys(['token', 'appId']);
          expect(verifedToken.token).to.include.keys(['iss', 'sub', 'aud', 'exp', 'iat', 'app_id']);
          expect(verifedToken.token.app_id).to.be.a('string').and.equals(appId);
        });
    });

    it('should propagate API errors', () => {
      // rejects with invalid-argument when the token is invalid
      return admin.appCheck().verifyToken('invalid-token')
        .should.eventually.be.rejected.and.have.property('code', 'app-check/invalid-argument');
    });
  });
});
