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

import { PrefixedFirebaseError } from '../utils/error';
import { CloudEvent } from './cloudevent';
import * as validator from '../utils/validator';

// List of CloudEvent properties that are handled "by hand" and should be skipped by
// automatic attribute copy.
const TOP_LEVEL_CE_ATTRS: string[] =
    ['id', 'type', 'specversion', 'source', 'data', 'time', 'datacontenttype', 'subject'];

export type EventarcErrorCode = 'unknown-error' | 'invalid-argument'

/**
 * Firebase Eventarc error code structure. This extends PrefixedFirebaseError.
 *
 * @param code - The error code.
 * @param message - The error message.
 * @constructor
 */
export class FirebaseEventarcError extends PrefixedFirebaseError {
  constructor(code: EventarcErrorCode, message: string) {
    super('eventarc', code, message);
  }
}

export function toCloudEventProtoFormat(ce: CloudEvent): any {
  const source = ce.source ?? process.env.EVENTARC_CLOUD_EVENT_SOURCE;
  if (typeof source === 'undefined' || !validator.isNonEmptyString(source)) {
    throw new FirebaseEventarcError('invalid-argument', "CloudEvent 'source' is required.");
  }
  if (!validator.isNonEmptyString(ce.type)) {
    throw new FirebaseEventarcError('invalid-argument', "CloudEvent 'type' is required.");
  }
  const out: Record<string, any> = {
    '@type': 'type.googleapis.com/io.cloudevents.v1.CloudEvent',
    'id': ce.id ?? crypto.randomUUID(),
    'type': ce.type,
    'specVersion': ce.specversion ?? '1.0',
    'source': source
  }

  if (typeof ce.time !== 'undefined')  {
    if (!validator.isISODateString(ce.time)) {
      throw new FirebaseEventarcError(
        'invalid-argument', "CloudEvent 'tyme' must be in ISO date format.");
    }
    setAttribute(out, 'time', {
      'ceTimestamp': ce.time
    });
  } else {
    setAttribute(out, 'time', {
      'ceTimestamp': new Date().toISOString()
    });
  }
  if (typeof ce.datacontenttype !== 'undefined') {
    if (!validator.isNonEmptyString(ce.datacontenttype)) {
      throw new FirebaseEventarcError(
        'invalid-argument',
        "CloudEvent 'datacontenttype' if specified must be non-empty string.");
    }
    setAttribute(out, 'datacontenttype', {
      'ceString': ce.datacontenttype
    });
  }
  if (ce.subject) {
    if (!validator.isNonEmptyString(ce.subject)) {
      throw new FirebaseEventarcError(
        'invalid-argument',
        "CloudEvent 'subject' if specified must be non-empty string.");
    }
    setAttribute(out, 'subject', {
      'ceString': ce.subject
    });
  }

  if (typeof ce.data === 'undefined') {
    throw new FirebaseEventarcError('invalid-argument', "CloudEvent 'data' is required.");
  }
  if (validator.isObject(ce.data)) {
    out['textData'] = JSON.stringify(ce.data);
    if (!ce.datacontenttype) {
      setAttribute(out, 'datacontenttype', {
        'ceString': 'application/json'
      });
    }
  } else if (validator.isNonEmptyString(ce.data)) {
    out['textData'] = ce.data;
    if (!ce.datacontenttype) {
      setAttribute(out, 'datacontenttype', {
        'ceString': 'text/plain'
      });
    }
  } else {
    throw new FirebaseEventarcError(
      'invalid-argument',
      `CloudEvent 'data' must be string or an object (which are converted to JSON), got '${typeof ce.data}'.`);
  }

  for (const attr in ce) {
    if (TOP_LEVEL_CE_ATTRS.includes(attr)) {
      continue;
    }
    if (!validator.isNonEmptyString(ce[attr])) {
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
  if (!Object.prototype.hasOwnProperty.call(event, 'attributes')) {
    event.attributes = {};
  }
  event['attributes'][attr] = value;
}
