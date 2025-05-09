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
import { DATA_CONNECT_ERROR_CODE_MAPPING, DataConnectApiClient, FirebaseDataConnectError }
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

  const EMULATOR_EXPECTED_HEADERS = {
    'Authorization': 'Bearer owner',
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
      process.env.DATA_CONNECT_EMULATOR_HOST = 'localhost:9399';
      const stub = sandbox
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200));
      return apiClient.executeGraphql('query', {})
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: `http://localhost:9399/v1alpha/projects/test-project/locations/${connectorConfig.location}/services/${connectorConfig.serviceId}:executeGraphql`,
            headers: EMULATOR_EXPECTED_HEADERS,
            data: { query: 'query' }
          });
        });
    });
  });
});

describe('DataConnectApiClient CRUD helpers', () => {
  let mockApp: FirebaseApp;
  let apiClient: DataConnectApiClient;
  let apiClientQueryError: DataConnectApiClient;
  let executeGraphqlStub: sinon.SinonStub;

  const connectorConfig: ConnectorConfig = {
    location: 'us-west1',
    serviceId: 'my-crud-service',
  };

  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project-crud',
  };

  const tableName = 'TestTable';
  const formatedTableName = 'testTable';

  const dataWithUndefined = {
    genre: 'Action',
    title: 'Die Hard',
    ratings: null,
    director: {
      name: undefined,
      age: undefined
    },
    notes: undefined,
    releaseYear: undefined,
    extras: [1, undefined, 'hello', undefined, { a: 1, b: undefined }]
  };

  const tableNames = ['movie', 'Movie', 'MOVIE', 'mOvIE', 'toybox', 'toyBox', 'toyBOX', 'ToyBox', 'TOYBOX'];
  const formatedTableNames = ['movie', 'movie', 'mOVIE', 'mOvIE', 'toybox', 'toyBox', 'toyBOX', 'toyBox', 'tOYBOX'];

  const serverErrorString = 'Server error response';
  const additionalErrorMessageForBulkImport =
    'Make sure that your table name passed in matches the type name in your GraphQL schema file.';

  const expectedQueryError = new FirebaseDataConnectError(
    DATA_CONNECT_ERROR_CODE_MAPPING.QUERY_ERROR,
    serverErrorString
  );

  // Helper function to normalize GraphQL strings
  const normalizeGraphQLString = (str: string): string => {
    return str
      .replace(/\s*\n\s*/g, '\n') // Remove leading/trailing whitespace around newlines
      .replace(/\s+/g, ' ')      // Replace multiple spaces with a single space
      .trim();                    // Remove leading/trailing whitespace from the whole string
  };

  beforeEach(() => {
    mockApp = mocks.appWithOptions(mockOptions);
    apiClient = new DataConnectApiClient(connectorConfig, mockApp);
    apiClientQueryError = new DataConnectApiClient(connectorConfig, mockApp);
    // Stub the instance's executeGraphql method
    executeGraphqlStub = sinon.stub(apiClient, 'executeGraphql').resolves({ data: {} });
    sinon.stub(apiClientQueryError, 'executeGraphql').rejects(expectedQueryError);
  });

  afterEach(() => {
    sinon.restore();
    return mockApp.delete();
  });

  // --- INSERT TESTS ---
  describe('insert()', () => {
    tableNames.forEach((tableName, index) => {
      const expectedMutation = `mutation { ${formatedTableNames[index]}_insert(data: { name: "a" }) }`;
      it(`should use the formatted tableName in the gql query: "${tableName}" as "${formatedTableNames[index]}"`,
        async () => {
          await apiClient.insert(tableName, { name: 'a' });
          await expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
        });
    });

    it('should call executeGraphql with the correct mutation for simple data', async () => {
      const simpleData = { name: 'test', value: 123 };
      const expectedMutation = `
      mutation {
      ${formatedTableName}_insert(data: {
       name: "test",
       value: 123
       })
      }`;
      await apiClient.insert(tableName, simpleData);
      expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
    });

    it('should call executeGraphql with the correct mutation for complex data', async () => {
      const complexData = { id: 'abc', active: true, scores: [10, 20], info: { nested: 'yes/no "quote" \\slash\\' } };
      const expectedMutation = `
      mutation { 
      ${formatedTableName}_insert(data: {
       id: "abc", active: true, scores: [10, 20],
       info: { nested: "yes/no \\"quote\\" \\\\slash\\\\" } 
       }) 
      }`;
      await apiClient.insert(tableName, complexData);
      expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
    });

    it('should call executeGraphql with the correct mutation for undefined and null values', async () => {
      const expectedMutation = `
      mutation {
      ${formatedTableName}_insert(data: {
       genre: "Action",
       title: "Die Hard",
       ratings: null,
       director: {},
       extras: [1, null, "hello", null, { a: 1 }]
       })
      }`;
      await apiClient.insert(tableName, dataWithUndefined);
      expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
    });

    it('should throw FirebaseDataConnectError for invalid tableName', async () => {
      await expect(apiClient.insert('', { data: 1 }))
        .to.be.rejectedWith(FirebaseDataConnectError, /`tableName` must be a non-empty string./);
    });

    it('should throw FirebaseDataConnectError for null data', async () => {
      await expect(apiClient.insert(tableName, null as any))
        .to.be.rejectedWith(FirebaseDataConnectError, /`data` must be a non-null object./);
    });

    it('should throw FirebaseDataConnectError for array data', async() => {
      await expect(apiClient.insert(tableName, []))
        .to.be.rejectedWith(FirebaseDataConnectError, /`data` must be an object, not an array, for single insert./);
    });
    
    it('should amend the message for query errors', async () => {
      await expect(apiClientQueryError.insert(tableName, { data: 1 }))
        .to.be.rejectedWith(FirebaseDataConnectError, `${serverErrorString}. ${additionalErrorMessageForBulkImport}`);
    });
  });

  // --- INSERT MANY TESTS ---
  describe('insertMany()', () => {
    tableNames.forEach((tableName, index) => {
      const expectedMutation = `mutation { ${formatedTableNames[index]}_insertMany(data: [{ name: "a" }]) }`;
      it(`should use the formatted tableName in the gql query: "${tableName}" as "${formatedTableNames[index]}"`,
        async () => {
          await apiClient.insertMany(tableName, [{ name: 'a' }]);
          await expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
        });
    });

    it('should call executeGraphql with the correct mutation for simple data array', async () => {
      const simpleDataArray = [{ name: 'test1' }, { name: 'test2', value: 456 }];
      const expectedMutation = `
      mutation { 
      ${formatedTableName}_insertMany(data: [{ name: "test1" }, { name: "test2", value: 456 }]) }`;
      await apiClient.insertMany(tableName, simpleDataArray);
      expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
    });

    it('should call executeGraphql with the correct mutation for complex data array', async () => {
      const complexDataArray = [
        { id: 'a', active: true, info: { nested: 'n1 "quote"' } },
        { id: 'b', scores: [1, 2], info: { nested: 'n2/\\' } }
      ];
      const expectedMutation = `
      mutation { 
      ${formatedTableName}_insertMany(data: 
      [{ id: "a", active: true, info: { nested: "n1 \\"quote\\"" } }, { id: "b", scores: [1, 2], 
       info: { nested: "n2/\\\\" } }]) }`;
      await apiClient.insertMany(tableName, complexDataArray);
      expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
    });

    it('should call executeGraphql with the correct mutation for undefined and null', async () => {
      const dataArray = [
        dataWithUndefined,
        dataWithUndefined
      ]
      const expectedMutation = `
      mutation {
      ${formatedTableName}_insertMany(data: [{
       genre: "Action",
       title: "Die Hard",
       ratings: null,
       director: {},
       extras: [1, null, "hello", null, { a: 1 }]
      },
      {
       genre: "Action",
       title: "Die Hard",
       ratings: null,
       director: {},
       extras: [1, null, "hello", null, { a: 1 }]
      }])
      }`;
      await apiClient.insertMany(tableName, dataArray);
      expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
    });

    it('should throw FirebaseDataConnectError for invalid tableName', async () => {
      await expect(apiClient.insertMany('', [{ data: 1 }]))
        .to.be.rejectedWith(FirebaseDataConnectError, /`tableName` must be a non-empty string./);
    });

    it('should throw FirebaseDataConnectError for null data', () => {
      expect(apiClient.insertMany(tableName, null as any))
        .to.be.rejectedWith(FirebaseDataConnectError, /`data` must be a non-empty array for insertMany./);
    });

    it('should throw FirebaseDataConnectError for empty array data', () => {
      expect(apiClient.insertMany(tableName, []))
        .to.be.rejectedWith(FirebaseDataConnectError, /`data` must be a non-empty array for insertMany./);
    });

    it('should throw FirebaseDataConnectError for non-array data', () => {
      expect(apiClient.insertMany(tableName, { data: 1 } as any))
        .to.be.rejectedWith(FirebaseDataConnectError, /`data` must be a non-empty array for insertMany./);
    });

    it('should amend the message for query errors', async () => {
      await expect(apiClientQueryError.insertMany(tableName, [{ data: 1 }]))
        .to.be.rejectedWith(FirebaseDataConnectError, `${serverErrorString}. ${additionalErrorMessageForBulkImport}`);
    });
  });

  // --- UPSERT TESTS ---
  describe('upsert()', () => {
    tableNames.forEach((tableName, index) => {
      const expectedMutation = `mutation { ${formatedTableNames[index]}_upsert(data: { name: "a" }) }`;
      it(`should use the formatted tableName in the gql query: "${tableName}" as "${formatedTableNames[index]}"`,
        async () => {
          await apiClient.upsert(tableName, { name: 'a' });
          await expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
        });
    });

    it('should call executeGraphql with the correct mutation for simple data', async () => {
      const simpleData = { id: 'key1', value: 'updated' };
      const expectedMutation = `mutation { ${formatedTableName}_upsert(data: { id: "key1", value: "updated" }) }`;
      await apiClient.upsert(tableName, simpleData);
      expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(expectedMutation);
    });

    it('should call executeGraphql with the correct mutation for complex data', async () => {
      const complexData = { id: 'key2', active: false, items: [1, null], detail: { status: 'done/\\' } };
      const expectedMutation = `
      mutation { ${formatedTableName}_upsert(data: 
      { id: "key2", active: false, items: [1, null], detail: { status: "done/\\\\" } }) }`;
      await apiClient.upsert(tableName, complexData);
      expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
    });

    it('should call executeGraphql with the correct mutation for undefined and null values', async () => {
      const expectedMutation = `
      mutation {
      ${formatedTableName}_upsert(data: {
       genre: "Action",
       title: "Die Hard",
       ratings: null,
       director: {},
       extras: [1, null, "hello", null, { a: 1 }]
       })
      }`;
      await apiClient.upsert(tableName, dataWithUndefined);
      expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
    });

    it('should throw FirebaseDataConnectError for invalid tableName', async () => {
      await expect(apiClient.upsert('', { data: 1 }))
        .to.be.rejectedWith(FirebaseDataConnectError, /`tableName` must be a non-empty string./);
    });

    it('should throw FirebaseDataConnectError for null data', async () => {
      await expect(apiClient.upsert(tableName, null as any))
        .to.be.rejectedWith(FirebaseDataConnectError, /`data` must be a non-null object./);
    });

    it('should throw FirebaseDataConnectError for array data', async () => {
      await expect(apiClient.upsert(tableName, [{ data: 1 }]))
        .to.be.rejectedWith(FirebaseDataConnectError, /`data` must be an object, not an array, for single upsert./);
    });

    it('should amend the message for query errors', async () => {
      await expect(apiClientQueryError.upsert(tableName, { data: 1 }))
        .to.be.rejectedWith(FirebaseDataConnectError, `${serverErrorString}. ${additionalErrorMessageForBulkImport}`);
    });
  });

  // --- UPSERT MANY TESTS ---
  describe('upsertMany()', () => {
    tableNames.forEach((tableName, index) => {
      const expectedMutation = `mutation { ${formatedTableNames[index]}_upsertMany(data: [{ name: "a" }]) }`;
      it(`should use the formatted tableName in the gql query: "${tableName}" as "${formatedTableNames[index]}"`,
        async () => {
          await apiClient.upsertMany(tableName, [{ name: 'a' }]);
          await expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
        });
    });

    it('should call executeGraphql with the correct mutation for simple data array', async () => {
      const simpleDataArray = [{ id: 'k1' }, { id: 'k2', value: 99 }];
      const expectedMutation = `
      mutation { ${formatedTableName}_upsertMany(data: [{ id: "k1" }, { id: "k2", value: 99 }]) }`;
      await apiClient.upsertMany(tableName, simpleDataArray);
      expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
    });

    it('should call executeGraphql with the correct mutation for complex data array', async () => {
      const complexDataArray = [
        { id: 'x', active: true, info: { nested: 'n1/\\"x' } },
        { id: 'y', scores: [null, 2] }
      ];
      const expectedMutation = `
      mutation { ${formatedTableName}_upsertMany(data: 
      [{ id: "x", active: true, info: { nested: "n1/\\\\\\"x" } }, { id: "y", scores: [null, 2] }]) }`;
      await apiClient.upsertMany(tableName, complexDataArray);
      expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
    });

    it('should call executeGraphql with the correct mutation for undefined and null', async () => {
      const dataArray = [
        dataWithUndefined,
        dataWithUndefined
      ]
      const expectedMutation = `
      mutation {
      ${formatedTableName}_upsertMany(data: [{
       genre: "Action",
       title: "Die Hard",
       ratings: null,
       director: {},
       extras: [1, null, "hello", null, { a: 1 }]
      },
      {
       genre: "Action",
       title: "Die Hard",
       ratings: null,
       director: {},
       extras: [1, null, "hello", null, { a: 1 }]
      }])
      }`;
      await apiClient.upsertMany(tableName, dataArray);
      expect(executeGraphqlStub).to.have.been.calledOnceWithExactly(normalizeGraphQLString(expectedMutation));
    });

    it('should throw FirebaseDataConnectError for invalid tableName', async () => {
      expect(apiClient.upsertMany('', [{ data: 1 }]))
        .to.be.rejectedWith(FirebaseDataConnectError, /`tableName` must be a non-empty string./);
    });

    it('should throw FirebaseDataConnectError for null data', async () => {
      expect(apiClient.upsertMany(tableName, null as any))
        .to.be.rejectedWith(FirebaseDataConnectError, /`data` must be a non-empty array for upsertMany./);
    });

    it('should throw FirebaseDataConnectError for empty array data', async () => {
      expect(apiClient.upsertMany(tableName, []))
        .to.be.rejectedWith(FirebaseDataConnectError, /`data` must be a non-empty array for upsertMany./);
    });

    it('should throw FirebaseDataConnectError for non-array data', async () => {
      await expect(apiClient.upsertMany(tableName, { data: 1 } as any))
        .to.be.rejectedWith(FirebaseDataConnectError, /`data` must be a non-empty array for upsertMany./);
    });

    it('should amend the message for query errors', async () => {
      await expect(apiClientQueryError.upsertMany(tableName, [{ data: 1 }]))
        .to.be.rejectedWith(FirebaseDataConnectError, `${serverErrorString}. ${additionalErrorMessageForBulkImport}`);
    });
  });
});
