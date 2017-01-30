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

import * as utils from './utils';
import * as mocks from './resources/mocks';

import {FirebaseApp} from '../src/firebase-app';
import {
  Messaging, MessagingOptions, MessagingPayload, BLACKLISTED_OPTIONS_KEYS,
  BLACKLISTED_DATA_PAYLOAD_KEYS,
} from '../src/messaging/messaging';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);


function mockSendToDeviceStringRequest(): nock.Scope {
  return nock('https://fcm.googleapis.com:443')
    .post('/fcm/send')
    .reply(200, {
      multicast_id: mocks.messaging.multicastId,
      success: 1,
      failure: 0,
      canonical_ids: 0,
      results: [
        { message_id: `0:${ mocks.messaging.messageId }` },
      ],
    });
}

function mockSendToDeviceArrayRequest(): nock.Scope {
  return nock('https://fcm.googleapis.com:443')
    .post('/fcm/send')
    .reply(200, {
      multicast_id: mocks.messaging.multicastId,
      success: 2,
      failure: 1,
      canonical_ids: 0,
      results: [
        { message_id: `0:${ mocks.messaging.messageId }` },
        { error: 'some-error' },
        { message_id: `2:${ mocks.messaging.messageId }` },
      ],
    });
}

function mockSendToDeviceGroupRequest(): nock.Scope {
  // TODO(jwenger): add failed_registration_ids.
  return nock('https://fcm.googleapis.com:443')
    .post('/fcm/send')
    .reply(200, {
      success: 5,
      failure: 0,
    });
}

function mockSendToTopicRequest(): nock.Scope {
  return nock('https://fcm.googleapis.com:443')
    .post('/fcm/send')
    .reply(200, {
      message_id: mocks.messaging.messageId,
    });
}

function mockSendToTopicRequestWithError(errorFormat = 'json'): nock.Scope {
  let response;
  if (errorFormat === 'json') {
    response = {
      error: 'TODO(jwenger): mock proper error format',
    };
  } else {
    response = '<html>Error</html>';
  }

  return nock('https://fcm.googleapis.com:443')
    .defaultReplyHeaders({
      'Content-Type': (req, res, body) => {
        if (errorFormat === 'json') {
          return 'application/json; charset=UTF-8';
        } else {
          return 'text/html; charset=UTF-8';
        }
      },
    })
    .post('/fcm/send')
    .reply(200, response);
}

