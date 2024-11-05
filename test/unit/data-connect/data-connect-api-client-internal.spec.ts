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

import * as _ from 'lodash';
import { expect } from 'chai';
import * as sinon from 'sinon';
import {
  AuthorizedHttpClient,
  HttpClient,
} from '../../../src/utils/api-request';
import * as utils from '../utils';
import * as mocks from '../../resources/mocks';
import { DataConnectApiClient, FirebaseDataConnectError }
  from '../../../src/data-connect/data-connect-api-client-internal';
import { FirebaseApp } from '../../../src/app/firebase-app';
import { ConnectorConfig } from '../../../src/data-connect';
import { getMetricsHeader, getSdkVersion } from '../../../src/utils';

describe('DataConnectApiClient', () => {

  const ERROR_RESPONSE = {
    error: {
      code: 404,
      message: 'Requested entity not found',
      status: 'NOT_FOUND',
    },
  };

  const EXPECTED_HEADERS = {
    'Authorization': 'Bearer mock-token',
    'X-Firebase-Client': `fire-admin-node/${getSdkVersion()}`,
    'X-Goog-Api-Client': getMetricsHeader(),
  };

  const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
  + 'account credentials or set project ID as an app option. Alternatively, set the '
  + 'GOOGLE_CLOUD_PROJECT environment variable.';

  const TEST_RESPONSE = {
    data: {
      users: [
        { uid: 'QVBJcy5ndXJ1', name: 'Fred', address: '32 Elm St. N' },
        { name: 'Name', address: 'Address', uid: 'QVBJcy5ndXJ2' },
        { name: 'Fred', address: '32 St.', uid: 'QVBJcy5ndXJ3' }
      ]
    }
  };

  const connectorConfig: ConnectorConfig = {
    location: 'us-west2',
    serviceId: 'my-service',
  };

  const clientWithoutProjectId = new DataConnectApiClient(
    connectorConfig,
    mocks.mockCredentialApp());

  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
  };

  let app: FirebaseApp;

  let apiClient: DataConnectApiClient;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    app = mocks.appWithOptions(mockOptions);
    apiClient = new DataConnectApiClient(connectorConfig, app);
  });

  afterEach(() => {
    sandbox.restore();
    if (process.env.DATA_CONNECT_EMULATOR_HOST) {
      delete process.env.DATA_CONNECT_EMULATOR_HOST;
    }
    return app.delete();
  });

  describe('constructor', () => {
    it('should throw an error if app is not a valid Firebase app instance', () => {
      expect(() => new DataConnectApiClient(connectorConfig, null as unknown as FirebaseApp)).to.throw(
        FirebaseDataConnectError,
        'First argument passed to getDataConnect() must be a valid Firebase app instance.'
      );
    });

    it('should initialize httpClient with the provided app', () => {
      expect((apiClient as any).httpClient).to.be.an.instanceOf(AuthorizedHttpClient);
    });
  });

  describe('executeGraphql', () => {
    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.executeGraphql('query', {})
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should throw an error if query is not a non-empty string', async () => {
      await expect(apiClient.executeGraphql('')).to.be.rejectedWith(
        FirebaseDataConnectError,
        '`query` must be a non-empty string.'
      );
      await expect(apiClient.executeGraphql(undefined as any)).to.be.rejectedWith(
        FirebaseDataConnectError,
        '`query` must be a non-empty string.'
      );
    });

    const invalidQueries = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
    invalidQueries.forEach((invalidQuery) => {
      it('should throw given a non-string query: ' + JSON.stringify(invalidQuery), async () => {
        await expect(apiClient.executeGraphql(invalidQuery as any)).to.be.rejectedWith(
          FirebaseDataConnectError,
          '`query` must be a non-empty string.'
        );
      });
    });

    const invalidOptions = [null, NaN, 0, 1, true, false, [], _.noop];
    invalidOptions.forEach((invalidOption) => {
      it('should throw given an invalid options object: ' + JSON.stringify(invalidOption), async () => {
        await expect(apiClient.executeGraphql('query', invalidOption as any)).to.be.rejectedWith(
          FirebaseDataConnectError,
          'GraphqlOptions must be a non-null object'
        );
      });
    });

    it('should reject when a full platform error response is received', () => {
      sandbox
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      const expected = new FirebaseDataConnectError('not-found', 'Requested entity not found');
      return apiClient.executeGraphql('query', {})
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error when error code is not present', () => {
      sandbox
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      const expected = new FirebaseDataConnectError('unknown-error', 'Unknown server error: {}');
      return apiClient.executeGraphql('query', {})
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error for non-json response', () => {
      sandbox
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      const expected = new FirebaseDataConnectError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.executeGraphql('query', {})
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject when rejected with a FirebaseDataConnectError', () => {
      const expected = new FirebaseDataConnectError('internal-error', 'socket hang up');
      sandbox
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      return apiClient.executeGraphql('query', {})
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should resolve with the GraphQL response on success', () => {
      interface UsersResponse {
        users: [
          user: {
            id: string;
            name: string;
            address: string;
          }
        ];
      }
      const stub = sandbox
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200));
      return apiClient.executeGraphql<UsersResponse, unknown>('query', {})
        .then((resp) => {
          expect(resp.data.users).to.be.not.empty;
          expect(resp.data.users[0].name).to.be.not.undefined;
          expect(resp.data.users[0].address).to.be.not.undefined;
          expect(resp.data.users).to.deep.equal(TEST_RESPONSE.data.users);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: `https://firebasedataconnect.googleapis.com/v1alpha/projects/test-project/locations/${connectorConfig.location}/services/${connectorConfig.serviceId}:executeGraphql`,
            headers: EXPECTED_HEADERS,
            data: { query: 'query' }
          });
        });
    });

    it('should use DATA_CONNECT_EMULATOR_HOST if set', () => {
      process.env.DATA_CONNECT_EMULATOR_HOST = 'http://localhost:9000';
      const stub = sandbox
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200));
      return apiClient.executeGraphql('query', {})
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: `http://localhost:9000/v1alpha/projects/test-project/locations/${connectorConfig.location}/services/${connectorConfig.serviceId}:executeGraphql`,
            headers: EXPECTED_HEADERS,
            data: { query: 'query' }
          });
        });
    });
  });
});
