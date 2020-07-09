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

'use strict';

// Use untyped import syntax for Node built-ins
import path = require('path');

import * as _ from 'lodash';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from '../resources/mocks';

import { initializeApp, apps, credential, cert, app } from '../../lib/index';
import { RefreshTokenCredential, ServiceAccountCredential, isApplicationDefault } from '../../lib/auth/credential';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;


describe('Firebase', () => {
  let getTokenStub: sinon.SinonStub;

  before(() => {
    getTokenStub = sinon.stub(ServiceAccountCredential.prototype, 'getAccessToken').resolves({
      access_token: 'mock-access-token', // eslint-disable-line @typescript-eslint/camelcase
      expires_in: 3600, // eslint-disable-line @typescript-eslint/camelcase
    });
  });

  after(() => {
    getTokenStub.restore();
  });

  afterEach(() => {
    const deletePromises: Array<Promise<void>> = [];
    apps().forEach((app) => {
      deletePromises.push(app.delete());
    });

    return Promise.all(deletePromises);
  });

  describe('#initializeApp()', () => {
    const invalidOptions: any[] = [null, NaN, 0, 1, true, false, '', 'a', [], _.noop];
    invalidOptions.forEach((invalidOption: any) => {
      it('should throw given invalid options object: ' + JSON.stringify(invalidOption), () => {
        expect(() => {
          initializeApp(invalidOption);
        }).to.throw('Invalid Firebase app options');
      });
    });

    it('should use application default credentials when no credentials are explicitly specified', () => {
      const app = initializeApp(mocks.appOptionsNoAuth);
      expect(app.options).to.have.property('credential');
      expect(app.options.credential).to.not.be.undefined;
    });

    it('should not modify the provided options object', () => {
      const optionsClone = _.clone(mocks.appOptions);
      initializeApp(mocks.appOptions);
      expect(optionsClone).to.deep.equal(mocks.appOptions);
    });

    const invalidCredentials = [undefined, null, NaN, 0, 1, '', 'a', true, false, '', _.noop];
    invalidCredentials.forEach((invalidCredential) => {
      it('should throw given non-object credential: ' + JSON.stringify(invalidCredential), () => {
        expect(() => {
          initializeApp({
            credential: invalidCredential as any,
          });
        }).to.throw('Invalid Firebase app options');
      });
    });

    it('should throw given a credential which doesn\'t implement the Credential interface', () => {
      expect(() => {
        initializeApp({
          credential: {},
        } as any);
      }).to.throw('Invalid Firebase app options');

      expect(() => {
        initializeApp({
          credential: {
            getAccessToken: true,
          },
        } as any);
      }).to.throw('Invalid Firebase app options');
    });

    it('should initialize SDK given a cert credential with a certificate object', () => {
      initializeApp({
        credential: cert(mocks.certificateObject),
      });

      expect(isApplicationDefault(app().options.credential)).to.be.false;
      return app().INTERNAL.getToken()
        .should.eventually.have.keys(['accessToken', 'expirationTime']);
    });

    it('should initialize SDK given a cert credential with a valid path to a certificate key file', () => {
      const keyPath = path.resolve(__dirname, '../resources/mock.key.json');
      initializeApp({
        credential: cert(keyPath),
      });

      expect(isApplicationDefault(app().options.credential)).to.be.false;
      return app().INTERNAL.getToken()
        .should.eventually.have.keys(['accessToken', 'expirationTime']);
    });

    it('should initialize SDK given an application default credential', () => {
      const credPath: string | undefined = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../resources/mock.key.json');
      initializeApp({
        credential: credential.applicationDefault(),
      });

      expect(isApplicationDefault(app().options.credential)).to.be.true;
      return app().INTERNAL.getToken().then((token) => {
        if (typeof credPath === 'undefined') {
          delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
        } else {
          process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
        }
        return token;
      }).should.eventually.have.keys(['accessToken', 'expirationTime']);
    });

    it('should initialize SDK given a refresh token credential', () => {
      getTokenStub.restore();
      getTokenStub = sinon.stub(RefreshTokenCredential.prototype, 'getAccessToken')
        .resolves({
          access_token: 'mock-access-token', // eslint-disable-line @typescript-eslint/camelcase
          expires_in: 3600, // eslint-disable-line @typescript-eslint/camelcase
        });
      initializeApp({
        credential: credential.refreshToken(mocks.refreshToken),
      });

      expect(isApplicationDefault(app().options.credential)).to.be.false;
      return app().INTERNAL.getToken()
        .should.eventually.have.keys(['accessToken', 'expirationTime']);
    });
  });
});
