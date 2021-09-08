/*!
 * @license
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

'use strict';

import path = require('path');

import * as _ from 'lodash';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as mocks from '../../resources/mocks';
import * as sinon from 'sinon';

import {
  initializeApp, getApp, getApps, deleteApp, SDK_VERSION,
  Credential, applicationDefault, cert, refreshToken,
} from '../../../src/app/index';
import { clearGlobalAppDefaultCred } from '../../../src/app/credential-factory';
import { defaultAppStore } from '../../../src/app/lifecycle';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;


describe('firebase-admin/app', () => {
  afterEach(() => {
    return defaultAppStore.clearAllApps();
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

    it('should initialize App instance without extended service methods', () => {
      const app = initializeApp(mocks.appOptions);
      expect((app as any).__extended).to.be.undefined;
      expect((app as any).auth).to.be.undefined;
    });
  });

  describe('#getApp()', () => {
    const invalidOptions: any[] = [null, NaN, 0, 1, true, false, '', [], _.noop];
    invalidOptions.forEach((invalidOption: any) => {
      it('should throw given invalid app name: ' + JSON.stringify(invalidOption), () => {
        expect(() => {
          getApp(invalidOption);
        }).to.throw('Invalid Firebase app name');
      });
    });

    it('should return default app when name not specified', () => {
      initializeApp(mocks.appOptionsNoAuth);
      const defaulApp = getApp();
      expect(defaulApp.name).to.equal('[DEFAULT]');
    });

    it('should return named app when available', () => {
      initializeApp(mocks.appOptionsNoAuth, 'testApp');
      const testApp = getApp('testApp');
      expect(testApp.name).to.equal('testApp');
    });

    it('should throw when the default app does not exist', () => {
      expect(() => getApp()).to.throw('The default Firebase app does not exist');
    });

    it('should throw when the specified app does not exist', () => {
      expect(() => getApp('testApp')).to.throw('Firebase app named "testApp" does not exist');
    });
  });

  describe('#getApps()', () => {
    it('should return empty array when no apps available', () => {
      const apps = getApps();
      expect(apps).to.be.empty;
    });

    it('should return a non-empty array of apps', () => {
      initializeApp(mocks.appOptionsNoAuth);
      initializeApp(mocks.appOptionsNoAuth, 'testApp');
      const apps = getApps();
      expect(apps.length).to.equal(2);

      const appNames = apps.map((a) => a.name);
      expect(appNames).to.contain('[DEFAULT]');
      expect(appNames).to.contain('testApp');
    });

    it('apps array is immutable', () => {
      initializeApp(mocks.appOptionsNoAuth);
      const apps = getApps();
      expect(apps.length).to.equal(1);
      apps.push({} as any);

      expect(getApps().length).to.equal(1);
    });
  });

  describe('#deleteApp()', () => {
    it('should delete the specified app', () => {
      const app = initializeApp(mocks.appOptionsNoAuth);
      const spy = sinon.spy(app as any, 'delete');
      deleteApp(app);
      expect(getApps()).to.be.empty;
      expect(spy.calledOnce);
    });

    it('should throw if the app is already deleted', () => {
      const app = initializeApp(mocks.appOptionsNoAuth);
      deleteApp(app);
      expect(() => deleteApp(app)).to.throw('The default Firebase app does not exist');
    });

    const invalidOptions: any[] = [null, NaN, 0, 1, true, false, '', [], _.noop];
    invalidOptions.forEach((invalidOption: any) => {
      it('should throw given invalid app: ' + JSON.stringify(invalidOption), () => {
        expect(() => {
          deleteApp(invalidOption);
        }).to.throw('Invalid app argument');
      });
    });
  });

  describe('SDK_VERSION', () => {
    it('should indicate the current version of the SDK', () => {
      const { version } = require('../../../package.json'); // eslint-disable-line @typescript-eslint/no-var-requires
      expect(SDK_VERSION).to.equal(version);
    });
  });

  describe('#cert()', () => {
    it('should create a service account credential from object', () => {
      const mockCertificateObject = mocks.certificateObject;
      const credential: Credential = cert(mockCertificateObject);
      expect(credential).to.deep.include({
        projectId: mockCertificateObject.project_id,
        clientEmail: mockCertificateObject.client_email,
        privateKey: mockCertificateObject.private_key,
        implicit: false,
      });
    });

    it('should create a service account credential from file path', () => {
      const filePath = path.resolve(__dirname, '../../resources/mock.key.json');
      const mockCertificateObject = mocks.certificateObject;
      const credential: Credential = cert(filePath);
      expect(credential).to.deep.include({
        projectId: mockCertificateObject.project_id,
        clientEmail: mockCertificateObject.client_email,
        privateKey: mockCertificateObject.private_key,
        implicit: false,
      });
    });
  });

  describe('#refreshToken()', () => {
    it('should create a refresh token credential from object', () => {
      const mockRefreshToken = mocks.refreshToken;
      const credential: Credential = refreshToken(mockRefreshToken);
      expect(credential).to.deep.include({
        implicit: false,
      });
    });
  });

  describe('#applicationDefault()', () => {
    before(() => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
    });

    it('should create application default credentials from environment', () => {
      const mockCertificateObject = mocks.certificateObject;
      const credential: Credential = applicationDefault();
      expect(credential).to.deep.include({
        projectId: mockCertificateObject.project_id,
        clientEmail: mockCertificateObject.client_email,
        privateKey: mockCertificateObject.private_key,
        implicit: true,
      });
    });

    it('should cache application default credentials globally', () => {
      const credential1: Credential = applicationDefault();
      const credential2: Credential = applicationDefault();
      expect(credential1).to.equal(credential2);
    });

    after(clearGlobalAppDefaultCred);
  });
});
