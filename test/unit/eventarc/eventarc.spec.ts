/*!
 * @license
 * Copyright 2021 Google Inc.
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

import * as sinon from 'sinon';
import { Eventarc, Channel } from '../../../src/eventarc/eventarc';
import { toCloudEventProtoFormat } from '../../../src/eventarc/eventarc-utils';
import { CloudEvent } from '../../../src/eventarc/cloudevent';
import { HttpClient } from '../../../src/utils/api-request';
import { FirebaseApp } from '../../../src/app/firebase-app';
import * as mocks from '../../resources/mocks';
import * as utils from '../utils';
import * as chai from 'chai';
import chaiExclude from 'chai-exclude';
import { getSdkVersion } from '../../../src/utils/index';

const expect = chai.expect;
chai.use(chaiExclude);


const TEST_EVENT1 : CloudEvent = {
  type: 'some.custom.event1',
  specversion: '1.0',
  id: 'user-provided-id-1',
  data: 'hello world',
  source: '/my/functions',
  time: '2011-11-11T11:11:11.111Z',
};
const TEST_EVENT1_SERIALIZED = JSON.stringify(toCloudEventProtoFormat(TEST_EVENT1));

const TEST_EVENT2 : CloudEvent = {
  type: 'some.custom.event2',
  specversion: '1.0',
  id: 'user-provided-id-2',
  data: 'hello world',
  source: '/my/functions',
  time: '2011-11-11T11:11:11.111Z',
};
const TEST_EVENT2_SERIALIZED = JSON.stringify(toCloudEventProtoFormat(TEST_EVENT2));

describe('eventarc', () => {
  let mockApp: FirebaseApp;

  before(() => {
    mockApp = mocks.app();
  });

  after(() => {
    sinon.restore();
  });

  afterEach(() => {
    delete process.env.EVENTARC_CLOUD_EVENT_SOURCE;
  });

  describe('Eventarc', () => {
    it('inintializes Eventarc object', () => {
      const eventarc = new Eventarc(mockApp);
      expect(eventarc.app).eq(mockApp);
    });
  });

  it('throws invalid argument with creating channel with invalid name', () => {
    expect(() => new Eventarc(mockApp).channel('foo/bar'))
      .throws('Invalid channel name format.');
    expect(() => new Eventarc(mockApp).channel('foo/bar/baz'))
      .throws('Invalid channel name format.');
    expect(() => new Eventarc(mockApp).channel('channels/foo'))
      .throws('Invalid channel name format.');
    expect(() => new Eventarc(mockApp).channel('us-central1/channels/foo'))
      .throws('Invalid channel name format.');
    expect(() => new Eventarc(mockApp).channel('projectid/locations/us-central1/channels/foo'))
      .throws('Invalid channel name format.');
    expect(() => new Eventarc(mockApp).channel('v1/projects/projectid/locations/us-central1/channels/foo'))
      .throws('Invalid channel name format.');
    expect(() => new Eventarc(mockApp).channel('projects/projectid/channels/foo'))
      .throws('Invalid channel name format.');
    expect(() => new Eventarc(mockApp).channel('projects/projectid/locations/us-central1'))
      .throws('Invalid channel name format.');
    expect(() => new Eventarc(mockApp).channel('projects/projectid/locations_us-central1/channels/foo'))
      .throws('Invalid channel name format.');
  });

  describe('default Channel', () => {
    let eventarc : Eventarc;
    let channel : Channel;
    let mockAccessToken: string;
    let httpStub: sinon.SinonStub; 
    let accessTokenStub: sinon.SinonStub; 

    before(() => {
      eventarc = new Eventarc(mockApp);
      channel = eventarc.channel();
      mockAccessToken = utils.generateRandomAccessToken();
      accessTokenStub = utils.stubGetAccessToken(mockAccessToken);
    });

    after(() => {
      accessTokenStub?.restore();
    });

    afterEach(() => {
      httpStub?.restore();
    });

    it('inintializes Channel object', () => {
      expect(channel.eventarc).eq(eventarc);
      expect(channel.name).eq('locations/us-central1/channels/firebase');
      expect(channel.allowedEventsTypes).is.undefined;
    });

    it('publishes single event to the API', async () => {
      httpStub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));

      await channel.publish(TEST_EVENT1);

      expect(httpStub).to.have.been.calledOnce.and.calledWith({
        method: 'POST',
        url: 'https://eventarcpublishing.googleapis.com/v1/projects/project_id/locations/us-central1/channels/firebase:publishEvents',
        data: `{"events":[${TEST_EVENT1_SERIALIZED}]}`,
        headers: {
          'X-Firebase-Client': 'fire-admin-node/' + getSdkVersion(),
          Authorization: 'Bearer ' + mockAccessToken
        }
      });
    });

    it('publishes multiple events to the API', async () => {
      httpStub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));

      await channel.publish([TEST_EVENT1, TEST_EVENT2]);

      expect(httpStub).to.have.been.calledOnce.and.calledWith({
        method: 'POST',
        url: 'https://eventarcpublishing.googleapis.com/v1/projects/project_id/locations/us-central1/channels/firebase:publishEvents',
        data: `{"events":[${TEST_EVENT1_SERIALIZED},${TEST_EVENT2_SERIALIZED}]}`,
        headers: {
          'X-Firebase-Client': 'fire-admin-node/' + getSdkVersion(),
          Authorization: 'Bearer ' + mockAccessToken
        }
      });
    });
  });

  describe('full resource name Channel', () => {
    let eventarc : Eventarc;
    let channel : Channel;
    let mockAccessToken: string;
    let httpStub: sinon.SinonStub; 
    let accessTokenStub: sinon.SinonStub; 

    before(() => {
      eventarc = new Eventarc(mockApp);
      channel = eventarc.channel('projects/other-project-id/locations/us-west1/channels/my-channel2');
      mockAccessToken = utils.generateRandomAccessToken();
      accessTokenStub = utils.stubGetAccessToken(mockAccessToken);
    });

    after(() => {
      accessTokenStub?.restore();
    });

    afterEach(() => {
      httpStub?.restore();
    });

    it('inintializes Channel object', () => {
      expect(channel.eventarc).eq(eventarc);
      expect(channel.name).eq('projects/other-project-id/locations/us-west1/channels/my-channel2');
      expect(channel.allowedEventsTypes).is.undefined;
    });

    it('publishes single event to the API', async () => {
      httpStub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));

      await channel.publish(TEST_EVENT1);

      expect(httpStub).to.have.been.calledOnce.and.calledWith({
        method: 'POST',
        url: 'https://eventarcpublishing.googleapis.com/v1/projects/other-project-id/locations/us-west1/channels/my-channel2:publishEvents',
        data: `{"events":[${TEST_EVENT1_SERIALIZED}]}`,
        headers: {
          'X-Firebase-Client': 'fire-admin-node/' + getSdkVersion(),
          Authorization: 'Bearer ' + mockAccessToken
        }
      });
    });

    it('publishes multiple events to the API', async () => {
      httpStub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));

      await channel.publish([TEST_EVENT1, TEST_EVENT2]);

      expect(httpStub).to.have.been.calledOnce.and.calledWith({
        method: 'POST',
        url: 'https://eventarcpublishing.googleapis.com/v1/projects/other-project-id/locations/us-west1/channels/my-channel2:publishEvents',
        data: `{"events":[${TEST_EVENT1_SERIALIZED},${TEST_EVENT2_SERIALIZED}]}`,
        headers: {
          'X-Firebase-Client': 'fire-admin-node/' + getSdkVersion(),
          Authorization: 'Bearer ' + mockAccessToken
        }
      });
    });
  });

  describe('partial (no project) Channel', () => {
    let eventarc : Eventarc;
    let channel : Channel;
    let mockAccessToken: string;
    let httpStub: sinon.SinonStub;
    let accessTokenStub: sinon.SinonStub; 

    before(() => {
      eventarc = new Eventarc(mockApp);
      channel = eventarc.channel('locations/us-west1/channels/my-channel');
      mockAccessToken = utils.generateRandomAccessToken();
      accessTokenStub = utils.stubGetAccessToken(mockAccessToken);
    });

    after(() => {
      accessTokenStub?.restore();
    });

    afterEach(() => {
      httpStub?.restore();
    });

    it('inintializes Channel object', () => {
      expect(channel.eventarc).eq(eventarc);
      expect(channel.name).eq('locations/us-west1/channels/my-channel');
      expect(channel.allowedEventsTypes).is.undefined;
    });

    it('publishes single event to the API', async () => {
      httpStub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));

      await channel.publish(TEST_EVENT1);

      expect(httpStub).to.have.been.calledOnce.and.calledWith({
        method: 'POST',
        url: 'https://eventarcpublishing.googleapis.com/v1/projects/project_id/locations/us-west1/channels/my-channel:publishEvents',
        data: `{"events":[${TEST_EVENT1_SERIALIZED}]}`,
        headers: {
          'X-Firebase-Client': 'fire-admin-node/' + getSdkVersion(),
          Authorization: 'Bearer ' + mockAccessToken
        }
      });
    });

    it('publishes multiple events to the API', async () => {
      httpStub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));

      await channel.publish([TEST_EVENT1, TEST_EVENT2]);

      expect(httpStub).to.have.been.calledOnce.and.calledWith({
        method: 'POST',
        url: 'https://eventarcpublishing.googleapis.com/v1/projects/project_id/locations/us-west1/channels/my-channel:publishEvents',
        data: `{"events":[${TEST_EVENT1_SERIALIZED},${TEST_EVENT2_SERIALIZED}]}`,
        headers: {
          'X-Firebase-Client': 'fire-admin-node/' + getSdkVersion(),
          Authorization: 'Bearer ' + mockAccessToken
        }
      });
    });
  });

  describe('partial (channel id only) Channel', () => {
    let eventarc : Eventarc;
    let channel : Channel;
    let mockAccessToken: string;
    let httpStub: sinon.SinonStub;
    let accessTokenStub: sinon.SinonStub; 

    before(() => {
      eventarc = new Eventarc(mockApp);
      channel = eventarc.channel('my-channel');
      mockAccessToken = utils.generateRandomAccessToken();
      accessTokenStub = utils.stubGetAccessToken(mockAccessToken);
    });

    after(() => {
      accessTokenStub?.restore();
    });

    afterEach(() => {
      httpStub?.restore();
    });

    it('inintializes Channel object', () => {
      expect(channel.eventarc).eq(eventarc);
      expect(channel.name).eq('my-channel');
      expect(channel.allowedEventsTypes).is.undefined;
    });

    it('publishes single event to the API', async () => {
      httpStub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));

      await channel.publish(TEST_EVENT1);

      expect(httpStub).to.have.been.calledOnce.and.calledWith({
        method: 'POST',
        url: 'https://eventarcpublishing.googleapis.com/v1/projects/project_id/locations/us-central1/channels/my-channel:publishEvents',
        data: `{"events":[${TEST_EVENT1_SERIALIZED}]}`,
        headers: {
          'X-Firebase-Client': 'fire-admin-node/' + getSdkVersion(),
          Authorization: 'Bearer ' + mockAccessToken
        }
      });
    });

    it('publishes multiple events to the API', async () => {
      httpStub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));

      await channel.publish([TEST_EVENT1, TEST_EVENT2]);

      expect(httpStub).to.have.been.calledOnce.and.calledWith({
        method: 'POST',
        url: 'https://eventarcpublishing.googleapis.com/v1/projects/project_id/locations/us-central1/channels/my-channel:publishEvents',
        data: `{"events":[${TEST_EVENT1_SERIALIZED},${TEST_EVENT2_SERIALIZED}]}`,
        headers: {
          'X-Firebase-Client': 'fire-admin-node/' + getSdkVersion(),
          Authorization: 'Bearer ' + mockAccessToken
        }
      });
    });
  });

  describe('Channel with empty allowed events', () => {
    let eventarc : Eventarc;
    let channel : Channel;
    let mockAccessToken: string;
    let httpStub: sinon.SinonStub;
    let accessTokenStub: sinon.SinonStub; 

    before(() => {
      eventarc = new Eventarc(mockApp);
      channel = eventarc.channel({ allowedEventsTypes: [] });
      mockAccessToken = utils.generateRandomAccessToken();
      accessTokenStub = utils.stubGetAccessToken(mockAccessToken);
    });

    after(() => {
      accessTokenStub?.restore();
    });

    afterEach(() => {
      httpStub?.restore();
    });

    it('inintializes Channel object', () => {
      expect(channel.eventarc).eq(eventarc);
      expect(channel.allowedEventsTypes).is.empty;
    });

    it('filters out event and publishes none', async () => {
      httpStub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));

      await channel.publish(TEST_EVENT1);

      expect(httpStub).to.not.have.been.called;
    });

    it('filters out all event and publishes none', async () => {
      httpStub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));

      await channel.publish([TEST_EVENT1, TEST_EVENT2]);

      expect(httpStub).to.not.have.been.called;
    });
  });

  describe('Channel with allowed events', () => {
    let eventarc : Eventarc;
    let channel : Channel;
    let mockAccessToken: string;
    let httpStub: sinon.SinonStub;
    let accessTokenStub: sinon.SinonStub; 

    before(() => {
      eventarc = new Eventarc(mockApp);
      channel = eventarc.channel({ allowedEventsTypes: ['some.custom.event1'] });
      mockAccessToken = utils.generateRandomAccessToken();
      accessTokenStub = utils.stubGetAccessToken(mockAccessToken);
    });

    after(() => {
      accessTokenStub?.restore();
    });

    afterEach(() => {
      httpStub?.restore();
    });

    it('inintializes Channel object', () => {
      expect(channel.eventarc).eq(eventarc);
      expect(channel.allowedEventsTypes).deep.eq(['some.custom.event1']);
    });

    it('publishes events with allowed type', async () => {
      httpStub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));

      await channel.publish(TEST_EVENT1);

      expect(httpStub).to.have.been.calledOnce.and.calledWith({
        method: 'POST',
        url: 'https://eventarcpublishing.googleapis.com/v1/projects/project_id/locations/us-central1/channels/firebase:publishEvents',
        data: `{"events":[${TEST_EVENT1_SERIALIZED}]}`,
        headers: {
          'X-Firebase-Client': 'fire-admin-node/' + getSdkVersion(),
          Authorization: 'Bearer ' + mockAccessToken
        }
      });
    });

    it('publishes events with allowed type and filters out others', async () => {
      httpStub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));

      await channel.publish([TEST_EVENT1, TEST_EVENT2]);

      expect(httpStub).to.have.been.calledOnce.and.calledWith({
        method: 'POST',
        url: 'https://eventarcpublishing.googleapis.com/v1/projects/project_id/locations/us-central1/channels/firebase:publishEvents',
        data: `{"events":[${TEST_EVENT1_SERIALIZED}]}`,
        headers: {
          'X-Firebase-Client': 'fire-admin-node/' + getSdkVersion(),
          Authorization: 'Bearer ' + mockAccessToken
        }
      });
    });
  });
});
