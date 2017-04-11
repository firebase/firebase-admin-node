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

    describe('"serviceAccount" key', () => {
      const invalidServiceAccounts = [undefined, null, NaN, 0, 1, true, false, _.noop];
      invalidServiceAccounts.forEach((invalidServiceAccount) => {
        it('should throw given invalid service account: ' + JSON.stringify(invalidServiceAccount), () => {
          expect(() => {
            firebaseAdmin.initializeApp({
              serviceAccount: invalidServiceAccount,
            });
          }).to.throw('Invalid Firebase app options');
        });
      });

      it('should throw if service account points to an invalid path', () => {
        expect(() => {
          firebaseAdmin.initializeApp({
            serviceAccount: 'invalid-file',
          });
        }).to.throw('Failed to parse certificate key file');
      });

      it('should throw if service account is an empty string', () => {
        expect(() => {
          firebaseAdmin.initializeApp({
            serviceAccount: '',
          });
        }).to.throw('Failed to parse certificate key file');
      });

      it('should throw if certificate object does not contain a valid "client_email"', () => {
        const mockCertificateObject = _.clone(mocks.certificateObject);
        mockCertificateObject.client_email = '';

        expect(() => {
          firebaseAdmin.initializeApp({
            serviceAccount: mockCertificateObject,
          });
        }).to.throw('Certificate object must contain a string "client_email" property');

        delete mockCertificateObject.client_email;

        expect(() => {
          firebaseAdmin.initializeApp({
            serviceAccount: mockCertificateObject,
          });
        }).to.throw('Certificate object must contain a string "client_email" property');
      });

      it('should throw if certificate object does not contain a valid "private_key"', () => {
        const mockCertificateObject = _.clone(mocks.certificateObject);
        mockCertificateObject.private_key = '';

        expect(() => {
          firebaseAdmin.initializeApp({
            serviceAccount: mockCertificateObject,
          });
        }).to.throw('Certificate object must contain a string "private_key" property');

        delete mockCertificateObject.private_key;

        expect(() => {
          firebaseAdmin.initializeApp({
            serviceAccount: mockCertificateObject,
          });
        }).to.throw('Certificate object must contain a string "private_key" property');
      });

      it('should not throw given a valid path to a certificate key file', () => {
        expect(() => {
          firebaseAdmin.initializeApp({
            serviceAccount: path.resolve(__dirname, '../resources/mock.key.json'),
          });
        }).not.to.throw();
      });

      it('should not throw given a valid certificate object', () => {
        expect(() => {
          firebaseAdmin.initializeApp({
            serviceAccount: mocks.certificateObject,
          });
        }).not.to.throw();
      });

      it('should accept "clientEmail" in place of "client_email" within the certificate object', () => {
        const mockCertificateObject = _.clone(mocks.certificateObject);
        mockCertificateObject.clientEmail = mockCertificateObject.client_email;
        delete mockCertificateObject.client_email;

        expect(() => {
          firebaseAdmin.initializeApp({
            serviceAccount: mockCertificateObject,
          });
        }).not.to.throw();
      });

      it('should accept "privateKey" in place of "private_key" within the certificate object', () => {
        const mockCertificateObject = _.clone(mocks.certificateObject);
        mockCertificateObject.privateKey = mockCertificateObject.private_key;
        delete mockCertificateObject.private_key;

        expect(() => {
          firebaseAdmin.initializeApp({
            serviceAccount: mockCertificateObject,
          });
        }).not.to.throw();
      });

      it('should not mutate the provided certificate object', () => {
        const mockCertificateObject = _.clone(mocks.certificateObject);

        expect(() => {
          firebaseAdmin.initializeApp({
            serviceAccount: mocks.certificateObject,
          });
        }).not.to.throw();

        expect(mocks.certificateObject).to.deep.equal(mockCertificateObject);
      });

      it('should initialize SDK given a certificate object', () => {

        firebaseAdmin.initializeApp({
          serviceAccount: mocks.certificateObject,
        });

        return firebaseAdmin.app().INTERNAL.getToken()
          .should.eventually.have.keys(['accessToken', 'expirationTime']);
      });

      it('should initialize SDK given a valid path to a certificate key file', () => {
        firebaseAdmin.initializeApp({
          serviceAccount: path.resolve(__dirname, '../resources/mock.key.json'),
        });

        return firebaseAdmin.app().INTERNAL.getToken()
          .should.eventually.have.keys(['accessToken', 'expirationTime']);
      });
    });

    describe('"credential" key', () => {
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
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.applicationDefault(),
        });

        return firebaseAdmin.app().INTERNAL.getToken()
          .should.eventually.have.keys(['accessToken', 'expirationTime']);
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
