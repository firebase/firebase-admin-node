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

import { App } from '../app';
import * as validator from '../utils/validator';
import { FirebaseEventarcError } from './eventarc-utils';

/**
 * A CloudEvent version.
 */
export const enum CloudEventVersion {
  V1 = '1.0',
}

/**
 * A CloudEvent describes event data.
 * 
 * @see https://github.com/cloudevents/spec/blob/v1.0/spec.md
 */
export interface CloudEvent {
  specversion?: CloudEventVersion;
  type: string;
  source?: string;
  subject?: string;
  id?: string;
  datacontenttype?: string;
  dataschema?: string;
  time?: string;
  data?: any;

  // CloudEvent may have custom extensions.
  [propName: string]: any;
}

/**
 * Eventarc service bound to the provided app.
 */
export class Eventarc {

  private readonly appInternal: App;

  /**
   * @internal
   */
  constructor(app: App) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseEventarcError(
        'invalid-argument',
        'First argument passed to Eventarc() must be a valid Firebase app instance.',
      );
    }

    this.appInternal = app;
  }

  /**
   * The {@link firebase-admin.app#App} associated with the current `Eventarc` service
   * instance.
   *
   * @example
   * ```javascript
   * var app = eventarc.app;
   * ```
   */
  get app(): App {
    return this.appInternal;
  }

  /**
   * Creates a reference to Eventarc channel which can then be used to publish events.
   * 
   * @param channelId - ID of the channel.
   * @param allowedEventsTypes  - an array of allowed event types, unknown event types will be ignored.
   * @returns Eventarc channel reference for publishing events.
   */
  public channel(channelId: string, allowedEventsTypes?: [string]): Channel {
    return new Channel(this, channelId, allowedEventsTypes);
  }
}

/**
 * Eventarc Channel.
 */
export class Channel {
  private readonly eventarcInternal: Eventarc;
  public readonly channelId: string;
  public readonly allowedEventsTypes?: [string]

  /**
   * @internal
   */
  constructor(eventarc: Eventarc, channelId: string, allowedEventsTypes?: [string]) {
    if (!validator.isNonNullObject(eventarc)) {
      throw new FirebaseEventarcError(
        'invalid-argument',
        'First argument passed to Channel() must be a valid Eventarc service instance.',
      );
    }

    this.channelId = channelId;
    this.eventarcInternal = eventarc;
    this.allowedEventsTypes = allowedEventsTypes;
  }


  /**
   * The {@link firebase-admin.eventarc#Eventarc} service instance associated with the current `Channel`.
   *
   * @example
   * ```javascript
   * var app = channel.eventarc;
   * ```
   */
  get eventarc(): Eventarc {
    return this.eventarcInternal;
  }

  /**
   * Publishes provided event to this channel. If channel was created with `allowedEventsTypes` and
   * event type is not on that list, the event will be ignored.
   * 
   * @param event - CloudEvent to publish to the channel.
   */
  public async publish(event: CloudEvent): Promise<void> {
    if (this.allowedEventsTypes && !this.allowedEventsTypes.includes(event.type)) {
      return;
    }
    // call eventarc publishing API.
  }
}
