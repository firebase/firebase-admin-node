/*!
 * Copyright 2017 Google Inc.
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

// Use untyped import syntax for Node built-ins.
import https = require('https');
import stream = require('stream');

import * as _ from 'lodash';
import {expect} from 'chai';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';

import {FirebaseApp} from '../../../src/firebase-app';
import {
  Messaging, MessagingOptions, MessagingPayload, MessagingDevicesResponse, MessagingTopicManagementResponse,
  BLACKLISTED_OPTIONS_KEYS, BLACKLISTED_DATA_PAYLOAD_KEYS,
} from '../../../src/messaging/messaging';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);


// FCM endpoints
const FCM_SEND_HOST = 'fcm.googleapis.com';
const FCM_SEND_PATH = '/fcm/send';
const FCM_TOPIC_MANAGEMENT_HOST = 'iid.googleapis.com';
const FCM_TOPIC_MANAGEMENT_ADD_PATH = '/iid/v1:batchAdd';
const FCM_TOPIC_MANAGEMENT_REMOVE_PATH = '/iid/v1:batchRemove';

const mockServerErrorResponse = {
  json: {
    error: 'NotRegistered',
  },
  text: 'Some text error',
};

const expectedErrorCodes = {
  json: 'messaging/registration-token-not-registered',
  text: 'messaging/unknown-error',
  unknownError: 'messaging/unknown-error',
};

const STATUS_CODE_TO_ERROR_MAP = {
  200: 'messaging/unknown-error',
  400: 'messaging/invalid-argument',
  401: 'messaging/authentication-error',
  403: 'messaging/authentication-error',
  404: 'messaging/unknown-error',
  500: 'messaging/internal-error',
  503: 'messaging/server-unavailable',
};

function mockSendToDeviceStringRequest(mockFailure = false): nock.Scope {
  let deviceResult: Object = { message_id: `0:${ mocks.messaging.messageId }` };
  if (mockFailure) {
    deviceResult = { error: 'InvalidRegistration' };
  }

  return nock(`https://${FCM_SEND_HOST}:443`)
    .post(FCM_SEND_PATH)
    .reply(200, {
      multicast_id: mocks.messaging.multicastId,
      success: mockFailure ? 0 : 1,
      failure: mockFailure ? 1 : 0,
      canonical_ids: 0,
      results: [ deviceResult ],
    });
}

function mockSendToDeviceArrayRequest(): nock.Scope {
  return nock(`https://${FCM_SEND_HOST}:443`)
    .post(FCM_SEND_PATH)
    .reply(200, {
      multicast_id: mocks.messaging.multicastId,
      success: 1,
      failure: 2,
      canonical_ids: 1,
      results: [
        {
          message_id: `0:${ mocks.messaging.messageId }`,
          registration_id: mocks.messaging.registrationToken + '3',
        },
        { error: 'some-error' },
        { error: mockServerErrorResponse.json.error },
      ],
    });
}

function mockSendToDeviceGroupRequest(numFailedRegistrationTokens = 0): nock.Scope {
  const response: any = {
    success: 5 - numFailedRegistrationTokens,
    failure: numFailedRegistrationTokens,
  };

  if (numFailedRegistrationTokens > 0) {
    response.failed_registration_ids = [];
    for (let i = 0; i < numFailedRegistrationTokens; i++) {
      response.failed_registration_ids.push(mocks.messaging.registrationToken + i);
    }
  }

  return nock(`https://${FCM_SEND_HOST}:443`)
    .post(FCM_SEND_PATH)
    .reply(200, response);
}

function mockSendToTopicRequest(): nock.Scope {
  return nock(`https://${FCM_SEND_HOST}:443`)
    .post(FCM_SEND_PATH)
    .reply(200, {
      message_id: mocks.messaging.messageId,
    });
}

function mockSendToConditionRequest(): nock.Scope {
  return nock(`https://${FCM_SEND_HOST}:443`)
    .post(FCM_SEND_PATH)
    .reply(200, {
      message_id: mocks.messaging.messageId,
    });
}

function mockTopicSubscriptionRequest(
  methodName: string,
  successCount = 1,
  failureCount = 0,
): nock.Scope {
  const mockedResults = [];

  for (let i = 0; i < successCount; i++) {
    mockedResults.push({});
  }

  for (let i = 0; i < failureCount; i++) {
    mockedResults.push({ error: 'TOO_MANY_TOPICS' });
  }

  const path = (methodName === 'subscribeToTopic') ? FCM_TOPIC_MANAGEMENT_ADD_PATH : FCM_TOPIC_MANAGEMENT_REMOVE_PATH;

  return nock(`https://${FCM_TOPIC_MANAGEMENT_HOST}:443`)
    .post(path)
    .reply(200, {
      results: mockedResults,
    });
}

function mockSendRequestWithError(
  statusCode: number,
  errorFormat: 'json'|'text',
  responseOverride?: any,
): nock.Scope {
  let response;
  let contentType;
  if (errorFormat === 'json') {
    response = mockServerErrorResponse.json;
    contentType = 'application/json; charset=UTF-8';
  } else {
    response = mockServerErrorResponse.text;
    contentType = 'text/html; charset=UTF-8';
  }

  return nock(`https://${FCM_SEND_HOST}:443`)
    .post(FCM_SEND_PATH)
    .reply(statusCode, responseOverride || response, {
      'Content-Type': contentType,
    });
}

function mockTopicSubscriptionRequestWithError(
  methodName: string,
  statusCode: number,
  errorFormat: 'json'|'text',
  responseOverride?: any,
): nock.Scope {
  let response;
  let contentType;
  if (errorFormat === 'json') {
    response = mockServerErrorResponse.json;
    contentType = 'application/json; charset=UTF-8';
  } else {
    response = mockServerErrorResponse.text;
    contentType = 'text/html; charset=UTF-8';
  }

  const path = (methodName === 'subscribeToTopic') ? FCM_TOPIC_MANAGEMENT_ADD_PATH : FCM_TOPIC_MANAGEMENT_REMOVE_PATH;

  return nock(`https://${FCM_TOPIC_MANAGEMENT_HOST}:443`)
    .post(path)
    .reply(statusCode, responseOverride || response, {
      'Content-Type': contentType,
    });
}


describe('Messaging', () => {
  let mockApp: FirebaseApp;
  let messaging: Messaging;
  let mockResponse: stream.PassThrough;
  let mockedRequests: nock.Scope[] = [];
  let requestWriteSpy: sinon.SinonSpy;
  let httpsRequestStub: sinon.SinonStub;
  let mockRequestStream: mocks.MockStream;
  let nullAccessTokenMessaging: Messaging;
  let malformedAccessTokenMessaging: Messaging;
  let rejectedPromiseAccessTokenMessaging: Messaging;

  before(() => utils.mockFetchAccessTokenRequests());

  after(() => nock.cleanAll());

  beforeEach(() => {
    mockApp = mocks.app();
    messaging = new Messaging(mockApp);

    mockResponse = new stream.PassThrough();
    mockResponse.write(JSON.stringify({ mockResponse: true }));
    mockResponse.end();

    mockRequestStream = new mocks.MockStream();

    requestWriteSpy = sinon.spy(mockRequestStream, 'write');

    nullAccessTokenMessaging = new Messaging(mocks.appReturningNullAccessToken());
    malformedAccessTokenMessaging = new Messaging(mocks.appReturningMalformedAccessToken());
    rejectedPromiseAccessTokenMessaging = new Messaging(mocks.appRejectedWhileFetchingAccessToken());
  });

  afterEach(() => {
    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    mockedRequests = [];

    requestWriteSpy.restore();

    if (httpsRequestStub && httpsRequestStub.restore) {
      httpsRequestStub.restore();
    }
  });


  describe('Constructor', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it(`should throw given invalid app: ${ JSON.stringify(invalidApp) }`, () => {
        expect(() => {
          const messagingAny: any = Messaging;
          return new messagingAny(invalidApp);
        }).to.throw('First argument passed to admin.messaging() must be a valid Firebase app instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const messagingAny: any = Messaging;
        return new messagingAny();
      }).to.throw('First argument passed to admin.messaging() must be a valid Firebase app instance.');
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new Messaging(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(messaging.app).to.equal(mockApp);
    });

    it('is read-only', () => {
      expect(() => {
        (messaging as any).app = mockApp;
      }).to.throw('Cannot set property app of #<Messaging> which has only a getter');
    });
  });

  describe('sendToDevice()', () => {
    const invalidArgumentError = 'Registration token(s) provided to sendToDevice() must be a ' +
      'non-empty string or a non-empty array';

    const invalidRegistrationTokens = [null, NaN, 0, 1, true, false, {}, { a: 1 }, _.noop];
    invalidRegistrationTokens.forEach((invalidRegistrationToken) => {
      it('should throw given invalid type for registration token(s) argument: ' +
        JSON.stringify(invalidRegistrationToken), () => {
        expect(() => {
          messaging.sendToDevice(invalidRegistrationToken as string, mocks.messaging.payloadDataOnly);
        }).to.throw(invalidArgumentError);
      });
    });

    it('should throw given no registration token(s) argument', () => {
      expect(() => {
        messaging.sendToDevice(undefined as string, mocks.messaging.payloadDataOnly);
      }).to.throw(invalidArgumentError);
    });

    it('should throw given empty string for registration token(s) argument', () => {
      expect(() => {
        messaging.sendToDevice('', mocks.messaging.payloadDataOnly);
      }).to.throw(invalidArgumentError);
    });

    it('should throw given empty array for registration token(s) argument', () => {
      expect(() => {
        messaging.sendToDevice([], mocks.messaging.payloadDataOnly);
      }).to.throw(invalidArgumentError);
    });

    it('should be rejected given empty string within array for registration token(s) argument', () => {
      return messaging.sendToDevice(['foo', 'bar', ''], mocks.messaging.payloadDataOnly)
        .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-recipient');
    });

    it('should be rejected given non-string value within array for registration token(s) argument', () => {
      return messaging.sendToDevice(['foo', true as any, 'bar'], mocks.messaging.payloadDataOnly)
        .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-recipient');
    });

    it('should be rejected given an array containing more than 1,000 registration tokens', () => {
      mockedRequests.push(mockSendToDeviceArrayRequest());

      // Create an array of exactly 1,000 registration tokens
      const registrationTokens = (Array(1000) as any).fill(mocks.messaging.registrationToken);

      return messaging.sendToDevice(registrationTokens, mocks.messaging.payload)
        .then(() => {
          // Push the array of registration tokens over 1,000 items
          registrationTokens.push(mocks.messaging.registrationToken);

          return messaging.sendToDevice(registrationTokens, mocks.messaging.payload)
            .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-recipient');
        });
    });

    it('should be rejected given a 200 JSON server response with a known error', () => {
      mockedRequests.push(mockSendRequestWithError(200, 'json'));

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.json);
    });

    it('should be rejected given a 200 JSON server response with an unknown error', () => {
      mockedRequests.push(mockSendRequestWithError(200, 'json', { error: 'Unknown' }));

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    it('should be rejected given a non-2xx JSON server response', () => {
      mockedRequests.push(mockSendRequestWithError(400, 'json'));

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.json);
    });

    it('should be rejected given a non-2xx JSON server response with an unknown error', () => {
      mockedRequests.push(mockSendRequestWithError(400, 'json', { error: 'Unknown' }));

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    it('should be rejected given a non-2xx JSON server response without an error', () => {
      mockedRequests.push(mockSendRequestWithError(400, 'json', { foo: 'bar' }));

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    _.forEach(STATUS_CODE_TO_ERROR_MAP, (expectedError, statusCode) => {
      it(`should be rejected given a ${ statusCode } text server response`, () => {
        mockedRequests.push(mockSendRequestWithError(parseInt(statusCode, 10), 'text'));

        return messaging.sendToDevice(
          mocks.messaging.registrationToken,
          mocks.messaging.payload,
        ).should.eventually.be.rejected.and.have.property('code', expectedError);
      });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenMessaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return nullAccessTokenMessaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return nullAccessTokenMessaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be fulfilled given a valid registration token and payload', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      );
    });

    it('should be fulfilled given a valid registration token, payload, and options', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
        mocks.messaging.options,
      );
    });

    it('should be fulfilled given a valid array of registration tokens and payload', () => {
      mockedRequests.push(mockSendToDeviceArrayRequest());

      return messaging.sendToDevice(
        [
          mocks.messaging.registrationToken + '0',
          mocks.messaging.registrationToken + '1',
          mocks.messaging.registrationToken + '2',
        ],
        mocks.messaging.payload,
      );
    });

    it('should be fulfilled given a valid array of registration tokens, payload, and options', () => {
      mockedRequests.push(mockSendToDeviceArrayRequest());

      return messaging.sendToDevice(
        [
          mocks.messaging.registrationToken + '0',
          mocks.messaging.registrationToken + '1',
          mocks.messaging.registrationToken + '2',
        ],
        mocks.messaging.payload,
        mocks.messaging.options,
      );
    });

    it('should be fulfilled with the server response given a single registration token', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      ).should.eventually.deep.equal({
        failureCount: 0,
        successCount: 1,
        canonicalRegistrationTokenCount: 0,
        multicastId: mocks.messaging.multicastId,
        results: [
          { messageId: `0:${ mocks.messaging.messageId }` },
        ],
      });
    });

    it('should be fulfilled with the server response given an array of registration tokens', () => {
      mockedRequests.push(mockSendToDeviceArrayRequest());

      return messaging.sendToDevice(
        [
          mocks.messaging.registrationToken + '0',
          mocks.messaging.registrationToken + '1',
          mocks.messaging.registrationToken + '2',
        ],
        mocks.messaging.payload,
      ).then((response: MessagingDevicesResponse) => {
        expect(response).to.have.keys([
          'failureCount', 'successCount', 'canonicalRegistrationTokenCount', 'multicastId', 'results',
        ]);
        expect(response.failureCount).to.equal(2);
        expect(response.successCount).to.equal(1);
        expect(response.canonicalRegistrationTokenCount).to.equal(1);
        expect(response.multicastId).to.equal(mocks.messaging.multicastId);
        expect(response.results).to.have.length(3);
        expect(response.results[0]).to.deep.equal({
          messageId: `0:${ mocks.messaging.messageId }`,
          canonicalRegistrationToken: mocks.messaging.registrationToken + '3',
        });
        expect(response.results[1]).to.have.keys(['error']);
        expect(response.results[1].error).to.have.property('code', expectedErrorCodes.unknownError);
        expect(response.results[2]).to.have.keys(['error']);
        expect(response.results[2].error).to.have.property('code', expectedErrorCodes.json);
      });
    });

    it('should set the appropriate request data given a single registration token', () => {
      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging.sendToDevice(
            mocks.messaging.registrationToken,
            mocks.messaging.payload,
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.deep.equal({
            to: mocks.messaging.registrationToken,
            data: mocks.messaging.payload.data,
            notification: mocks.messaging.payload.notification,
          });
        });
    });

    it('should set the appropriate request data given an array of registration tokens', () => {
      const registrationTokens = [
        mocks.messaging.registrationToken + '0',
        mocks.messaging.registrationToken + '1',
        mocks.messaging.registrationToken + '2',
      ];

      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging.sendToDevice(
            registrationTokens,
            mocks.messaging.payload,
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.deep.equal({
            registration_ids: registrationTokens,
            data: mocks.messaging.payload.data,
            notification: mocks.messaging.payload.notification,
          });
        });
    });

    it('should be fulfilled given a notification key which actually causes a device group response', () => {
      mockedRequests.push(mockSendToDeviceGroupRequest(/* numFailedRegistrationTokens */ 2));

      return messaging.sendToDevice(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
      ).should.eventually.deep.equal({
        failureCount: 2,
        successCount: 3,
        failedRegistrationTokens: [
          mocks.messaging.registrationToken + '0',
          mocks.messaging.registrationToken + '1',
        ],
      });
    });

    it('should not mutate the payload argument', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      let mockPayloadClone: MessagingPayload = _.clone(mocks.messaging.payload);

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mockPayloadClone,
      ).then(() => {
        expect(mockPayloadClone).to.deep.equal(mocks.messaging.payload);
      });
    });

    it('should not mutate the options argument', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      let mockOptionsClone: MessagingOptions = _.clone(mocks.messaging.options);

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
        mockOptionsClone,
      ).then(() => {
        expect(mockOptionsClone).to.deep.equal(mocks.messaging.options);
      });
    });
  });

  describe('sendToDeviceGroup()', () => {
    const invalidArgumentError = 'Notification key provided to sendToDeviceGroup() must be a ' +
      'non-empty string.';

    const invalidNotificationKeys = [null, NaN, 0, 1, true, false, [], ['a', 1], {}, { a: 1 }, _.noop];
    invalidNotificationKeys.forEach((invalidNotificationKey) => {
      it('should throw given invalid type for notification key argument: ' +
        JSON.stringify(invalidNotificationKey), () => {
        expect(() => {
          messaging.sendToDeviceGroup(invalidNotificationKey as string, mocks.messaging.payloadDataOnly);
        }).to.throw(invalidArgumentError);
      });
    });

    it('should throw given no notification key argument', () => {
      expect(() => {
        messaging.sendToDeviceGroup(undefined as string, mocks.messaging.payloadDataOnly);
      }).to.throw(invalidArgumentError);
    });

    it('should throw given empty string for notification key argument', () => {
      expect(() => {
        messaging.sendToDeviceGroup('', mocks.messaging.payloadDataOnly);
      }).to.throw(invalidArgumentError);
    });

    it('should throw given a registration token which has a colon', () => {
      return messaging.sendToDeviceGroup('tok:en', mocks.messaging.payloadDataOnly)
        .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-recipient');
    });

    it('should be rejected given a 200 JSON server response with a known error', () => {
      mockedRequests.push(mockSendRequestWithError(200, 'json'));

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.json);
    });

    it('should be rejected given a 200 JSON server response with an unknown error', () => {
      mockedRequests.push(mockSendRequestWithError(200, 'json', { error: 'Unknown' }));

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    it('should be rejected given a non-2xx JSON server response', () => {
      mockedRequests.push(mockSendRequestWithError(400, 'json'));

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.json);
    });

    it('should be rejected given a non-2xx JSON server response with an unknown error', () => {
      mockedRequests.push(mockSendRequestWithError(400, 'json', { error: 'Unknown' }));

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    it('should be rejected given a non-2xx JSON server response without an error', () => {
      mockedRequests.push(mockSendRequestWithError(400, 'json', { foo: 'bar' }));

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    _.forEach(STATUS_CODE_TO_ERROR_MAP, (expectedError, statusCode) => {
      it(`should be rejected given a ${ statusCode } text server response`, () => {
        mockedRequests.push(mockSendRequestWithError(parseInt(statusCode, 10), 'text'));

        return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
          mocks.messaging.payload,
        ).should.eventually.be.rejected.and.have.property('code', expectedError);
      });
    });

    it('should be rejected given a devices response which has a success count of 0', () => {
      mockedRequests.push(mockSendToDeviceStringRequest(/* mockFailure */ true));

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-recipient');
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenMessaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return nullAccessTokenMessaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return nullAccessTokenMessaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be fulfilled given a valid notification key and payload', () => {
      mockedRequests.push(mockSendToDeviceGroupRequest());

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payloadDataOnly
      );
    });

    it('should be fulfilled given a valid notification key, payload, and options', () => {
      mockedRequests.push(mockSendToDeviceGroupRequest());

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payloadDataOnly,
        mocks.messaging.options,
      );
    });

    it('should be fulfilled with the server response (no failed registration tokens)', () => {
      mockedRequests.push(mockSendToDeviceGroupRequest());

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payloadDataOnly,
      ).should.eventually.deep.equal({
        failureCount: 0,
        successCount: 5,
        failedRegistrationTokens: [],
      });
    });

    it('should be fulfilled with the server response (some failed registration token)', () => {
      mockedRequests.push(mockSendToDeviceGroupRequest(/* numFailedRegistrationTokens */ 2));

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payloadDataOnly,
      ).should.eventually.deep.equal({
        failureCount: 2,
        successCount: 3,
        failedRegistrationTokens: [
          mocks.messaging.registrationToken + '0',
          mocks.messaging.registrationToken + '1',
        ],
      });
    });

    it('should be fulfilled with the server response (all failed registration token)', () => {
      mockedRequests.push(mockSendToDeviceGroupRequest(/* numFailedRegistrationTokens */ 5));

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payloadDataOnly,
      ).should.eventually.deep.equal({
        failureCount: 5,
        successCount: 0,
        failedRegistrationTokens: [
          mocks.messaging.registrationToken + '0',
          mocks.messaging.registrationToken + '1',
          mocks.messaging.registrationToken + '2',
          mocks.messaging.registrationToken + '3',
          mocks.messaging.registrationToken + '4',
        ],
      });
    });

    it('should set the appropriate request data', () => {
      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging.sendToDeviceGroup(
            mocks.messaging.notificationKey,
            mocks.messaging.payload,
          );
        }).then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.deep.equal({
            to: mocks.messaging.notificationKey,
            data: mocks.messaging.payload.data,
            notification: mocks.messaging.payload.notification,
          });
        });
    });

    it('should be fulfilled given a registration token which actually causes a devices response', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      return messaging.sendToDeviceGroup(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      ).should.eventually.deep.equal({
        failureCount: 0,
        successCount: 1,
        canonicalRegistrationTokenCount: 0,
        multicastId: mocks.messaging.multicastId,
        results: [
          { messageId: `0:${ mocks.messaging.messageId }` },
        ],
      });
    });

    it('should not mutate the payload argument', () => {
      mockedRequests.push(mockSendToDeviceGroupRequest());

      let mockPayloadClone: MessagingPayload = _.clone(mocks.messaging.payload);

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mockPayloadClone,
      ).then(() => {
        expect(mockPayloadClone).to.deep.equal(mocks.messaging.payload);
      });
    });

    it('should not mutate the options argument', () => {
      mockedRequests.push(mockSendToDeviceGroupRequest());

      let mockOptionsClone: MessagingOptions = _.clone(mocks.messaging.options);

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
        mockOptionsClone,
      ).then(() => {
        expect(mockOptionsClone).to.deep.equal(mocks.messaging.options);
      });
    });
  });

  describe('sendToTopic()', () => {
    const invalidArgumentError = 'Topic provided to sendToTopic() must be a string which matches';

    const invalidTopics = [null, NaN, 0, 1, true, false, [], ['a', 1], {}, { a: 1 }, _.noop];
    invalidTopics.forEach((invalidTopic) => {
      it(`should throw given invalid type for topic argument: ${ JSON.stringify(invalidTopic) }`, () => {
        expect(() => {
          messaging.sendToTopic(invalidTopic as string, mocks.messaging.payload);
        }).to.throw(invalidArgumentError);
      });
    });

    it('should throw given no topic argument', () => {
      expect(() => {
        messaging.sendToTopic(undefined as string, mocks.messaging.payload);
      }).to.throw(invalidArgumentError);
    });

    it('should throw given empty string for topic argument', () => {
      expect(() => {
        messaging.sendToTopic('', mocks.messaging.payload);
      }).to.throw(invalidArgumentError);
    });

    const topicsWithInvalidCharacters = ['f*o*o', '/topics/f+o+o', 'foo/topics/foo', '$foo', '/topics/foo&'];
    topicsWithInvalidCharacters.forEach((invalidTopic) => {
      it(`should be rejected given topic argument which has invalid characters: ${ invalidTopic }`, () => {
        return messaging.sendToTopic(invalidTopic, mocks.messaging.payload)
          .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-recipient');
      });
    });

    it('should be rejected given a 200 JSON server response with a known error', () => {
      mockedRequests.push(mockSendRequestWithError(200, 'json'));

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.json);
    });

    it('should be rejected given a 200 JSON server response with an unknown error', () => {
      mockedRequests.push(mockSendRequestWithError(200, 'json', { error: 'Unknown' }));

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    it('should be rejected given a non-2xx JSON server response', () => {
      mockedRequests.push(mockSendRequestWithError(400, 'json'));

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.json);
    });

    it('should be rejected given a non-2xx JSON server response with an unknown error', () => {
      mockedRequests.push(mockSendRequestWithError(400, 'json', { error: 'Unknown' }));

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    it('should be rejected given a non-2xx JSON server response without an error', () => {
      mockedRequests.push(mockSendRequestWithError(400, 'json', { foo: 'bar' }));

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    _.forEach(STATUS_CODE_TO_ERROR_MAP, (expectedError, statusCode) => {
      it(`should be rejected given a ${ statusCode } text server response`, () => {
        mockedRequests.push(mockSendRequestWithError(parseInt(statusCode, 10), 'text'));

        return messaging.sendToTopic(
        mocks.messaging.topic,
          mocks.messaging.payload,
        ).should.eventually.be.rejected.and.have.property('code', expectedError);
      });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenMessaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return nullAccessTokenMessaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return nullAccessTokenMessaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be fulfilled given a valid topic and payload (topic name not prefixed with "/topics/")', () => {
      mockedRequests.push(mockSendToTopicRequest());

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload
      );
    });

    it('should be fulfilled given a valid topic and payload (topic name prefixed with "/topics/")', () => {
      mockedRequests.push(mockSendToTopicRequest());

      return messaging.sendToTopic(
        mocks.messaging.topicWithPrefix,
        mocks.messaging.payload
      );
    });

    it('should be fulfilled given a valid topic and payload (topic name prefixed with "/topics/private/")', () => {
      mockedRequests.push(mockSendToTopicRequest());

      return messaging.sendToTopic(
        mocks.messaging.topicWithPrivatePrefix,
        mocks.messaging.payload
      );
    });

    it('should be fulfilled given a valid topic, payload, and options', () => {
      mockedRequests.push(mockSendToTopicRequest());

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
        mocks.messaging.options,
      );
    });

    it('should be fulfilled with the server response', () => {
      mockedRequests.push(mockSendToTopicRequest());

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).should.eventually.deep.equal({
        messageId: mocks.messaging.messageId,
      });
    });

    it('should set the appropriate request data (topic name not prefixed with "/topics/")', () => {
      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging.sendToTopic(
            mocks.messaging.topic,
            mocks.messaging.payload,
          );
        }).then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.deep.equal({
            to: mocks.messaging.topicWithPrefix,
            data: mocks.messaging.payload.data,
            notification: mocks.messaging.payload.notification,
          });
        });
    });

    it('should set the appropriate request data (topic name prefixed with "/topics/")', () => {
      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging.sendToTopic(
            mocks.messaging.topicWithPrefix,
            mocks.messaging.payload,
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.deep.equal({
            to: mocks.messaging.topicWithPrefix,
            data: mocks.messaging.payload.data,
            notification: mocks.messaging.payload.notification,
          });
        });
    });

    it('should not mutate the payload argument', () => {
      mockedRequests.push(mockSendToTopicRequest());

      let mockPayloadClone: MessagingPayload = _.clone(mocks.messaging.payload);

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mockPayloadClone,
      ).then(() => {
        expect(mockPayloadClone).to.deep.equal(mocks.messaging.payload);
      });
    });

    it('should not mutate the options argument', () => {
      mockedRequests.push(mockSendToTopicRequest());

      let mockOptionsClone: MessagingOptions = _.clone(mocks.messaging.options);

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
        mockOptionsClone,
      ).then(() => {
        expect(mockOptionsClone).to.deep.equal(mocks.messaging.options);
      });
    });
  });

  describe('sendToCondition()', () => {
    const invalidArgumentError = 'Condition provided to sendToCondition() must be a non-empty string.';

    const invalidConditions = [null, NaN, 0, 1, true, false, [], ['a', 1], {}, { a: 1 }, _.noop];
    invalidConditions.forEach((invalidCondition) => {
      it(`should throw given invalid type for condition argument: ${ JSON.stringify(invalidCondition) }`, () => {
        expect(() => {
          messaging.sendToCondition(invalidCondition as string, mocks.messaging.payloadDataOnly);
        }).to.throw(invalidArgumentError);
      });
    });

    it('should throw given no condition argument', () => {
      expect(() => {
        messaging.sendToCondition(undefined as string, mocks.messaging.payloadDataOnly);
      }).to.throw(invalidArgumentError);
    });

    it('should throw given empty string for condition argument', () => {
      expect(() => {
        messaging.sendToCondition('', mocks.messaging.payloadDataOnly);
      }).to.throw(invalidArgumentError);
    });

    it('should be rejected given a 200 JSON server response with a known error', () => {
      mockedRequests.push(mockSendRequestWithError(200, 'json'));

      return messaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.json);
    });

    it('should be rejected given a 200 JSON server response with an unknown error', () => {
      mockedRequests.push(mockSendRequestWithError(200, 'json', { error: 'Unknown' }));

      return messaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    it('should be rejected given a non-2xx JSON server response', () => {
      mockedRequests.push(mockSendRequestWithError(400, 'json'));

      return messaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.json);
    });

    it('should be rejected given a non-2xx JSON server response with an unknown error', () => {
      mockedRequests.push(mockSendRequestWithError(400, 'json', { error: 'Unknown' }));

      return messaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    it('should be rejected given a non-2xx JSON server response without an error', () => {
      mockedRequests.push(mockSendRequestWithError(400, 'json', { foo: 'bar' }));

      return messaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    _.forEach(STATUS_CODE_TO_ERROR_MAP, (expectedError, statusCode) => {
      it(`should be rejected given a ${ statusCode } text server response`, () => {
        mockedRequests.push(mockSendRequestWithError(parseInt(statusCode, 10), 'text'));

        return messaging.sendToCondition(
        mocks.messaging.condition,
          mocks.messaging.payload,
        ).should.eventually.be.rejected.and.have.property('code', expectedError);
      });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenMessaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return nullAccessTokenMessaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return nullAccessTokenMessaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payload,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be fulfilled given a valid condition and payload', () => {
      mockedRequests.push(mockSendToConditionRequest());

      return messaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payloadDataOnly
      );
    });

    it('should be fulfilled given a valid condition, payload, and options', () => {
      mockedRequests.push(mockSendToConditionRequest());

      return messaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payloadDataOnly,
        mocks.messaging.options,
      );
    });

    it('should be fulfilled with the server response', () => {
      mockedRequests.push(mockSendToConditionRequest());

      return messaging.sendToCondition(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).should.eventually.deep.equal({
        messageId: mocks.messaging.messageId,
      });
    });

    it('should set the appropriate request data', () => {
      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging.sendToCondition(
            mocks.messaging.condition,
            mocks.messaging.payload,
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.deep.equal({
            condition: mocks.messaging.condition,
            data: mocks.messaging.payload.data,
            notification: mocks.messaging.payload.notification,
          });
        });
    });

    it('should not mutate the payload argument', () => {
      mockedRequests.push(mockSendToConditionRequest());

      let mockPayloadClone: MessagingPayload = _.clone(mocks.messaging.payload);

      return messaging.sendToCondition(
        mocks.messaging.condition,
        mockPayloadClone,
      ).then(() => {
        expect(mockPayloadClone).to.deep.equal(mocks.messaging.payload);
      });
    });

    it('should not mutate the options argument', () => {
      mockedRequests.push(mockSendToConditionRequest());

      let mockOptionsClone: MessagingOptions = _.clone(mocks.messaging.options);

      return messaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payload,
        mockOptionsClone,
      ).then(() => {
        expect(mockOptionsClone).to.deep.equal(mocks.messaging.options);
      });
    });
  });

  describe('Payload validation', () => {
    const invalidPayloads = [null, NaN, 0, 1, true, false, '', 'a', [], ['a', 1], _.noop];
    invalidPayloads.forEach((invalidPayload) => {
      it(`should throw given invalid type for payload argument: ${ JSON.stringify(invalidPayload) }`, () => {
        expect(() => {
          messaging.sendToDevice(mocks.messaging.registrationToken, invalidPayload as MessagingPayload);
        }).to.throw('Messaging payload must be an object');

        expect(() => {
          messaging.sendToDeviceGroup(mocks.messaging.notificationKey, invalidPayload as MessagingPayload);
        }).to.throw('Messaging payload must be an object');

        expect(() => {
          messaging.sendToTopic(mocks.messaging.topic, invalidPayload as MessagingPayload);
        }).to.throw('Messaging payload must be an object');

        expect(() => {
          messaging.sendToCondition(mocks.messaging.condition, invalidPayload as MessagingPayload);
        }).to.throw('Messaging payload must be an object');
      });
    });

    it('should be rejected given an empty payload', () => {
      return messaging.sendToDeviceGroup(mocks.messaging.notificationKey, {} as MessagingPayload)
        .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
    });

    it('should be rejected given a non-empty payload with neither the "data" nor the "notification" property', () => {
      return messaging.sendToTopic(mocks.messaging.topic, {
        foo: 'one',
        bar: 'two',
      } as MessagingPayload)
        .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
    });

    it('should be rejected given an otherwise valid payload with an additional invalid property', () => {
      let mockPayloadClone: MessagingPayload = _.clone(mocks.messaging.payload);
      (mockPayloadClone as any).foo = 'one';

      return messaging.sendToCondition(mocks.messaging.condition, mockPayloadClone)
        .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
    });

    it('should be rejected given a non-object value for the "data" property', () => {
      return messaging.sendToDevice(mocks.messaging.registrationToken, {
        data: 'foo' as any,
      }).should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
    });

    it('should be rejected given a non-object value for the "notification" property', () => {
      return messaging.sendToDevice(mocks.messaging.registrationToken, {
        notification: true as any,
      }).should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
    });

    it('should be rejected given a non-string value for a property within the "data" property', () => {
      return messaging.sendToDevice(mocks.messaging.registrationToken, {
        data: {
          foo: 1 as any,
        },
      }).should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
    });

    it('should be rejected given a non-string value for a property within the "notification" property', () => {
      return messaging.sendToDevice(mocks.messaging.registrationToken, {
        notification: {
          foo: true as any,
        },
      }).should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
    });

    it('should be rejected given a valid "data" property but invalid "notification" property', () => {
      let mockPayloadClone: MessagingPayload = _.clone(mocks.messaging.payloadDataOnly);
      (mockPayloadClone as any).notification = 'foo';

      return messaging.sendToDevice(mocks.messaging.registrationToken, mockPayloadClone)
        .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
    });

    it('should be rejected given a valid "notification" property but invalid "data" property', () => {
      let mockPayloadClone: MessagingPayload = _.clone(mocks.messaging.payloadNotificationOnly);
      (mockPayloadClone as any).data = 'foo';

      return messaging.sendToDevice(mocks.messaging.registrationToken, mockPayloadClone)
        .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
    });

    const blacklistedDataPayloadKeys = BLACKLISTED_DATA_PAYLOAD_KEYS.concat(['google.', 'google.foo']);
    blacklistedDataPayloadKeys.forEach((blacklistedProperty) => {
      it(`should be rejected given blacklisted "data.${blacklistedProperty}" property`, () => {
        return messaging.sendToDevice(
          mocks.messaging.registrationToken,
          {
            data: {
              [blacklistedProperty]: 'foo',
            },
          },
        ).should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
      });
    });

    const nonBlacklistedDataPayloadKeys = ['google', '.google', 'goo.gle', 'googlefoo', 'googlef.oo'];
    nonBlacklistedDataPayloadKeys.forEach((nonBlacklistedProperty) => {
      it(`should be fulfilled given non-blacklisted "data.${nonBlacklistedProperty}" property`, () => {
        mockedRequests.push(mockSendToDeviceStringRequest());

        return messaging.sendToDevice(
          mocks.messaging.registrationToken,
          {
            data: {
              [nonBlacklistedProperty]: 'foo',
            },
          },
        );
      });
    });

    it('should be fulfilled given a valid payload containing only the "data" property', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      return messaging.sendToDevice(mocks.messaging.registrationToken, mocks.messaging.payloadDataOnly);
    });

    it('should be fulfillled given a valid payload containing only the "notification" property', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      return messaging.sendToDevice(mocks.messaging.registrationToken, mocks.messaging.payloadNotificationOnly);
    });

    it('should be fulfillled given a valid payload containing both "data" and "notification" properties', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      return messaging.sendToDevice(mocks.messaging.registrationToken, mocks.messaging.payload);
    });

    it('should add "data" and "notification" as top-level properties of the request data', () => {
      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging.sendToDevice(
            mocks.messaging.registrationToken,
            mocks.messaging.payload,
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.have.keys(['to', 'data', 'notification']);
          expect(requestData.data).to.deep.equal(mocks.messaging.payload.data);
          expect(requestData.notification).to.deep.equal(mocks.messaging.payload.notification);
        });
    });

    it('should convert whitelisted camelCased properties to underscore_cased properties', () => {
      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging.sendToDevice(
            mocks.messaging.registrationToken,
            {
              notification: {
                bodyLocArgs: 'one',
                bodyLocKey: 'two',
                clickAction: 'three',
                titleLocArgs: 'four',
                titleLocKey: 'five',
                otherKey: 'six',
              },
            },
          );
        }).then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData.notification).to.deep.equal({
            body_loc_args: 'one',
            body_loc_key: 'two',
            click_action: 'three',
            title_loc_args: 'four',
            title_loc_key: 'five',
            otherKey: 'six',
          });
        });
    });

    it('should give whitelisted camelCased properties higher precedence than underscore_cased properties', () => {
      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging.sendToDevice(
            mocks.messaging.registrationToken,
            {
              notification: {
                bodyLocArgs: 'foo',
                body_loc_args: 'bar',
              },
            },
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData.notification.body_loc_args).to.equal('foo');
        });
    });

    it('should not mutate the provided payload object', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      const mockPayloadClone: MessagingPayload = _.clone(mocks.messaging.payload);

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mockPayloadClone,
      ).then(() => {
        expect(mockPayloadClone).to.deep.equal(mocks.messaging.payload);
      });
    });
  });

  describe('Options validation', () => {
    const invalidOptions = [null, NaN, 0, 1, true, false, '', 'a', [], ['a', 1], _.noop];
    invalidOptions.forEach((invalidOption) => {
      it(`should throw given invalid type for options argument: ${ JSON.stringify(invalidOption) }`, () => {
        expect(() => {
          messaging.sendToDevice(
            mocks.messaging.registrationToken,
            mocks.messaging.payload,
            invalidOption as MessagingOptions
          );
        }).to.throw('Messaging options must be an object');

        expect(() => {
          messaging.sendToDeviceGroup(
            mocks.messaging.notificationKey,
            mocks.messaging.payload,
            invalidOption as MessagingOptions
          );
        }).to.throw('Messaging options must be an object');

        expect(() => {
          messaging.sendToTopic(
            mocks.messaging.topic,
            mocks.messaging.payload,
            invalidOption as MessagingOptions
          );
        }).to.throw('Messaging options must be an object');

        expect(() => {
          messaging.sendToCondition(
            mocks.messaging.condition,
            mocks.messaging.payload,
            invalidOption as MessagingOptions
          );
        }).to.throw('Messaging options must be an object');
      });
    });

    BLACKLISTED_OPTIONS_KEYS.forEach((blacklistedProperty) => {
      it(`should be rejected given blacklisted "${blacklistedProperty}" property`, () => {
        return messaging.sendToDevice(
          mocks.messaging.registrationToken,
          mocks.messaging.payload,
          {
            [blacklistedProperty]: 'foo',
          },
        ).should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-options');
      });
    });

    const whitelistedOptionsKeys = {
      dryRun: { type: 'boolean', underscoreCasedKey: 'dry_run' },
      priority: { type: 'string' },
      timeToLive: { type: 'number', underscoreCasedKey: 'time_to_live' },
      collapseKey: { type: 'string', underscoreCasedKey: 'collapse_key' },
      mutableContent: { type: 'boolean', underscoreCasedKey: 'mutable_content' },
      contentAvailable: { type: 'boolean', underscoreCasedKey: 'content_available' },
      restrictedPackageName: { type: 'string', underscoreCasedKey: 'restricted_package_name' },
    };

    _.forEach(whitelistedOptionsKeys as any, ({ type, underscoreCasedKey }, camelCasedKey) => {
      let validValue;
      let invalidValues;
      if (type === 'string') {
        invalidValues = [
          { value: true, text: 'non-string' },
          { value: '', text: 'empty string' },
        ];
        validValue = 'foo';
      } else if (type === 'number') {
        invalidValues = [
          { value: true, text: 'non-number' },
          { value: NaN, text: 'NaN' },
        ];
        validValue = 1;
      } else if (type === 'boolean') {
        invalidValues = [
          { value: '', text: 'non-boolean' },
        ];
        validValue = false;
      }

      // Only test the alternate underscoreCasedKey if it is defined
      let keysToTest = [camelCasedKey];
      if (typeof underscoreCasedKey !== 'undefined') {
        keysToTest.push(underscoreCasedKey);
      }

      keysToTest.forEach((key) => {
        invalidValues.forEach(({ value, text }) => {
          it(`should be rejected given ${ text } value for the "${ key }" property`, () => {
            return messaging.sendToDevice(
              mocks.messaging.registrationToken,
              mocks.messaging.payload,
              {
                [key]: value as any,
              },
            ).should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-options');
          });
        });

        it(`should be fulfilled given ${ type } value for the "${ key }" property`, () => {
          mockedRequests.push(mockSendToDeviceStringRequest());

          return messaging.sendToDevice(
            mocks.messaging.registrationToken,
            mocks.messaging.payload,
            {
              [key]: validValue,
            },
          );
        });
      });
    });

    it('should be fulfilled given an empty options object', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
        {},
      );
    });

    it('should be fulfilled given an options object containing only whitelisted properties', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
        mocks.messaging.options,
      );
    });

    it('should be fulfilled given an options object containing non-whitelisted properties', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      const mockOptionsClone: MessagingOptions = _.clone(mocks.messaging.options);
      (mockOptionsClone as any).foo = 'bar';

      return messaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payload,
        mockOptionsClone,
      );
    });

    it('should add provided options as top-level properties of the request data', () => {
      const mockOptionsClone: MessagingOptions = _.clone(mocks.messaging.options);

      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging.sendToDevice(
            mocks.messaging.registrationToken,
            mocks.messaging.payloadDataOnly,
            mockOptionsClone,
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.have.keys(['to', 'data', 'dry_run', 'collapse_key']);
          expect(requestData.dry_run).to.equal(mockOptionsClone.dryRun);
          expect(requestData.collapse_key).to.equal(mockOptionsClone.collapseKey);
        });
    });

    it('should convert whitelisted camelCased properties to underscore_cased properties', () => {
      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging.sendToDevice(
            mocks.messaging.registrationToken,
            mocks.messaging.payloadDataOnly,
            {
              dryRun: true,
              timeToLive: 1,
              collapseKey: 'foo',
              mutableContent: true,
              contentAvailable: false,
              restrictedPackageName: 'bar',
              otherKey: true,
            },
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.have.keys([
            'to', 'data', 'dry_run', 'time_to_live', 'collapse_key', 'mutable_content',
            'content_available', 'restricted_package_name', 'otherKey',
          ]);
        });
    });

    it('should give whitelisted camelCased properties higher precedence than underscore_cased properties', () => {
      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging.sendToDevice(
            mocks.messaging.registrationToken,
            mocks.messaging.payloadDataOnly,
            {
              dryRun: true,
              dry_run: false,
            },
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData.dry_run).to.be.true;
        });
    });

    it('should not mutate the provided options object', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      const mockOptionsClone: MessagingOptions = _.clone(mocks.messaging.options);

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
        mockOptionsClone,
      ).then(() => {
        expect(mockOptionsClone).to.deep.equal(mocks.messaging.options);
      });
    });
  });

  function tokenSubscriptionTests(methodName) {
    let invalidRegistrationTokensArgumentError = 'Registration token(s) provided to ' +
      `${methodName}() must be a non-empty string or a non-empty array`;

    const invalidRegistrationTokens = [null, NaN, 0, 1, true, false, {}, { a: 1 }, _.noop];
    invalidRegistrationTokens.forEach((invalidRegistrationToken) => {
      it('should throw given invalid type for registration token(s) argument: ' +
        JSON.stringify(invalidRegistrationToken), () => {
        expect(() => {
          messaging[methodName](invalidRegistrationToken as string, mocks.messaging.topic);
        }).to.throw(invalidRegistrationTokensArgumentError);
      });
    });

    it('should throw given no registration token(s) argument', () => {
      expect(() => {
        messaging[methodName](undefined as string, mocks.messaging.topic);
      }).to.throw(invalidRegistrationTokensArgumentError);
    });

    it('should throw given empty string for registration token(s) argument', () => {
      expect(() => {
        messaging[methodName]('', mocks.messaging.topic);
      }).to.throw(invalidRegistrationTokensArgumentError);
    });

    it('should throw given empty array for registration token(s) argument', () => {
      expect(() => {
        messaging[methodName]([], mocks.messaging.topic);
      }).to.throw(invalidRegistrationTokensArgumentError);
    });

    it('should be rejected given empty string within array for registration token(s) argument', () => {
      return messaging[methodName](['foo', 'bar', ''], mocks.messaging.topic)
        .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-argument');
    });

    it('should be rejected given non-string value within array for registration token(s) argument', () => {
      return messaging[methodName](['foo', true as any, 'bar'], mocks.messaging.topic)
        .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-argument');
    });

    it('should be rejected given an array containing more than 1,000 registration tokens', () => {
      mockedRequests.push(mockTopicSubscriptionRequest(methodName, /* successCount */ 1000));

      // Create an array of exactly 1,000 registration tokens
      const registrationTokens = (Array(1000) as any).fill(mocks.messaging.registrationToken);

      return messaging[methodName](registrationTokens, mocks.messaging.topic)
        .then(() => {
          // Push the array of registration tokens over 1,000 items
          registrationTokens.push(mocks.messaging.registrationToken);

          return messaging[methodName](registrationTokens, mocks.messaging.topic)
            .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-argument');
        });
    });

    const invalidTopicArgumentError = `Topic provided to ${methodName}() must be a string which matches`;

    const invalidTopics = [null, NaN, 0, 1, true, false, [], ['a', 1], {}, { a: 1 }, _.noop];
    invalidTopics.forEach((invalidTopic) => {
      it(`should throw given invalid type for topic argument: ${ JSON.stringify(invalidTopic) }`, () => {
        expect(() => {
          messaging[methodName](mocks.messaging.registrationToken, invalidTopic as string);
        }).to.throw(invalidTopicArgumentError);
      });
    });

    it('should throw given no topic argument', () => {
      expect(() => {
        messaging[methodName](mocks.messaging.registrationToken, undefined as string);
      }).to.throw(invalidTopicArgumentError);
    });

    it('should throw given empty string for topic argument', () => {
      expect(() => {
        messaging[methodName](mocks.messaging.registrationToken, '');
      }).to.throw(invalidTopicArgumentError);
    });

    const topicsWithInvalidCharacters = ['f*o*o', '/topics/f+o+o', 'foo/topics/foo', '$foo', '/topics/foo&'];
    topicsWithInvalidCharacters.forEach((invalidTopic) => {
      it(`should be rejected given topic argument which has invalid characters: ${ invalidTopic }`, () => {
        return messaging[methodName](mocks.messaging.registrationToken, invalidTopic)
          .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-argument');
      });
    });

    it('should be rejected given a 200 JSON server response with a known error', () => {
      mockedRequests.push(mockTopicSubscriptionRequestWithError(methodName, 200, 'json'));

      return messaging[methodName](
        mocks.messaging.registrationToken,
        mocks.messaging.topic,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.json);
    });

    it('should be rejected given a 200 JSON server response with an unknown error', () => {
      mockedRequests.push(mockTopicSubscriptionRequestWithError(methodName, 200, 'json', { error: 'Unknown' }));

      return messaging[methodName](
        mocks.messaging.registrationToken,
        mocks.messaging.topic,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    it('should be rejected given a non-2xx JSON server response', () => {
      mockedRequests.push(mockTopicSubscriptionRequestWithError(methodName, 400, 'json'));

      return messaging[methodName](
        mocks.messaging.registrationToken,
        mocks.messaging.topic,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.json);
    });

    it('should be rejected given a non-2xx JSON server response with an unknown error', () => {
      mockedRequests.push(mockTopicSubscriptionRequestWithError(methodName, 400, 'json', { error: 'Unknown' }));

      return messaging[methodName](
        mocks.messaging.registrationToken,
        mocks.messaging.topic,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    it('should be rejected given a non-2xx JSON server response without an error', () => {
      mockedRequests.push(mockTopicSubscriptionRequestWithError(methodName, 400, 'json', { foo: 'bar' }));

      return messaging[methodName](
        mocks.messaging.registrationToken,
        mocks.messaging.topic,
      ).should.eventually.be.rejected.and.have.property('code', expectedErrorCodes.unknownError);
    });

    _.forEach(STATUS_CODE_TO_ERROR_MAP, (expectedError, statusCode) => {
      it(`should be rejected given a ${ statusCode } text server response`, () => {
        mockedRequests.push(mockTopicSubscriptionRequestWithError(methodName, parseInt(statusCode, 10), 'text'));

        return messaging[methodName](
          mocks.messaging.registrationToken,
          mocks.messaging.topic,
        ).should.eventually.be.rejected.and.have.property('code', expectedError);
      });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenMessaging[methodName](
        mocks.messaging.registrationToken,
        mocks.messaging.topic,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return nullAccessTokenMessaging[methodName](
        mocks.messaging.registrationToken,
        mocks.messaging.topic,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return nullAccessTokenMessaging[methodName](
        mocks.messaging.registrationToken,
        mocks.messaging.topic,
      ).should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be fulfilled given a valid registration token and topic (topic name not prefixed ' +
       'with "/topics/")', () => {
      mockedRequests.push(mockTopicSubscriptionRequest(methodName, /* successCount */ 1));

      return messaging[methodName](
        mocks.messaging.registrationToken,
        mocks.messaging.topic,
      );
    });

    it('should be fulfilled given a valid registration token and topic (topic name prefixed ' +
       'with "/topics/")', () => {
      mockedRequests.push(mockTopicSubscriptionRequest(methodName, /* successCount */ 1));

      return messaging[methodName](
        mocks.messaging.registrationToken,
        mocks.messaging.topicWithPrefix,
      );
    });

    it('should be fulfilled given a valid array of registration tokens and topic (topic name not ' +
       'prefixed with "/topics/")', () => {
      mockedRequests.push(mockTopicSubscriptionRequest(methodName, /* successCount */ 3));

      return messaging[methodName](
        [
          mocks.messaging.registrationToken + '0',
          mocks.messaging.registrationToken + '1',
          mocks.messaging.registrationToken + '2',
        ],
        mocks.messaging.topic,
      );
    });

    it('should be fulfilled given a valid array of registration tokens and topic (topic name ' +
       'prefixed with "/topics/")', () => {
      mockedRequests.push(mockTopicSubscriptionRequest(methodName, /* successCount */ 3));

      return messaging[methodName](
        [
          mocks.messaging.registrationToken + '0',
          mocks.messaging.registrationToken + '1',
          mocks.messaging.registrationToken + '2',
        ],
        mocks.messaging.topicWithPrefix,
      );
    });

    it('should be fulfilled with the server response given a single registration token and topic ' +
       '(topic name not prefixed with "/topics/")', () => {
      mockedRequests.push(mockTopicSubscriptionRequest(methodName, /* successCount */ 1));

      return messaging[methodName](
        mocks.messaging.registrationToken,
        mocks.messaging.topic,
      ).should.eventually.deep.equal({
        failureCount: 0,
        successCount: 1,
        errors: [],
      });
    });

    it('should be fulfilled with the server response given a single registration token and topic ' +
       '(topic name prefixed with "/topics/")', () => {
      mockedRequests.push(mockTopicSubscriptionRequest(methodName, /* successCount */ 1));

      return messaging[methodName](
        mocks.messaging.registrationToken,
        mocks.messaging.topicWithPrefix,
      ).should.eventually.deep.equal({
        failureCount: 0,
        successCount: 1,
        errors: [],
      });
    });

    it('should be fulfilled with the server response given an array of registration tokens ' +
       'and topic (topic name not prefixed with "/topics/")', () => {
      mockedRequests.push(mockTopicSubscriptionRequest(methodName, /* successCount */ 1, /* failureCount */ 2));

      return messaging[methodName](
        [
          mocks.messaging.registrationToken + '0',
          mocks.messaging.registrationToken + '1',
          mocks.messaging.registrationToken + '2',
        ],
        mocks.messaging.topic,
      ).then((response: MessagingTopicManagementResponse) => {
        expect(response).to.have.keys(['failureCount', 'successCount', 'errors']);
        expect(response.failureCount).to.equal(2);
        expect(response.successCount).to.equal(1);
        expect(response.errors).to.have.length(2);
        expect(response.errors[0]).to.have.keys(['index', 'error']);
        expect(response.errors[0].index).to.equal(1);
        expect(response.errors[0].error).to.have.property('code', 'messaging/too-many-topics');
        expect(response.errors[1]).to.have.keys(['index', 'error']);
        expect(response.errors[1].index).to.equal(2);
        expect(response.errors[1].error).to.have.property('code', 'messaging/too-many-topics');
      });
    });

    it('should be fulfilled with the server response given an array of registration tokens ' +
       'and topic (topic name prefixed with "/topics/")', () => {
      mockedRequests.push(mockTopicSubscriptionRequest(methodName, /* successCount */ 1, /* failureCount */ 2));

      return messaging[methodName](
        [
          mocks.messaging.registrationToken + '0',
          mocks.messaging.registrationToken + '1',
          mocks.messaging.registrationToken + '2',
        ],
        mocks.messaging.topicWithPrefix,
      ).then((response: MessagingTopicManagementResponse) => {
        expect(response).to.have.keys(['failureCount', 'successCount', 'errors']);
        expect(response.failureCount).to.equal(2);
        expect(response.successCount).to.equal(1);
        expect(response.errors).to.have.length(2);
        expect(response.errors[0]).to.have.keys(['index', 'error']);
        expect(response.errors[0].index).to.equal(1);
        expect(response.errors[0].error).to.have.property('code', 'messaging/too-many-topics');
        expect(response.errors[1]).to.have.keys(['index', 'error']);
        expect(response.errors[1].index).to.equal(2);
        expect(response.errors[1].error).to.have.property('code', 'messaging/too-many-topics');
      });
    });

    it('should set the appropriate request data given a single registration token and topic ' +
       '(topic name not prefixed with "/topics/")', () => {
      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging[methodName](
            mocks.messaging.registrationToken,
            mocks.messaging.topic,
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.deep.equal({
            to: mocks.messaging.topicWithPrefix,
            registration_tokens: [mocks.messaging.registrationToken],
          });
        });
    });

    it('should set the appropriate request data given a single registration token and topic ' +
       '(topic name prefixed with "/topics/")', () => {
      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging[methodName](
            mocks.messaging.registrationToken,
            mocks.messaging.topicWithPrefix,
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.deep.equal({
            to: mocks.messaging.topicWithPrefix,
            registration_tokens: [mocks.messaging.registrationToken],
          });
        });
    });

    it('should set the appropriate request data given an array of registration tokens and ' +
       'topic (topic name not prefixed with "/topics/")', () => {
      const registrationTokens = [
        mocks.messaging.registrationToken + '0',
        mocks.messaging.registrationToken + '1',
        mocks.messaging.registrationToken + '2',
      ];

      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging[methodName](
            registrationTokens,
            mocks.messaging.topic,
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.deep.equal({
            to: mocks.messaging.topicWithPrefix,
            registration_tokens: registrationTokens,
          });
        });
    });

    it('should set the appropriate request data given an array of registration tokens and ' +
       'topic (topic name prefixed with "/topics/")', () => {
      const registrationTokens = [
        mocks.messaging.registrationToken + '0',
        mocks.messaging.registrationToken + '1',
        mocks.messaging.registrationToken + '2',
      ];

      // Wait for the initial getToken() call to complete before stubbing https.request.
      return mockApp.INTERNAL.getToken()
        .then(() => {
          httpsRequestStub = sinon.stub(https, 'request');
          httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

          return messaging[methodName](
            registrationTokens,
            mocks.messaging.topicWithPrefix,
          );
        })
        .then(() => {
          expect(requestWriteSpy).to.have.been.calledOnce;
          const requestData = JSON.parse(requestWriteSpy.args[0][0]);
          expect(requestData).to.deep.equal({
            to: mocks.messaging.topicWithPrefix,
            registration_tokens: registrationTokens,
          });
        });
    });
  }

  describe('subscribeToTopic()', () => {
    tokenSubscriptionTests('subscribeToTopic');
  });

  describe('unsubscribeFromTopic()', () => {
    tokenSubscriptionTests('unsubscribeFromTopic');
  });

  describe('INTERNAL.delete()', () => {
    it('should delete Messaging instance', () => {
      messaging.INTERNAL.delete().should.eventually.be.fulfilled;
    });
  });
});
