/*!
 * @license
 * Copyright 2022 Google Inc.
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
import * as utils from '../../../src/eventarc/eventarc-utils';
import * as chai from 'chai';
import chaiExclude from 'chai-exclude';

const expect = chai.expect;
chai.use(chaiExclude);

describe('eventarc-utils', () => {
  before(() => {
    sinon
      .stub(Date.prototype, 'toISOString')
      .returns('2022-03-16T20:20:42.212Z');
  });

  after(() => {
    sinon.restore();
  });

  afterEach(() => {
    delete process.env.EVENTARC_CLOUD_EVENT_SOURCE;
  });

  describe('toCloudEventProtoFormat', () => {
    it('converts cloud event to proto format', () => {
      expect(utils.toCloudEventProtoFormat({
        type: 'some.custom.event',
        specversion: '1.0',
        subject: 'context',
        datacontenttype: 'application/json',
        id: 'user-provided-id',
        data: {
          hello: 'world'
        },
        source: '/my/functions',
        time: new Date().toISOString(),
        customattr: 'custom value',
      })).to.deep.eq({
        '@type': 'type.googleapis.com/io.cloudevents.v1.CloudEvent',
        'attributes': {
          'customattr': {
            'ceString': 'custom value'
          },
          'datacontenttype': {
            'ceString': 'application/json'
          },
          'time': {
            'ceTimestamp': '2022-03-16T20:20:42.212Z'
          },
          'subject': {
            'ceString': 'context'
          }
        },
        'id': 'user-provided-id',
        'source': '/my/functions',
        'specVersion': '1.0',
        'textData': '{"hello":"world"}',
        'type': 'some.custom.event',
      });
    });

    it('populates specversion if not provided', () => {
      const got = utils.toCloudEventProtoFormat({
        type: 'some.custom.event',
        datacontenttype: 'application/json',
        data: {
          hello: 'world'
        },
        source: '/my/functions',
        time: new Date().toISOString(),
      });
      expect(got['specVersion']).to.eq('1.0');
    });

    it('populates time if not provided', () => {
      const got = utils.toCloudEventProtoFormat({
        specversion: '1.0',
        type: 'some.custom.event',
        datacontenttype: 'application/json',
        data: {
          hello: 'world'
        },
        source: '/my/functions',
      });
      expect(got['attributes']['time']).to.deep.eq({
        'ceTimestamp': '2022-03-16T20:20:42.212Z'
      });
    });

    it('populates id if not provided', () => {
      const got = utils.toCloudEventProtoFormat({
        type: 'some.custom.event',
        id: 'user-provided-id',
        datacontenttype: 'application/json',
        data: {
          hello: 'world'
        },
        source: '/my/functions',
        time: new Date().toISOString(),
      });
      // Couldn't figure out how to stub uuid, so just checking for presense.
      expect(got).to.haveOwnProperty('id');
    });

    it('populates source from EVENTARC_CLOUD_EVENT_SOURCE env var if not set', () => {
      process.env.EVENTARC_CLOUD_EVENT_SOURCE = '//source/from/env/var';
      const got = utils.toCloudEventProtoFormat({
        specversion: '1.0',
        type: 'some.custom.event',
        datacontenttype: 'application/json',
        data: {
          hello: 'world'
        },
      });
      expect(got['source']).to.eq('//source/from/env/var');
    });

    it('throws invalid argument when source not set', () => {
      expect(() => utils.toCloudEventProtoFormat({
        type: 'some.custom.event',
        datacontenttype: 'application/json',
        data: {
          hello: 'world'
        },
        time: new Date().toISOString(),
      })).throws("CloudEvent 'source' is required.");
    });

    it('throws invalid argument when custom attr not string', () => {
      expect(() => utils.toCloudEventProtoFormat({
        type: 'some.custom.event',
        datacontenttype: 'application/json',
        data: {
          hello: 'world'
        },
        source: '/my/functions',
        time: new Date().toISOString(),
        customattr: 123,
      })).throws("CloudEvent extension attributes ('customattr') must be string");
    });

    it('populates converts object data to JSON and sets datacontenttype', () => {
      const got = utils.toCloudEventProtoFormat({
        type: 'some.custom.event',
        id: 'user-provided-id',
        data: {
          hello: 'world'
        },
        source: '/my/functions',
        time: new Date().toISOString(),
      });
      // Couldn't figure out how to stub uuid, so just checking for presense.
      expect(got['textData']).to.eq('{"hello":"world"}');
      expect(got['attributes']['datacontenttype']).to.deep.eq({
        'ceString': 'application/json'
      });
    });

    it('populates string data and sets datacontenttype', () => {
      const got = utils.toCloudEventProtoFormat({
        type: 'some.custom.event',
        id: 'user-provided-id',
        data: 'hello world',
        source: '/my/functions',
        time: new Date().toISOString(),
      });
      // Couldn't figure out how to stub uuid, so just checking for presense.
      expect(got['textData']).to.eq('hello world');
      expect(got['attributes']['datacontenttype']).to.deep.eq({
        'ceString': 'text/plain'
      });
    });
  });
});
