/*!
 * Copyright 2018 Google Inc.
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
import * as chaiAsPromised from 'chai-as-promised';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FirebaseApp } from '../../../src/firebase-app';
import {
  FirebaseRulesRequestHandler,
  ListRulesReleasesResponse,
  RulesReleaseResponse,
  ListRulesetsResponse,
  RulesetWithFilesResponse,
} from '../../../src/project-management/firebase-rules-api-request';
import { HttpClient } from '../../../src/utils/api-request';
import * as mocks from '../../resources/mocks';
import * as utils from '../utils';
import { RulesetFile } from '../../../src/project-management/rules';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('FirebaseRulesRequestHandler', () => {
  const HOST = 'firebaserules.googleapis.com';
  const PORT = 443;
  const BASE_URL = `https://${HOST}:${PORT}/v1`;
  const PROJECT_RESOURCE_NAME = 'projects/test-project-id';
  const RELEASE_NAME = 'cloud.firestore';
  const RULESET_UUID = '00000000-0000-0000-0000-000000000000';
  const RULESET_NAME = `${PROJECT_RESOURCE_NAME}/rulesets/${RULESET_UUID}`;
  const PAGE_TOKEN = 'PAGE_TOKEN';
  const NEXT_PAGE_TOKEN = 'NEXT_PAGE_TOKEN';
  const TIMESTAMP_CREATE = '2012-04-13T02:00:00.000000Z';
  const TIMESTAMP_UPDATE = '2014-10-21T16:00:00.000000Z';
  const RULESET_FILES: RulesetFile[] = [
    {
      name: 'ruleset.file',
      content: 'Ruleset file content',
    },
  ];

  const mockAccessToken: string = utils.generateRandomAccessToken();
  let stubs: sinon.SinonStub[] = [];
  let getTokenStub: sinon.SinonStub;
  let mockApp: FirebaseApp;
  let expectedHeaders: object;
  let requestHandler: FirebaseRulesRequestHandler;

  before(() => {
    getTokenStub = utils.stubGetAccessToken(mockAccessToken);
  });

  after(() => {
    stubs = [];
    getTokenStub.restore();
  });

  beforeEach(() => {
    mockApp = mocks.app();
    expectedHeaders = {
      'X-Client-Version': 'Node/Admin/<XXX_SDK_VERSION_XXX>',
      'Authorization': 'Bearer ' + mockAccessToken,
    };
    requestHandler = new FirebaseRulesRequestHandler(
      mockApp,
      PROJECT_RESOURCE_NAME,
    );
    return mockApp.INTERNAL.getToken();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    return mockApp.delete();
  });

  function testHttpErrors(callback: () => Promise<any>) {
    const errorCodeMap: any = {
      400: 'project-management/invalid-argument',
      401: 'project-management/authentication-error',
      403: 'project-management/authentication-error',
      404: 'project-management/not-found',
      429: 'project-management/resource-exhausted',
      500: 'project-management/internal-error',
      503: 'project-management/service-unavailable',
    };
    Object.keys(errorCodeMap).forEach((errorCode) => {
      if (!Object.prototype.hasOwnProperty.call(errorCodeMap, errorCode)) {
        return;
      }
      it(`should throw for HTTP ${errorCode} errors`, () => {
        const stub = sinon
          .stub(HttpClient.prototype, 'send')
          .rejects(utils.errorFrom({}, parseInt(errorCode, 10)));
        stubs.push(stub);

        return callback().should.eventually.be.rejected.and.have.property(
          'code',
          errorCodeMap[errorCode],
        );
      });
    });

    it('should throw for HTTP unknown errors', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 1337));
      stubs.push(stub);

      return callback().should.eventually.be.rejected.and.have.property(
        'code',
        'project-management/unknown-error',
      );
    });
  }

  describe('Constructor', () => {
    it('should succeed with a FirebaseApp instance and a project resource name', () => {
      expect(() => {
        return new FirebaseRulesRequestHandler(mockApp, PROJECT_RESOURCE_NAME);
      }).not.to.throw(Error);
    });
  });

  describe('listRulesReleases', () => {
    testHttpErrors(() => requestHandler.listRulesReleases());

    it('should succeed without arguments', () => {
      const expectedResult: ListRulesReleasesResponse = {
        releases: [
          {
            name: RELEASE_NAME,
            rulesetName: RULESET_UUID,
            createTime: TIMESTAMP_CREATE,
          },
        ],
        nextPageToken: NEXT_PAGE_TOKEN,
      };

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler.listRulesReleases().then((result) => {
        expect(result).to.deep.equal(expectedResult);
        expect(stub).to.have.been.calledOnce.and.calledWith({
          method: 'GET',
          url: `${BASE_URL}/${PROJECT_RESOURCE_NAME}/releases`,
          data: {
            filter: undefined,
            maxResults: undefined,
            nextPageToken: undefined,
          },
          headers: expectedHeaders,
          timeout: 10000,
        });
      });
    });

    it('should succeed with arguments', () => {
      const filter = 'name=prod*';
      const maxResults = 20;
      const nextPageToken = PAGE_TOKEN;

      const expectedResult: ListRulesReleasesResponse = {
        releases: [
          {
            name: RELEASE_NAME,
            rulesetName: RULESET_UUID,
            createTime: TIMESTAMP_CREATE,
            updateTime: TIMESTAMP_UPDATE,
          },
        ],
        nextPageToken: NEXT_PAGE_TOKEN,
      };

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler
        .listRulesReleases(filter, maxResults, nextPageToken)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: `${BASE_URL}/${PROJECT_RESOURCE_NAME}/releases`,
            data: {
              filter,
              maxResults,
              nextPageToken,
            },
            headers: expectedHeaders,
            timeout: 10000,
          });
        });
    });
  });

  describe('getRulesRelease', () => {
    testHttpErrors(() => requestHandler.getRulesRelease(RELEASE_NAME));

    it('should succeed', () => {
      const expectedResult: RulesReleaseResponse = {
        name: RELEASE_NAME,
        rulesetName: RULESET_NAME,
        createTime: TIMESTAMP_CREATE,
      };

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler.getRulesRelease(RELEASE_NAME).then((result) => {
        expect(result).to.deep.equal(expectedResult);
        expect(stub).to.have.been.calledOnce.and.calledWith({
          method: 'GET',
          url: `${BASE_URL}/${PROJECT_RESOURCE_NAME}/releases/${RELEASE_NAME}`,
          data: null,
          headers: expectedHeaders,
          timeout: 10000,
        });
      });
    });
  });

  describe('createRulesRelease', () => {
    testHttpErrors(() =>
      requestHandler.createRulesRelease(RELEASE_NAME, RULESET_UUID),
    );

    it('should succeed', () => {
      const releaseName = `${PROJECT_RESOURCE_NAME}/releases/${RELEASE_NAME}`;

      const expectedResult: RulesReleaseResponse = {
        name: RELEASE_NAME,
        rulesetName: RULESET_NAME,
        createTime: TIMESTAMP_CREATE,
      };

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler
        .createRulesRelease(RELEASE_NAME, RULESET_UUID)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: `${BASE_URL}/${PROJECT_RESOURCE_NAME}/releases`,
            data: {
              name: releaseName,
              rulesetName: RULESET_NAME,
            },
            headers: expectedHeaders,
            timeout: 10000,
          });
        });
    });
  });

  describe('updateRulesRelease', () => {
    testHttpErrors(() =>
      requestHandler.updateRulesRelease(RELEASE_NAME, RULESET_UUID),
    );

    it('should succeed', () => {
      const releaseName = `${PROJECT_RESOURCE_NAME}/releases/${RELEASE_NAME}`;

      const expectedResult: RulesReleaseResponse = {
        name: RELEASE_NAME,
        rulesetName: RULESET_NAME,
        createTime: TIMESTAMP_CREATE,
        updateTime: TIMESTAMP_UPDATE,
      };

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler
        .updateRulesRelease(RELEASE_NAME, RULESET_UUID)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'PATCH',
            url: `${BASE_URL}/${releaseName}`,
            data: {
              release: {
                name: releaseName,
                rulesetName: RULESET_NAME,
              },
            },
            headers: expectedHeaders,
            timeout: 10000,
          });
        });
    });
  });

  describe('deleteRulesRelease', () => {
    testHttpErrors(() => requestHandler.deleteRulesRelease(RELEASE_NAME));

    it('should succeed', () => {
      const releaseName = `${PROJECT_RESOURCE_NAME}/releases/${RELEASE_NAME}`;
      const expectedResult = {};

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler.deleteRulesRelease(RELEASE_NAME).then((result) => {
        expect(result).to.deep.equal(expectedResult);
        expect(stub).to.have.been.calledOnce.and.calledWith({
          method: 'DELETE',
          url: `${BASE_URL}/${releaseName}`,
          data: null,
          headers: expectedHeaders,
          timeout: 10000,
        });
      });
    });
  });

  describe('listRulesets', () => {
    testHttpErrors(() => requestHandler.listRulesets());

    it('should succeed without arguments', () => {
      const expectedResult: ListRulesetsResponse = {
        rulesets: [
          {
            name: RULESET_NAME,
            createTime: TIMESTAMP_CREATE,
          },
        ],
        nextPageToken: NEXT_PAGE_TOKEN,
      };

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler.listRulesets().then((result) => {
        expect(result).to.deep.equal(expectedResult);
        expect(stub).to.have.been.calledOnce.and.calledWith({
          method: 'GET',
          url: `${BASE_URL}/${PROJECT_RESOURCE_NAME}/rulesets`,
          data: {
            maxResults: undefined,
            nextPageToken: undefined,
          },
          headers: expectedHeaders,
          timeout: 10000,
        });
      });
    });

    it('should succeed with arguments', () => {
      const maxResults = 20;
      const nextPageToken = PAGE_TOKEN;

      const expectedResult: ListRulesetsResponse = {
        rulesets: [
          {
            name: RULESET_NAME,
            createTime: TIMESTAMP_CREATE,
          },
        ],
        nextPageToken: NEXT_PAGE_TOKEN,
      };

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler
        .listRulesets(maxResults, nextPageToken)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: `${BASE_URL}/${PROJECT_RESOURCE_NAME}/rulesets`,
            data: {
              maxResults,
              nextPageToken,
            },
            headers: expectedHeaders,
            timeout: 10000,
          });
        });
    });
  });

  describe('getRuleset', () => {
    testHttpErrors(() => requestHandler.getRuleset(RULESET_UUID));

    it('should succeed', () => {
      const expectedResult: RulesetWithFilesResponse = {
        name: RULESET_NAME,
        createTime: TIMESTAMP_CREATE,
        source: {
          files: RULESET_FILES,
        },
      };

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler.getRuleset(RULESET_UUID).then((result) => {
        expect(result).to.deep.equal(expectedResult);
        expect(stub).to.have.been.calledOnce.and.calledWith({
          method: 'GET',
          url: `${BASE_URL}/${RULESET_NAME}`,
          data: null,
          headers: expectedHeaders,
          timeout: 10000,
        });
      });
    });
  });

  describe('createRuleset', () => {
    testHttpErrors(() => requestHandler.createRuleset(RULESET_FILES));

    it('should succeed', () => {
      const expectedResult: RulesetWithFilesResponse = {
        name: RULESET_NAME,
        createTime: TIMESTAMP_CREATE,
        source: {
          files: RULESET_FILES,
        },
      };

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler.createRuleset(RULESET_FILES).then((result) => {
        expect(result).to.deep.equal(expectedResult);
        expect(stub).to.have.been.calledOnce.and.calledWith({
          method: 'POST',
          url: `${BASE_URL}/${PROJECT_RESOURCE_NAME}/rulesets`,
          data: {
            source: { files: RULESET_FILES },
          },
          headers: expectedHeaders,
          timeout: 10000,
        });
      });
    });
  });

  describe('deleteRuleset', () => {
    testHttpErrors(() => requestHandler.deleteRuleset(RULESET_UUID));

    it('should succeed', () => {
      const expectedResult = {};

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler.deleteRuleset(RULESET_UUID).then((result) => {
        expect(result).to.deep.equal(expectedResult);
        expect(stub).to.have.been.calledOnce.and.calledWith({
          method: 'DELETE',
          url: `${BASE_URL}/${RULESET_NAME}`,
          data: null,
          headers: expectedHeaders,
          timeout: 10000,
        });
      });
    });
  });
});
