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

    xit('should throw given an options object containing both the "serviceAccount" and "credential" keys', () => {
      expect(() => {
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.auth.applicationDefaultCredential(),
          serviceAccount: mocks.certificateObject,
        });
      }).to.throw('Invalid Firebase app options');
    });

    it('should throw after calling database() given no databaseURL option', () => {
      firebaseAdmin.initializeApp(mocks.appOptionsNoDatabaseUrl);

      expect(() => {
        firebaseAdmin.database();
      }).to.throw('Can\'t determine Firebase Database URL');
    });

    it('should initialize SDK to return null access tokens given no authentication', () => {
      firebaseAdmin.initializeApp(mocks.appOptionsNoAuth);
      return (firebaseAdmin.app().auth().INTERNAL as any).getToken()
        .should.eventually.be.null;
    });

    it('should initialize SDK to return actual access tokens given a service account object', () => {
      mockedRequests.push(utils.mockFetchAccessTokenViaJwt());

      firebaseAdmin.initializeApp({
        serviceAccount: mocks.certificateObject,
      });

      return (firebaseAdmin.app().auth().INTERNAL as any).getToken()
          .should.eventually.have.keys(['accessToken', 'expirationTime']);
    });

    it('should initialize SDK to return actual access tokens given a service account filename', () => {
      mockedRequests.push(utils.mockFetchAccessTokenViaJwt());

      firebaseAdmin.initializeApp({
        serviceAccount: path.resolve(__dirname, 'resources/mock.key.json'),
      });

      return (firebaseAdmin.app().auth().INTERNAL as any).getToken()
          .should.eventually.have.keys(['accessToken', 'expirationTime']);
    });

    xit('should initialize SDK to return actual access tokens given an application default credential', () => {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.auth.applicationDefaultCredential(),
      });

      return (firebaseAdmin.app().auth().INTERNAL as any).getToken()
        .should.eventually.have.keys(['accessToken', 'expirationTime']);
    });

    xit('should initialize SDK to return actual access tokens given a metadata service credential', () => {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.auth.metadataServiceCredential(),
      });

      return (firebaseAdmin.app().auth().INTERNAL as any).getToken()
        .should.eventually.have.keys(['accessToken', 'expirationTime']);
    });

    xit('should initialize SDK to return actual access tokens given a refresh token credential', () => {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.auth.refreshTokenCredential(/* refreshToken */),
      });

      return (firebaseAdmin.app().auth().INTERNAL as any).getToken()
        .should.eventually.have.keys(['accessToken', 'expirationTime']);
    });
  });

  describe('#database()', () => {
    it('should throw if the app has not be initialized', () => {
      expect(() => {
        return firebaseAdmin.database();
      }).to.throw(`No Firebase app named '[DEFAULT]' exists.`);
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
      }).to.throw(`No Firebase app named '[DEFAULT]' exists.`);
    });

    it('should return the auth service', () => {
      firebaseAdmin.initializeApp(mocks.appOptions);
      expect(() => {
        return firebaseAdmin.auth();
      }).not.to.throw();
    });
  });
});
