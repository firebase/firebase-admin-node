'use strict';

import {expect} from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as firebase from '../src/index';
import {FirebaseAppOptions} from '../src/firebase-app';

chai.should();
chai.use(chaiAsPromised);

const mockOptions: FirebaseAppOptions = {
  databaseURL: 'https://foo.firebaseio.com',
};

describe('Firebase', () => {
  afterEach(() => {
    firebase.apps.forEach((app) => {
      app.delete();
    });
  });

  describe('#database()', () => {
    it('should throw if the app has not be initialized', () => {
      expect(() => {
        return firebase.database();
      }).to.throw(`No Firebase app named '[DEFAULT]' exists.`);
    });

    it('should return the database service', () => {
      firebase.initializeApp(mockOptions);
      expect(() => {
        return firebase.database();
      }).not.to.throw();
    });
  });

  describe('#auth', () => {
    it('should throw if the app has not be initialized', () => {
      expect(() => {
        return firebase.auth();
      }).to.throw(`No Firebase app named '[DEFAULT]' exists.`);
    });

    it('should return the auth service', () => {
      firebase.initializeApp(mockOptions);
      expect(() => {
        return firebase.auth();
      }).not.to.throw();
    });
  });
});
