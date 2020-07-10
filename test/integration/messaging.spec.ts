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

import * as admin from '../../lib/index';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

// The registration token and notification key have the proper format, but are not guaranteed to
// work. The intention of these integration tests is that the endpoints returns the proper payload,
// but it is hard to ensure these tokens will always be valid. The tests below should still pass
// even if they are rotated or invalid.
const registrationToken = 'fGw0qy4TGgk:APA91bGtWGjuhp4WRhHXgbabIYp1jxEKI08ofj_v1bKhWAGJQ4e3arRCW' +
  'zeTfHaLz83mBnDh0aPWB1AykXAVUUGl2h1wT4XI6XazWpvY7RBUSYfoxtqSWGIm2nvWh2BOP1YG501SsRoE';
const notificationKey = 'APA91bFYr4cWCkDs_H9VY2Ai6Erw1ABup1NEYqBjz70O8SzxjpALp_bN913XJMlOepaVv9e' +
  'Qs2QrtqX_RZ6cVVv4czgTQXg62qicITR6tQDizaFilDnlVf0';

const registrationTokens = [registrationToken + '0', registrationToken + '1', registrationToken + '2'];
const topic = 'mock-topic';
const condition = '"test0" in topics || ("test1" in topics && "test2" in topics)';

const invalidTopic = 'topic-$%#^';

const message: admin.messaging.Message = {
  data: {
    foo: 'bar',
  },
  notification: {
    title: 'Message title',
    body: 'Message body',
    imageUrl: 'https://example.com/image.png',
  },
  android: {
    restrictedPackageName: 'com.google.firebase.testing',
    notification: {
      title: 'test.title',
      ticker: 'test.ticker',
      sticky: true,
      visibility: 'private',
      eventTimestamp: new Date(),
      localOnly: true,
      priority: 'high',
      vibrateTimingsMillis: [100, 50, 250],
      defaultVibrateTimings: false,
      defaultSound: true,
      lightSettings: {
        color: '#AABBCC55',
        lightOnDurationMillis: 200,
        lightOffDurationMillis: 300,
      },
      defaultLightSettings: false,
      notificationCount: 1,
    },
  },
  apns: {
    payload: {
      aps: {
        alert: {
          title: 'Message title',
          body: 'Message body',
        },
      },
    },
  },
  topic: 'foo-bar',
};

const payload = {
  data: {
    foo: 'bar',
  },
  notification: {
    title: 'Message title',
    body: 'Message body',
  },
};

const invalidPayload: any = {
  foo: 'bar',
};

const options = {
  timeToLive: 60,
};

describe('admin.messaging', () => {
  it('send(message, dryRun) returns a message ID', () => {
    return admin.messaging().send(message, true)
      .then((name) => {
        expect(name).matches(/^projects\/.*\/messages\/.*$/);
      });
  });

  it('sendAll()', () => {
    const messages: admin.messaging.Message[] = [message, message, message];
    return admin.messaging().sendAll(messages, true)
      .then((response) => {
        expect(response.responses.length).to.equal(messages.length);
        expect(response.successCount).to.equal(messages.length);
        expect(response.failureCount).to.equal(0);
        response.responses.forEach((resp) => {
          expect(resp.success).to.be.true;
          expect(resp.messageId).matches(/^projects\/.*\/messages\/.*$/);
        });
      });
  });

  it('sendAll(500)', () => {
    const messages: admin.messaging.Message[] = [];
    for (let i = 0; i < 500; i++) {
      messages.push({ topic: `foo-bar-${i % 10}` });
    }
    return admin.messaging().sendAll(messages, true)
      .then((response) => {
        expect(response.responses.length).to.equal(messages.length);
        expect(response.successCount).to.equal(messages.length);
        expect(response.failureCount).to.equal(0);
        response.responses.forEach((resp) => {
          expect(resp.success).to.be.true;
          expect(resp.messageId).matches(/^projects\/.*\/messages\/.*$/);
        });
      });
  });

  it('sendMulticast()', () => {
    const multicastMessage: admin.messaging.MulticastMessage = {
      data: message.data,
      android: message.android,
      tokens: ['not-a-token', 'also-not-a-token'],
    };
    return admin.messaging().sendMulticast(multicastMessage, true)
      .then((response) => {
        expect(response.responses.length).to.equal(2);
        expect(response.successCount).to.equal(0);
        expect(response.failureCount).to.equal(2);
        response.responses.forEach((resp) => {
          expect(resp.success).to.be.false;
          expect(resp.messageId).to.be.undefined;
          expect(resp.error).to.have.property('code', 'messaging/invalid-argument');
        });
      });
  });

  it('sendToDevice(token) returns a response with multicast ID', () => {
    return admin.messaging().sendToDevice(registrationToken, payload, options)
      .then((response) => {
        expect(typeof response.multicastId).to.equal('number');
      });
  });

  it('sendToDevice(token-list) returns a response with multicat ID', () => {
    return admin.messaging().sendToDevice(registrationTokens, payload, options)
      .then((response) => {
        expect(typeof response.multicastId).to.equal('number');
      });
  });

  it('sendToDeviceGroup() returns a response with success count', () => {
    return admin.messaging().sendToDeviceGroup(notificationKey, payload, options)
      .then((response) => {
        expect(typeof response.successCount).to.equal('number');
      });
  });

  it('sendToTopic() returns a response with message ID', () => {
    return admin.messaging().sendToTopic(topic, payload, options)
      .then((response) => {
        expect(typeof response.messageId).to.equal('number');
      });
  });

  it('sendToCondition() returns a response with message ID', () => {
    return admin.messaging().sendToCondition(condition, payload, options)
      .then((response) => {
        expect(typeof response.messageId).to.equal('number');
      });
  });

  it('sendToDevice(token) fails when called with invalid payload', () =>  {
    return admin.messaging().sendToDevice(registrationToken, invalidPayload, options)
      .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
  });

  it('sendToDevice(token-list) fails when called with invalid payload', () =>  {
    return admin.messaging().sendToDevice(registrationTokens, invalidPayload, options)
      .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
  });

  it('sendToDeviceGroup() fails when called with invalid payload', () =>  {
    return admin.messaging().sendToDeviceGroup(notificationKey, invalidPayload, options)
      .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
  });

  it('sendToTopic() fails when called with invalid payload', () =>  {
    return admin.messaging().sendToTopic(topic, invalidPayload, options)
      .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
  });

  it('sendToCondition() fails when called with invalid payload', () =>  {
    return admin.messaging().sendToCondition(condition, invalidPayload, options)
      .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-payload');
  });

  it('subscribeToTopic() returns a response with success count', () => {
    return admin.messaging().subscribeToTopic(registrationToken, topic)
      .then((response) => {
        expect(typeof response.successCount).to.equal('number');
      });
  });

  it('unsubscribeFromTopic() returns a response with success count', () => {
    return admin.messaging().unsubscribeFromTopic(registrationToken, topic)
      .then((response) => {
        expect(typeof response.successCount).to.equal('number');
      });
  });

  it('subscribeToTopic() fails when called with invalid topic', () => {
    return admin.messaging().subscribeToTopic(registrationToken, invalidTopic)
      .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-argument');
  });

  it('unsubscribeFromTopic() fails when called with invalid topic', () => {
    return admin.messaging().unsubscribeFromTopic(registrationToken, invalidTopic)
      .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-argument');
  });
});
