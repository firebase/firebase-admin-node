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

import {expect} from 'chai';
import * as _ from 'lodash';
import * as chai from 'chai';
import * as nock from 'nock';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from './utils';
import * as mocks from '../resources/mocks';

import * as firebaseAdmin from '../../src/index';

chai.should();
chai.use(chaiAsPromised);


describe('Firebase', () => {
  let mockedRequests: nock.Scope[] = [];

  before(() => utils.mockFetchAccessTokenRequests());

  after(() => nock.cleanAll());

  afterEach(() => {
    const deletePromises = [];
    firebaseAdmin.apps.forEach((app) => {
      deletePromises.push(app.delete());
    });

    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    mockedRequests = [];

    return Promise.all(deletePromises);
  });

  describe('#initializeApp()', () => {
    it('should throw given no options', () => {
      expect(() => {
        (firebaseAdmin as any).initializeApp();
      }).to.throw('Invalid Firebase app options');
    });

    const invalidOptions = [null, NaN, 0, 1, true, false, '', 'a', [], {}, _.noop];
    invalidOptions.forEach((invalidOption) => {
      it('should throw given invalid options object: ' + JSON.stringify(invalidOption), () => {
        expect(() => {
          firebaseAdmin.initializeApp(invalidOption);
        }).to.throw('Invalid Firebase app options');
      });
    });

    it('should throw given an options object that does not contain any of the required keys', () => {
      expect(() => {
        firebaseAdmin.initializeApp({ a: 1, b: true } as any);
      }).to.throw('Invalid Firebase app options');
    });

    it('should throw given an options object containing no "credential" key', () => {
      expect(() => {
        firebaseAdmin.initializeApp(mocks.appOptionsNoAuth);
      }).to.throw('Invalid Firebase app options');
    });

    it('should not modify the provided options object', () => {
      let optionsClone = _.clone(mocks.appOptions);
      firebaseAdmin.initializeApp(mocks.appOptions);
      expect(optionsClone).to.deep.equal(mocks.appOptions);
    });

    const invalidCredentials = [undefined, null, NaN, 0, 1, '', 'a', true, false, '', _.noop];
    invalidCredentials.forEach((invalidCredential) => {
      it('should throw given non-object credential: ' + JSON.stringify(invalidCredential), () => {
        expect(() => {
          firebaseAdmin.initializeApp({
            credential: invalidCredential as any,
          });
        }).to.throw('Invalid Firebase app options');
      });
    });

    it('should throw given a credential which doesn\'t implement the Credential interface', () => {
      expect(() => {
        firebaseAdmin.initializeApp({
          credential: {
            foo: () => null,
          },
        } as any);
      }).to.throw('Invalid Firebase app options');

      expect(() => {
        firebaseAdmin.initializeApp({
          credential: {
            getAccessToken: true,
          },
        } as any);
      }).to.throw('Invalid Firebase app options');
    });

    it('should initialize SDK given a cert credential with a certificate object', () => {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(mocks.certificateObject),
      });

      return firebaseAdmin.app().INTERNAL.getToken()
        .should.eventually.have.keys(['accessToken', 'expirationTime']);
    });

    it('should initialize SDK given a cert credential with a valid path to a certificate key file', () => {
      const keyPath = path.resolve(__dirname, '../resources/mock.key.json');
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(keyPath),
      });

      return firebaseAdmin.app().INTERNAL.getToken()
        .should.eventually.have.keys(['accessToken', 'expirationTime']);
    });

    it('should initialize SDK given an application default credential', () => {
      let credPath: string;
      credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../resources/mock.key.json');
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.applicationDefault(),
      });

      return firebaseAdmin.app().INTERNAL.getToken().then(token => {
        if (typeof credPath === 'undefined') {
          delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
        } else {
          process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
        }
        return token;
      }).should.eventually.have.keys(['accessToken', 'expirationTime']);
    });

    // TODO(jwenger): mock out the refresh token endpoint so this test will work
    xit('should initialize SDK given a refresh token credential', () => {
      nock.recorder.rec();
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.refreshToken(mocks.refreshToken),
      });

      return firebaseAdmin.app().INTERNAL.getToken()
        .should.eventually.have.keys(['accessToken', 'expirationTime']);
    });
  });

  describe('#database()', () => {
    it('should throw if the app has not be initialized', () => {
      expect(() => {
        return firebaseAdmin.database();
      }).to.throw('The default Firebase app does not exist.');
    });

    it('should throw given no databaseURL key when initializing the app', () => {
      firebaseAdmin.initializeApp(mocks.appOptionsNoDatabaseUrl);

      expect(() => {
        firebaseAdmin.database();
      }).to.throw('Can\'t determine Firebase Database URL');
    });

    it('should return the database service', () => {
      firebaseAdmin.initializeApp(mocks.appOptions);
      expect(() => {
        return firebaseAdmin.database();
      }).not.to.throw();
    });
  });

  describe('#auth', () => {
    it('should throw if the app has not be initialized', () => {
      expect(() => {
        return firebaseAdmin.auth();
      }).to.throw('The default Firebase app does not exist.');
    });

    it('should return the auth service', () => {
      firebaseAdmin.initializeApp(mocks.appOptions);
      expect(() => {
        return firebaseAdmin.auth();
      }).not.to.throw();
    });
  });

  describe('#messaging', () => {
    it('should throw if the app has not be initialized', () => {
      expect(() => {
        return firebaseAdmin.messaging();
      }).to.throw('The default Firebase app does not exist.');
    });

    it('should return the messaging service', () => {
      firebaseAdmin.initializeApp(mocks.appOptions);
      expect(() => {
        return firebaseAdmin.messaging();
      }).not.to.throw();
    });
  });
});