function mockSendToConditionRequest(): nock.Scope {
  return nock('https://fcm.googleapis.com:443')
    .post('/fcm/send')
    .reply(200, {
      message_id: mocks.messaging.messageId,
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

  before(() => utils.mockFetchAccessTokenRequests());

  after(() => nock.cleanAll());

  beforeEach(() => {
    mockApp = mocks.app();
    messaging = new Messaging(mockApp);

    mockResponse = new stream.PassThrough();
    mockResponse.write(JSON.stringify({ foo: 1 }));
    mockResponse.end();

    mockRequestStream = new mocks.MockStream();

    requestWriteSpy = sinon.spy(mockRequestStream, 'write');
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
    const invalidArgumentError = 'Registration token provided to sendToDevice() must be a non-empty ' +
      'string or a non-empty array';

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

    it('should throw given empty string within array for registration token(s) argument', () => {
      expect(() => {
        messaging.sendToDevice(['foo', 'bar', ''], mocks.messaging.payloadDataOnly);
      }).to.throw('Registration token provided to sendToDevice() at index 2 must be a non-empty string');
    });

    it('should throw given non-string value within array for registration token(s) argument', () => {
      expect(() => {
        messaging.sendToDevice(['foo', true as any, 'bar'], mocks.messaging.payloadDataOnly);
      }).to.throw('Registration token provided to sendToDevice() at index 1 must be a non-empty string');
    });

    it('should be fulfilled given a valid registration token and payload', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payloadDataOnly,
      );
    });

    it('should be fulfilled given a valid registration token, payload, and options', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payloadDataOnly,
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
        mocks.messaging.payloadDataOnly,
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
        mocks.messaging.payloadDataOnly,
        mocks.messaging.options,
      );
    });

    // TODO(jwenger): get test working with next CL
    xit('should be fulfilled with the server response given a single registration token', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payloadDataOnly,
      ).should.eventually.deep.equal({
        failure: 0,
        success: 1,
        canonicalIds: 0,
        multicastId: mocks.messaging.multicastId,
        results: [
          { messageId: `0:${ mocks.messaging.messageId }` },
        ],
      });
    });

    // TODO(jwenger): get test working with next CL
    xit('should be fulfilled with the server response given an array of registration tokens', () => {
      mockedRequests.push(mockSendToDeviceArrayRequest());

      return messaging.sendToDevice(
        [
          mocks.messaging.registrationToken + '0',
          mocks.messaging.registrationToken + '1',
          mocks.messaging.registrationToken + '2',
        ],
        mocks.messaging.payloadDataOnly,
      ).should.eventually.deep.equal({
        failure: 1,
        success: 2,
        canonicalIds: 0,
        multicastId: mocks.messaging.multicastId,
        results: [
          { messageId: `0:${ mocks.messaging.messageId }` },
          { error: 'some-error' },
          { messageId: `2:${ mocks.messaging.messageId }` },
        ],
      });
    });

    it('should set the appropriate request data given a single registration token', () => {
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      ).then(() => {
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
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

      const registrationTokens = [
        mocks.messaging.registrationToken + '0',
        mocks.messaging.registrationToken + '1',
        mocks.messaging.registrationToken + '2',
      ];

      return messaging.sendToDevice(
        registrationTokens,
        mocks.messaging.payload,
      ).then(() => {
        expect(requestWriteSpy).to.have.been.calledOnce;
        const requestData = JSON.parse(requestWriteSpy.args[0][0]);
        expect(requestData).to.deep.equal({
          registration_ids: registrationTokens,
          data: mocks.messaging.payload.data,
          notification: mocks.messaging.payload.notification,
        });
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

    // TODO(jwenger): get test working with next CL
    xit('should be fulfilled with the server response', () => {
      mockedRequests.push(mockSendToDeviceGroupRequest());

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payloadDataOnly,
      ).should.eventually.deep.equal({
        failure: 0,
        success: 1,
      });
    });

    it('should set the appropriate request data', () => {
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

      return messaging.sendToDeviceGroup(
        mocks.messaging.notificationKey,
        mocks.messaging.payload,
      ).then(() => {
        expect(requestWriteSpy).to.have.been.calledOnce;
        const requestData = JSON.parse(requestWriteSpy.args[0][0]);
        expect(requestData).to.deep.equal({
          to: mocks.messaging.notificationKey,
          data: mocks.messaging.payload.data,
          notification: mocks.messaging.payload.notification,
        });
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
      it(`should throw given topic argument which has invalid characters: ${ invalidTopic }`, () => {
        expect(() => {
          messaging.sendToTopic(invalidTopic, mocks.messaging.payload);
        }).to.throw(invalidArgumentError);
      });
    });

    it('should throw given topic argument which has invalid characters', () => {
      expect(() => {
        messaging.sendToTopic('/topics/f*o*o', mocks.messaging.payload);
      }).to.throw(invalidArgumentError);
    });

    // TODO(jwenger): get test working with next CL
    xit('should be rejected when a JSON server error is returned', () => {
      mockedRequests.push(mockSendToTopicRequestWithError());

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
        mocks.messaging.options,
      ).should.eventually.be.rejectedWith('foo');
    });

    // TODO(jwenger): get test working with next CL
    xit('should be rejected when a text server error is returned', () => {
      mockedRequests.push(mockSendToTopicRequestWithError('text'));

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
        mocks.messaging.options,
      ).should.eventually.be.rejectedWith('foo');
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

    // TODO(jwenger): get test working with next CL
    xit('should be fulfilled with the server response', () => {
      mockedRequests.push(mockSendToTopicRequest());

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).should.eventually.deep.equal({
        messageId: mocks.messaging.messageId,
      });
    });

    it('should set the appropriate request data (topic name not prefixed with "/topics/")', () => {
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

      return messaging.sendToTopic(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).then(() => {
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
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

      return messaging.sendToTopic(
        mocks.messaging.topicWithPrefix,
        mocks.messaging.payload,
      ).then(() => {
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

    // TODO(jwenger): get test working with next CL
    xit('should be fulfilled with the server response', () => {
      mockedRequests.push(mockSendToConditionRequest());

      return messaging.sendToCondition(
        mocks.messaging.topic,
        mocks.messaging.payload,
      ).should.eventually.deep.equal({
        messageId: mocks.messaging.messageId,
      });
    });

    it('should set the appropriate request data', () => {
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

      return messaging.sendToCondition(
        mocks.messaging.condition,
        mocks.messaging.payload,
      ).then(() => {
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
      it(`should throw given invalid type for condition argument: ${ JSON.stringify(invalidPayload) }`, () => {
        expect(() => {
          messaging.sendToDevice(mocks.messaging.registrationToken, invalidPayload as MessagingPayload);
        }).to.throw('Messaging payload must be an object');
      });
    });

    it('should throw given an empty payload', () => {
      expect(() => {
        messaging.sendToDevice(mocks.messaging.registrationToken, {} as MessagingPayload);
      }).to.throw('Messaging payload must contain at least one of the "data" or "notification" properties.');
    });

    it('should throw given a non-empty payload with neither the "data" nor the "notification" property', () => {
      expect(() => {
        messaging.sendToDevice(mocks.messaging.registrationToken, {
          foo: 'one',
          bar: 'two',
        } as MessagingPayload);
      }).to.throw('Messaging payload contains an invalid "foo" property.');
    });

    it('should throw given an otherwise valid payload with an additional invalid property', () => {
      let mockPayloadClone: MessagingPayload = _.clone(mocks.messaging.payload);
      (mockPayloadClone as any).foo = 'one';
      expect(() => {
        messaging.sendToDevice(mocks.messaging.registrationToken, mockPayloadClone);
      }).to.throw('Messaging payload contains an invalid "foo" property.');
    });

    it('should throw given a non-object value for the "data" property', () => {
      expect(() => {
        messaging.sendToDevice(mocks.messaging.registrationToken, {
          data: 'foo' as any,
        });
      }).to.throw('Messaging payload contains an invalid value for the "data" property.');
    });

    it('should throw given a non-object value for the "notification" property', () => {
      expect(() => {
        messaging.sendToDevice(mocks.messaging.registrationToken, {
          notification: true as any,
        });
      }).to.throw('Messaging payload contains an invalid value for the "notification" property.');
    });

    it('should throw given a non-string value for a property within the "data" property', () => {
      expect(() => {
        messaging.sendToDevice(mocks.messaging.registrationToken, {
          data: {
            foo: 1 as any,
          },
        });
      }).to.throw('Messaging payload contains an invalid value for the "data.foo" property.');
    });

    it('should throw given a non-string value for a property within the "notification" property', () => {
      expect(() => {
        messaging.sendToDevice(mocks.messaging.registrationToken, {
          notification: {
            foo: true as any,
          },
        });
      }).to.throw('Messaging payload contains an invalid value for the "notification.foo" property.');
    });

    it('should throw given a valid "data" property but invalid "notification" property', () => {
      let mockPayloadClone: MessagingPayload = _.clone(mocks.messaging.payloadDataOnly);
      (mockPayloadClone as any).notification = 'foo';
      expect(() => {
        messaging.sendToDevice(mocks.messaging.registrationToken, mockPayloadClone);
      }).to.throw('Messaging payload contains an invalid value for the "notification" property.');
    });

    it('should throw given a valid "notification" property but invalid "data" property', () => {
      let mockPayloadClone: MessagingPayload = _.clone(mocks.messaging.payloadNotificationOnly);
      (mockPayloadClone as any).data = 'foo';
      expect(() => {
        messaging.sendToDevice(mocks.messaging.registrationToken, mockPayloadClone);
      }).to.throw('Messaging payload contains an invalid value for the "data" property.');
    });

    const blacklistedDataPayloadKeys = BLACKLISTED_DATA_PAYLOAD_KEYS.concat([
      'gcm', 'gcmfoo', 'google', 'googlefoo',
    ]);
    blacklistedDataPayloadKeys.forEach((blacklistedProperty) => {
      it(`should throw given blacklisted "data.${blacklistedProperty}" property`, () => {
        expect(() => {
          messaging.sendToDevice(
            mocks.messaging.registrationToken,
            {
              data: {
                [blacklistedProperty]: 'foo',
              },
            },
          );
        }).to.throw(`Messaging payload contains the blacklisted "data.${blacklistedProperty}" property.`);
      });
    });

    it('should not throw given a valid payload containing only the "data" property', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      expect(() => {
        messaging.sendToDevice(mocks.messaging.registrationToken, mocks.messaging.payloadDataOnly);
      }).not.to.throw();
    });

    it('should not throw given a valid payload containing only the "notification" property', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      expect(() => {
        messaging.sendToDevice(mocks.messaging.registrationToken, mocks.messaging.payloadNotificationOnly);
      }).not.to.throw();
    });

    it('should not throw given a valid payload containing both "data" and "notification" properties', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      expect(() => {
        messaging.sendToDevice(mocks.messaging.registrationToken, mocks.messaging.payload);
      }).not.to.throw();
    });

    it('should add "data" and "notification" as top-level properties of the request data', () => {
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payload,
      ).then(() => {
        expect(requestWriteSpy).to.have.been.calledOnce;
        const requestData = JSON.parse(requestWriteSpy.args[0][0]);
        expect(requestData).to.have.keys(['to', 'data', 'notification']);
        expect(requestData.data).to.deep.equal(mocks.messaging.payload.data);
        expect(requestData.notification).to.deep.equal(mocks.messaging.payload.notification);
      });
    });

    it('should convert whitelisted camelCased properties to underscore_cased properties', () => {
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
      ).then(() => {
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
      ).then(() => {
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
      });
    });

    BLACKLISTED_OPTIONS_KEYS.forEach((blacklistedProperty) => {
      it(`should throw given blacklisted "${blacklistedProperty}" property`, () => {
        expect(() => {
          messaging.sendToDevice(
            mocks.messaging.registrationToken,
            mocks.messaging.payload,
            {
              [blacklistedProperty]: 'foo',
            },
          );
        }).to.throw(`Messaging options contains the blacklisted "${blacklistedProperty}" property.`);
      });
    });

    const whitelistedOptionsKeys = {
      dryRun: { type: 'boolean', underscoreCasedKey: 'dry_run' },
      priority: { type: 'string' },
      timeToLive: { type: 'number', underscoreCasedKey: 'time_to_live' },
      collapseKey: { type: 'string', underscoreCasedKey: 'collapse_key' },
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
          it(`should throw given ${ text } value for the "${ key }" property`, () => {
            expect(() => {
              messaging.sendToDevice(
                mocks.messaging.registrationToken,
                mocks.messaging.payload,
                {
                  [key]: value as any,
                },
              );
            }).to.throw(`Messaging options contains an invalid value for the "${ key }" property.`);
          });
        });

        it(`should not throw given ${ type } value for the "${ key }" property`, () => {
          mockedRequests.push(mockSendToDeviceStringRequest());

          expect(() => {
            messaging.sendToDevice(
              mocks.messaging.registrationToken,
              mocks.messaging.payload,
              {
                [key]: validValue,
              },
            );
          }).not.to.throw();
        });
      });
    });

    it('should not throw given an empty options object', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      expect(() => {
        messaging.sendToDevice(
          mocks.messaging.registrationToken,
          mocks.messaging.payload,
          {},
        );
      }).not.to.throw();
    });

    it('should not throw given an options object containing only whitelisted properties', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      expect(() => {
        messaging.sendToDevice(
          mocks.messaging.registrationToken,
          mocks.messaging.payload,
          mocks.messaging.options,
        );
      }).not.to.throw();
    });

    it('should not throw given an options object containing non-whitelisted properties', () => {
      mockedRequests.push(mockSendToDeviceStringRequest());

      const mockOptionsClone: MessagingOptions = _.clone(mocks.messaging.options);
      mockOptionsClone.foo = 'bar';

      expect(() => {
        messaging.sendToDevice(
          mocks.messaging.registrationToken,
          mocks.messaging.payload,
          mockOptionsClone,
        );
      }).not.to.throw();
    });

    it('should add provided options as top-level properties of the request data', () => {
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

      const mockOptionsClone: MessagingOptions = _.clone(mocks.messaging.options);

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payloadDataOnly,
        mockOptionsClone,
      ).then(() => {
        expect(requestWriteSpy).to.have.been.calledOnce;
        const requestData = JSON.parse(requestWriteSpy.args[0][0]);
        expect(requestData).to.have.keys(['to', 'data', 'dry_run', 'collapse_key']);
        expect(requestData.dry_run).to.equal(mockOptionsClone.dryRun);
        expect(requestData.collapse_key).to.equal(mockOptionsClone.collapseKey);
      });
    });

    it('should convert whitelisted camelCased properties to underscore_cased properties', () => {
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payloadDataOnly,
        {
          dryRun: true,
          timeToLive: 1,
          collapseKey: 'foo',
          contentAvailable: false,
          restrictedPackageName: 'bar',
          otherKey: true,
        },
      ).then(() => {
        expect(requestWriteSpy).to.have.been.calledOnce;
        const requestData = JSON.parse(requestWriteSpy.args[0][0]);
        expect(requestData).to.have.keys([
          'to', 'data', 'dry_run', 'time_to_live', 'collapse_key', 'content_available',
          'restricted_package_name', 'otherKey',
        ]);
      });
    });

    it('should give whitelisted camelCased properties higher precedence than underscore_cased properties', () => {
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.callsArgWith(1, mockResponse).returns(mockRequestStream);

      return messaging.sendToDevice(
        mocks.messaging.registrationToken,
        mocks.messaging.payloadDataOnly,
        {
          dryRun: true,
          dry_run: false,
        },
      ).then(() => {
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

  describe('INTERNAL.delete()', () => {
    it('should delete Messaging instance', () => {
      messaging.INTERNAL.delete().should.eventually.be.fulfilled;
    });
  });
});
