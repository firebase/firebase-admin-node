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

import { expect } from 'chai';
import * as sinon from 'sinon';
import {
  AuthorizedHttpClient,
} from '../../../src/utils/api-request';
//import * as utils from '../utils';
import * as mocks from '../../resources/mocks';
import { DataConnectApiClient, FirebaseDataConnectError }
  from '../../../src/data-connect/data-connect-api-client-internal';
import { FirebaseApp } from '../../../src/app/firebase-app';
//import { getSdkVersion } from '../../../src/utils';

describe('DataConnectApiClient', () => {

  // const ERROR_RESPONSE = {
  //   error: {
  //     code: 404,
  //     message: 'Requested entity not found',
  //     status: 'NOT_FOUND',
  //   },
  // };

  // const EXPECTED_HEADERS = {
  //   'Authorization': 'Bearer mock-token',
  //   'X-Firebase-Client': `fire-admin-node/${getSdkVersion()}`,
  //   'x-goog-user-project': 'test-project',
  // };

  // const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
  // + 'account credentials or set project ID as an app option. Alternatively, set the '
  // + 'GOOGLE_CLOUD_PROJECT environment variable.';

  // const clientWithoutProjectId = new DataConnectApiClient(
  //   mocks.mockCredentialApp());

  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
  };

  let app: FirebaseApp;

  //let httpClient: AuthorizedHttpClient;
  let dataConnectApiClient: DataConnectApiClient;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    app = mocks.appWithOptions(mockOptions);
    //httpClient = new AuthorizedHttpClient(app);
    dataConnectApiClient = new DataConnectApiClient(app);
  });

  afterEach(() => {
    sandbox.restore();
    return app.delete();
  });

  describe('constructor', () => {
    it('should throw an error if app is not a valid Firebase app instance', () => {
      expect(() => new DataConnectApiClient(null as unknown as FirebaseApp)).to.throw(
        FirebaseDataConnectError,
        'First argument passed to getDataConnect() must be a valid Firebase app instance.'
      );
    });

    it('should initialize httpClient with the provided app', () => {
      expect((dataConnectApiClient as any).httpClient).to.be.an.instanceOf(AuthorizedHttpClient);
    });
  });

  /*
  describe('executeGraphql', () => {
    let sendStub: sinon.SinonStub;
    let getUrlStub: sinon.SinonStub;
    let getProjectIdStub: sinon.SinonStub;
    let findProjectIdStub: sinon.SinonStub;

    beforeEach(() => {
      sendStub = sandbox.stub(httpClient, 'send').resolves({
        data: {
          data: { someData: 'someValue' },
        },
      });
      getUrlStub = sandbox.stub(dataConnectApiClient as any, 'getUrl').resolves(
        'https://firebasedataconnect.googleapis.com/v1alpha/projects/projectId/locations/us-west2/services/my-service:executeGraphql'
      );
      getProjectIdStub = sandbox
        .stub(dataConnectApiClient as any, 'getProjectId')
        .resolves('projectId');
      findProjectIdStub = sandbox.stub(utils, 'findProjectId').resolves('projectId');
    });

    it('should throw an error if query is not a non-empty string', async () => {
      await expect(dataConnectApiClient.executeGraphql('')).to.be.rejectedWith(
        FirebaseDataConnectError,
        '`query` must be a non-empty string.'
      );
      await expect(dataConnectApiClient.executeGraphql(undefined as any)).to.be.rejectedWith(
        FirebaseDataConnectError,
        '`query` must be a non-empty string.'
      );
    });

    it('should throw an error if GraphqlOptions is not a non-null object', async () => {
      await expect(
        dataConnectApiClient.executeGraphql('query', null as unknown as GraphqlOptions<any>)
      ).to.be.rejectedWith(FirebaseDataConnectError, 'GraphqlOptions must be a non-null object');
    });

    it('should send a POST request with the correct parameters', async () => {
      const query = 'some query';
      const variables = { someVariable: 'someValue' };
      const options: GraphqlOptions<typeof variables> = { variables };

      const expectedRequest: HttpRequestConfig = {
        method: 'POST',
        url:
          'https://firebasedataconnect.googleapis.com/v1alpha/projects/projectId/locations/us-west2/services/my-service:executeGraphql',
        headers: {
          'X-Firebase-Client': `fire-admin-node/${utils.getSdkVersion()}`,
        },
        data: {
          query,
          variables,
        },
      };

      const response = await dataConnectApiClient.executeGraphql<any, typeof variables>(
        query,
        options
      );

      expect(response).to.deep.equal({
        data: { someData: 'someValue' },
      });
      expect(sendStub).to.have.been.calledOnceWith(expectedRequest);
      expect(getUrlStub).to.have.been.calledOnceWith(
        'https://firebasedataconnect.googleapis.com',
        'us-west2',
        'my-service',
        'executeGraphql'
      );
      expect(getProjectIdStub).to.have.been.calledOnce;
      expect(findProjectIdStub).to.have.been.calledOnceWith(app);
    });

    it('should use DATA_CONNECT_EMULATOR_HOST if set', async () => {
      process.env.DATA_CONNECT_EMULATOR_HOST = 'http://localhost:9000';

      await dataConnectApiClient.executeGraphql('query');

      expect(getUrlStub).to.have.been.calledOnceWith(
        'http://localhost:9000',
        'us-west2',
        'my-service',
        'executeGraphql'
      );

      delete process.env.DATA_CONNECT_EMULATOR_HOST;
    });

    it('should handle errors from httpClient.send', async () => {
      const error = new RequestResponseError({
        status: 400,
        text: 'Bad Request',
        data: {
          error: {
            code: 400,
            message: 'Invalid query',
            status: 'INVALID_ARGUMENT',
          },
        },
      });
      sendStub.rejects(error);

      await expect(dataConnectApiClient.executeGraphql('query')).to.be.rejectedWith(
        FirebaseDataConnectError,
        'Invalid query'
      );
    });

    it('should handle errors from getProjectId', async () => {
      const error = new FirebaseDataConnectError('unknown-error', 'Failed to get project ID');
      getProjectIdStub.rejects(error);

      await expect(dataConnectApiClient.executeGraphql('query')).to.be.rejectedWith(error);
    });

    it('should handle non-JSON errors from httpClient.send', async () => {
      const error = new RequestResponseError({
        status: 500,
        text: 'Internal Server Error',
      });
      sendStub.rejects(error);

      await expect(dataConnectApiClient.executeGraphql('query')).to.be.rejectedWith(
        FirebaseDataConnectError,
        'Unexpected response with status: 500 and body: Internal Server Error'
      );
    });

    it('should handle unknown errors from httpClient.send', async () => {
      const error = new RequestResponseError({
        status: 500,
        text: 'Internal Server Error',
        data: {
          error: {
            code: 500,
            message: 'Internal Server Error',
          },
        },
      });
      sendStub.rejects(error);

      await expect(dataConnectApiClient.executeGraphql('query')).to.be.rejectedWith(
        FirebaseDataConnectError,
        'Internal Server Error'
      );
    });
  });
*/
  // ... tests for other methods (getUrl, getProjectId, toFirebaseError)
});
