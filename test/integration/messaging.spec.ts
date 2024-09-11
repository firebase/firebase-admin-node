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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Message, MulticastMessage, getMessaging } from '../../lib/messaging/index';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

// The registration token have the proper format, but are not guaranteed to
// work. The intention of these integration tests is that the endpoints returns the proper payload,
// but it is hard to ensure these tokens will always be valid. The tests below should still pass
// even if they are rotated or invalid.
const registrationToken = 'fGw0qy4TGgk:APA91bGtWGjuhp4WRhHXgbabIYp1jxEKI08ofj_v1bKhWAGJQ4e3arRCW' +
  'zeTfHaLz83mBnDh0aPWB1AykXAVUUGl2h1wT4XI6XazWpvY7RBUSYfoxtqSWGIm2nvWh2BOP1YG501SsRoE';

const topic = 'mock-topic';

const invalidTopic = 'topic-$%#^';

const message: Message = {
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

describe('admin.messaging', () => {
  it('send(message, dryRun) returns a message ID', () => {
    return getMessaging().send(message, true)
      .then((name) => {
        expect(name).matches(/^projects\/.*\/messages\/.*$/);
      });
  });

  it('sendEach()', () => {
    const messages: Message[] = [message, message, message];
    return getMessaging().sendEach(messages, true)
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

  it('sendEach(500)', () => {
    const messages: Message[] = [];
    for (let i = 0; i < 500; i++) {
      messages.push({ topic: `foo-bar-${i % 10}` });
    }
    return getMessaging().sendEach(messages, true)
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

  it('sendEachForMulticast()', () => {
    const multicastMessage: MulticastMessage = {
      data: message.data,
      android: message.android,
      tokens: ['not-a-token', 'also-not-a-token'],
    };
    return getMessaging().sendEachForMulticast(multicastMessage, true)
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

  it('subscribeToTopic() returns a response with success count', () => {
    return getMessaging().subscribeToTopic(registrationToken, topic)
      .then((response) => {
        expect(typeof response.successCount).to.equal('number');
      });
  });

  it('unsubscribeFromTopic() returns a response with success count', () => {
    return getMessaging().unsubscribeFromTopic(registrationToken, topic)
      .then((response) => {
        expect(typeof response.successCount).to.equal('number');
      });
  });

  it('subscribeToTopic() fails when called with invalid topic', () => {
    return getMessaging().subscribeToTopic(registrationToken, invalidTopic)
      .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-argument');
  });

  it('unsubscribeFromTopic() fails when called with invalid topic', () => {
    return getMessaging().unsubscribeFromTopic(registrationToken, invalidTopic)
      .should.eventually.be.rejected.and.have.property('code', 'messaging/invalid-argument');
  });
});
