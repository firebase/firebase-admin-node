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
import { ConnectorConfig } from '../../../src/data-connect';
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

  const connectorConfig: ConnectorConfig = {
    location: 'us-west2',
    serviceId: 'my-service',
  };

  // const clientWithoutProjectId = new DataConnectApiClient(
  //   connectorConfig,
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
    dataConnectApiClient = new DataConnectApiClient(connectorConfig, app);
  });

  afterEach(() => {
    sandbox.restore();
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
      expect((dataConnectApiClient as any).httpClient).to.be.an.instanceOf(AuthorizedHttpClient);
    });
  });
});
