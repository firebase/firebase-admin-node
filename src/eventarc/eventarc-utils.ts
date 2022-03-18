/*!
 * Copyright 2020 Google Inc.
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

import { PrefixedFirebaseError } from '../utils/error';
import { CloudEvent } from './cloudevent';
import { v4 as uuid } from 'uuid';

const TOP_LEVEL_CE_ATTRS: string[] = 
    ['id', 'type', 'specversion', 'source', 'data', 'time', 'datacontenttype', 'subject'];

export type EventarcErrorCode = 'invalid-argument'

export class FirebaseEventarcError extends PrefixedFirebaseError {
  constructor(code: EventarcErrorCode, message: string) {
    super('eventarc', code, message);
  }
}

export function toCloudEventProtoFormat(ce: CloudEvent): any {
  const source = ce.source ?? process.env.EVENTARC_CLOUD_EVENT_SOURCE;
  if (!source) {
    throw new FirebaseEventarcError('invalid-argument', "CloudEvent 'source' is required.");
  }
  if (!ce.type) {
    throw new FirebaseEventarcError('invalid-argument', "CloudEvent 'type' is required.");
  }
  const out: Record<string, any> = {
    '@type': 'type.googleapis.com/io.cloudevents.v1.CloudEvent',
    'id': ce.id ?? uuid(),
    'type': ce.type,
    'specVersion': ce.specversion ?? '1.0',
    'source': source
  }

  if (ce.time) {
    setAttribute(out, 'time', {
      'ceTimestamp': ce.time
    });
  } else {
    setAttribute(out, 'time', {
      'ceTimestamp': new Date().toISOString()
    });
  }
  if (ce.datacontenttype) {
    setAttribute(out, 'datacontenttype', {
      'ceString': ce.datacontenttype
    });
  }
  if (!ce.data) {
    throw new FirebaseEventarcError('invalid-argument', "CloudEvent 'data' is required.");
  }
  if (ce.subject) {
    setAttribute(out, 'subject', {
      'ceString': ce.subject
    });
  }

  if (typeof ce.data === 'object') {
    out['textData'] = JSON.stringify(ce.data);
    if (!ce.datacontenttype) {
      setAttribute(out, 'datacontenttype', {
        'ceString': 'application/json'
      });
    }
  } else if (typeof ce.data === 'string') {
    out['textData'] = ce.data;
    if (!ce.datacontenttype) {
      setAttribute(out, 'datacontenttype', {
        'ceString': 'text/plain'
      });
    }
  } else {
    throw new FirebaseEventarcError(
      'invalid-argument', 
      `CloudEvent 'data' must be string or an object (which will be converted to JSON), got '${typeof ce.data}'.`);
  }

  for (const attr in ce) {
    if (TOP_LEVEL_CE_ATTRS.includes(attr)) {
      continue;
    }
    if (typeof ce[attr] !== 'string') {
      throw new FirebaseEventarcError(
        'invalid-argument',
        `CloudEvent extension attributes ('${attr}') must be string.`);
    }
    setAttribute(out, attr, {
      'ceString': ce[attr]
    });
  }

  return out;
}

function setAttribute(event: any, attr: string, value: any): void {
  if (!event['attributes']) {
    event['attributes'] = {}
  }
  event['attributes'][attr] = value;
}
