/*!
 * Copyright 2020 Google Inc.
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

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { RemoteConfig } from '../../../src/remote-config/remote-config';
import { FirebaseApp } from '../../../src/firebase-app';
import * as mocks from '../../resources/mocks';
import { RemoteConfigApiClient } from '../../../src/remote-config/remote-config-api-client';
import { FirebaseRemoteConfigError } from '../../../src/remote-config/remote-config-utils';
import { deepCopy } from '../../../src/utils/deep-copy';

const expect = chai.expect;

describe('RemoteConfig', () => {

  const INTERNAL_ERROR = new FirebaseRemoteConfigError('internal-error', 'message');
  const REMOTE_CONFIG_RESPONSE: {
    // This type is effectively a RemoteConfigResponse, but with non-readonly fields
    // to allow easier use from within the tests. An improvement would be to
    // alter this into a helper that creates customized RemoteConfigResponse based
    // on the needs of the test, as that would ensure type-safety.
    conditions?: Array<{ name: string; expression: string; tagColor: string }>;
    parameters?: object | null;
    version?: object;
    eTag: string;
  } = {
    conditions: [{
      name: 'ios',
      expression: 'device.os == \'ios\'',
      tagColor: 'BLUE',
    }],
    parameters: {
      // eslint-disable-next-line @typescript-eslint/camelcase
      holiday_promo_enabled: {
        defaultValue: { value: 'true' },
        conditionalValues: { ios: { useInAppDefault: true } },
        description: 'this is a promo',
      },
    },
    version: {
      versionNumber: '5',
      updateTime: '2020-02-26T20:33:43.300Z',
      updateUser: { email: 'user@user.com' },
      updateOrigin: 'CONSOLE',
      updateType: 'INCREMENTAL_UPDATE',
    },
    eTag: 'etag-123456789012-5',
  };

  let remoteConfig: RemoteConfig;
  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];

  before(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
    remoteConfig = new RemoteConfig(mockApp);
  });

  after(() => {
    return mockApp.delete();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
  });

  describe('Constructor', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it('should throw given invalid app: ' + JSON.stringify(invalidApp), () => {
        expect(() => {
          const remoteConfigAny: any = RemoteConfig;
          return new remoteConfigAny(invalidApp);
        }).to.throw(
          'First argument passed to admin.remoteConfig() must be a valid Firebase app '
          + 'instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const remoteConfigAny: any = RemoteConfig;
        return new remoteConfigAny();
      }).to.throw(
        'First argument passed to admin.remoteConfig() must be a valid Firebase app '
        + 'instance.');
    });

    it('should reject when initialized without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
        + 'account credentials, or set project ID as an app option. Alternatively, set the '
        + 'GOOGLE_CLOUD_PROJECT environment variable.';
      const remoteConfigWithoutProjectId = new RemoteConfig(mockCredentialApp);
      return remoteConfigWithoutProjectId.getTemplate()
        .should.eventually.rejectedWith(noProjectId);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new RemoteConfig(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(remoteConfig.app).to.equal(mockApp);
    });
  });

  describe('getTemplate', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, 'getTemplate')
        .rejects(INTERNAL_ERROR);
      stubs.push(stub);
      return remoteConfig.getTemplate()
        .should.eventually.be.rejected.and.deep.equal(INTERNAL_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, 'getTemplate')
        .resolves(null);
      stubs.push(stub);
      return remoteConfig.getTemplate()
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid Remote Config template response: null');
    });

    it('should reject when API response does not contain an ETag', () => {
      const response = deepCopy(REMOTE_CONFIG_RESPONSE);
      response.eTag = '';
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, 'getTemplate')
        .resolves(response);
      stubs.push(stub);
      return remoteConfig.getTemplate()
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Remote Config template response: ${JSON.stringify(response)}`);
    });

    it('should reject when API response does not contain valid parameters', () => {
      const response = deepCopy(REMOTE_CONFIG_RESPONSE);
      response.parameters = null;
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, 'getTemplate')
        .resolves(response);
      stubs.push(stub);
      return remoteConfig.getTemplate()
        .should.eventually.be.rejected.and.have.property(
          'message', `Remote Config parameters must be a non-null object`);
    });

    it('should reject when API response does not contain valid conditions', () => {
      const response = deepCopy(REMOTE_CONFIG_RESPONSE);
      response.conditions = Object();
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, 'getTemplate')
        .resolves(response);
      stubs.push(stub);
      return remoteConfig.getTemplate()
        .should.eventually.be.rejected.and.have.property(
          'message', `Remote Config conditions must be an array`);
    });

    it('should resolve with Remote Config template on success', () => {
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, 'getTemplate')
        .resolves(REMOTE_CONFIG_RESPONSE);
      stubs.push(stub);

      return remoteConfig.getTemplate()
        .then((template) => {
          expect(template.conditions.length).to.equal(1);
          expect(template.conditions[0].name).to.equal('ios');
          expect(template.conditions[0].expression).to.equal('device.os == \'ios\'');
          // verify the property mapping in RemoteConfigCondition from `tagColor` to `color`
          expect(template.conditions[0].color).to.equal('BLUE');

          expect(template.eTag).to.equal('etag-123456789012-5');

          const key = 'holiday_promo_enabled';
          const p1 = template.parameters[key];
          expect(p1.defaultValue).deep.equals({ value: 'true' });
          expect(p1.conditionalValues).deep.equals({ ios: { useInAppDefault: true } });
          expect(p1.description).equals('this is a promo');

          const p2 = template.getParameter(key);
          if (p2) {
            expect(p2.defaultValue).deep.equals({ value: 'true' });
            expect(p2.conditionalValues).deep.equals({ ios: { useInAppDefault: true } });
            expect(p2.description).equals('this is a promo');
          }

          const c = template.getCondition('ios');
          if (c) {
            expect(c.name).to.equal('ios');
            expect(c.expression).to.equal('device.os == \'ios\'');
            expect(c.color).to.equal('BLUE');
          }
        });
    });
  });
});
