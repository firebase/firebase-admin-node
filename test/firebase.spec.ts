'use strict';

// Use untyped import syntax for Node built-ins
import path = require('path');

import {expect} from 'chai';
import * as _ from 'lodash';
import * as chai from 'chai';
import * as nock from 'nock';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from './utils';
import * as mocks from './resources/mocks';

import * as firebaseAdmin from '../src/index';

chai.should();
chai.use(chaiAsPromised);


describe('Firebase', () => {
  let mockedRequests: nock.Scope[] = [];

  afterEach(() => {
    firebaseAdmin.apps.forEach((app) => {
      app.delete();
    });

    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    mockedRequests = [];
  });

  after(() => {
    nock.cleanAll();
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

    it('should throw given an options object containing neither a "serviceAccount" nor a "credential" key', () => {
      expect(() => {
        firebaseAdmin.initializeApp(mocks.appOptionsNoAuth);
      }).to.throw('Invalid Firebase app options');
    });

    it('should throw given an options object containing both the "serviceAccount" and "credential" keys', () => {
      expect(() => {
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.applicationDefault(),
          serviceAccount: mocks.certificateObject,
        });
      }).to.throw('Invalid Firebase app options');
    });

    it('should not modify the provided options object', () => {
      let optionsClone = _.clone(mocks.appOptions);
      firebaseAdmin.initializeApp(mocks.appOptions);
      expect(optionsClone).to.deep.equal(mocks.appOptions);
    });

    describe('serviceAccount key', () => {
      it('should initialize SDK given a service account object', () => {
        mockedRequests.push(utils.mockFetchAccessTokenViaJwt());

        firebaseAdmin.initializeApp({
          serviceAccount: mocks.certificateObject,
        });

        return (firebaseAdmin.app().auth().INTERNAL as any).getToken()
          .should.eventually.have.keys(['accessToken', 'expirationTime']);
      });

      it('should initialize SDK given a service account filename', () => {
        mockedRequests.push(utils.mockFetchAccessTokenViaJwt());

        firebaseAdmin.initializeApp({
          serviceAccount: path.resolve(__dirname, 'resources/mock.key.json'),
        });

        return (firebaseAdmin.app().auth().INTERNAL as any).getToken()
          .should.eventually.have.keys(['accessToken', 'expirationTime']);
      });
    });

    describe('credential key', () => {
      it('should initialize SDK given a cert credential with a service account object', () => {
        mockedRequests.push(utils.mockFetchAccessTokenViaJwt());

        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(mocks.certificateObject),
        });

        return (firebaseAdmin.app().auth().INTERNAL as any).getToken()
            .should.eventually.have.keys(['accessToken', 'expirationTime']);
      });

      it('should initialize SDK given a cert credential with service account filename', () => {
        mockedRequests.push(utils.mockFetchAccessTokenViaJwt());

        const keyPath = path.resolve(__dirname, 'resources/mock.key.json');
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(keyPath),
        });

        return (firebaseAdmin.app().auth().INTERNAL as any).getToken()
            .should.eventually.have.keys(['accessToken', 'expirationTime']);
      });

      it('should initialize SDK given an application default credential', () => {
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.applicationDefault(),
        });

        return (firebaseAdmin.app().auth().INTERNAL as any).getToken()
          .should.eventually.have.keys(['accessToken', 'expirationTime']);
      });

      // TODO(jwenger): mock out the refresh token endpoint so this test will work
      xit('should initialize SDK given a refresh token credential', () => {
        nock.recorder.rec();
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.refreshToken(mocks.refreshToken),
        });

        return (firebaseAdmin.app().auth().INTERNAL as any).getToken()
          .should.eventually.have.keys(['accessToken', 'expirationTime']);
      });
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
});
