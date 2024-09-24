/*!
 * @license
 * Copyright 2024 Google Inc.
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

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from '../../resources/mocks';
import { App } from '../../../src/app/index';
import { getDataConnect, DataConnect } from '../../../src/data-connect/index';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('DataConnect', () => {
  let mockApp: App;
  let mockCredentialApp: App;

  const noProjectIdError = 'Failed to determine project ID. Initialize the SDK '
    + 'with service account credentials or set project ID as an app option. Alternatively, set the '
    + 'GOOGLE_CLOUD_PROJECT environment variable.';

  const connectorConfig = {
    location: 'us-west2',
    serviceId: 'my-service',
  };

  beforeEach(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
  });

  describe('getDataConnect()', () => {
    it('should throw when default app is not available', () => {
      expect(() => {
        return getDataConnect(connectorConfig);
      }).to.throw('The default Firebase app does not exist.');
    });

    it('should reject given an invalid credential without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      const dataConnect = getDataConnect(connectorConfig, mockCredentialApp);
      return dataConnect.executeGraphql('query')
        .should.eventually.rejectedWith(noProjectIdError);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return getDataConnect(connectorConfig, mockApp);
      }).not.to.throw();
    });

    it('should return the same instance for a given config and app instance', () => {
      const dc1: DataConnect = getDataConnect(connectorConfig, mockApp);
      const dc2: DataConnect = getDataConnect(connectorConfig, mockApp);
      expect(dc1).to.equal(dc2);
    });

    it('should not return the same instance when different configs are provided', () => {
      const dc1: DataConnect = getDataConnect(connectorConfig, mockApp);
      const dc2: DataConnect = getDataConnect({ location: 'us-east1', serviceId: 'my-db' }, mockApp);
      expect(dc1).to.not.equal(dc2);
    });
  });
});
