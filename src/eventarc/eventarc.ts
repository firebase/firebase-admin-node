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
import {
  HttpRequestConfig, HttpClient, HttpError, AuthorizedHttpClient
} from '../utils/api-request';
import { FirebaseApp } from '../app/firebase-app';
import * as utils from '../utils';
import { PrefixedFirebaseError } from '../utils/error';
import { toCloudEventProtoFormat } from './eventarc-utils';
import { CloudEvent } from './cloudevent';

const EVENTARC_API = 'https://eventarcpublishing.googleapis.com/v1';
const FIREBASE_VERSION_HEADER = {
  'X-Firebase-Client': `fire-admin-node/${utils.getSdkVersion()}`,
};
const CHANNEL_NAME_REGEX = /^(projects\/([^/]+)\/)?locations\/([^/]+)\/channels\/([^/]+)$/;
const DEFAULT_CHANNEL_REGION = 'us-central1';

/**
 * Channel options interface.
 */
export interface ChannelOptions {
  /**
   * An array of allowed event types. If specified, publishing events of
   * unknown types will be a no op. When not provided, no even filtering is
   * performed.
   */
  allowedEventsTypes?: string[] | undefined
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
   * Creates a reference to Eventarc default Firebase channel which can then
   * be used to publish events:
   * `projects/{project}/locations/us-central1/channels/firebase`
   * 
   * @param options - (optional) additional channel options
   * @returns Eventarc channel reference for publishing events.
   */
  public channel(options?: ChannelOptions): Channel;
  

  /**
   * Creates a reference to Eventarc channel using provided channel resource name.
   * The channel resource name Can be either:
   *   * fully qualified channel resource name:
   *     `projects/{project}/locations/{location}/channels/{channel-id}`
   *   * partial resource name with location and channel id, in which case
   *     the runtime project ID of the function will be used:
   *     `locations/{location}/channels/{channel-id}`
   *   * partial channel-id, in which case the runtime project ID of the
   *     function and `us-central1` as location will be used:
   *     `{channel-id}`
   * 
   * @param name - Channel resource name. 
   * @param options - (optional) additional channel options
   * @returns Eventarc channel reference for publishing events.
   */
  public channel(name: string, options?: ChannelOptions): Channel;

  /**
   * Create a reference to a default Firebase channel:
   * `locations/us-central1/channels/firebase`
   *
   * @param options - (optional) additional channel options
   * @returns Eventarc channel reference for publishing events.
   */
  public channel(options?: ChannelOptions): Channel;
 
  public channel(nameOrOptions?: string | ChannelOptions, options?: ChannelOptions): Channel {
    if (typeof nameOrOptions === 'string') {
      return new Channel(this, nameOrOptions as string, options?.allowedEventsTypes);
    }
    return new Channel(
      this,
      'locations/us-central1/channels/firebase',
      nameOrOptions?.allowedEventsTypes);
  }
}

/**
 * Eventarc Channel.
 */
export class Channel {
  private readonly eventarcInternal: Eventarc;
  public nameInternal: string;
  public readonly allowedEventsTypes?: string[]
  private readonly httpClient: HttpClient;
  private readonly resolvedChannelName: Promise<string>;

  /**
   * @internal
   */
  constructor(eventarc: Eventarc, name: string, allowedEventsTypes?: string[]) {
    if (!validator.isNonNullObject(eventarc)) {
      throw new FirebaseEventarcError(
        'invalid-argument',
        'First argument passed to Channel() must be a valid Eventarc service instance.',
      );
    }
    if (!name) {
      throw new FirebaseEventarcError(
        'invalid-argument', 'name is required.',
      );
    }

    this.nameInternal = name;
    this.eventarcInternal = eventarc;
    this.allowedEventsTypes = allowedEventsTypes;
    this.httpClient = new AuthorizedHttpClient(eventarc.app as FirebaseApp);
    
    this.resolvedChannelName = this.resolveChannelName(name);
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

  get name(): string {
    return this.nameInternal;
  }

  /**
   * Publishes provided events to this channel. If channel was created with
   * `allowedEventsTypes` and event type is not on that list, the event will
   * be ignored.
   * 
   * The following CloudEvent fields will be auto-populated if not set:
   *  * specversion - `1.0`
   *  * id - uuidv4()
   *  * source - will be populated with `process.env.EVENTARC_CLOUD_EVENT_SOURCE` and 
   *             if not set an error will be thrown.
   *  
   * @param events - CloudEvent to publish to the channel.
   */
  public async publish(events: CloudEvent | CloudEvent[]): Promise<void> {
    if (!Array.isArray(events)) {
      events = [events as CloudEvent];
    }
    return this.publishToEventarcApi(
      await this.resolvedChannelName,
      events
        .filter(e => typeof this.allowedEventsTypes === 'undefined' || this.allowedEventsTypes.includes(e.type))
        .map(toCloudEventProtoFormat));
  }

  private async publishToEventarcApi(channel:string, events: CloudEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }
    const request: HttpRequestConfig = {
      method: 'POST',
      url: `${EVENTARC_API}/${channel}:publishEvents`,
      data: JSON.stringify({ events }),
    };
    return this.sendRequest<void>(request);
  }

  private sendRequest<T>(request: HttpRequestConfig): Promise<T> {
    request.headers = FIREBASE_VERSION_HEADER;
    return this.httpClient.send(request)
      .then((resp) => {
        return resp.data as T;
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  private toFirebaseError(err: HttpError): PrefixedFirebaseError {
    if (err instanceof PrefixedFirebaseError) {
      return err;
    }

    const response = err.response;
    if (!response.isJson()) {
      return new PrefixedFirebaseError(
        'eventarc',
        '' + response.status,
        `Unexpected response with status: ${response.status} and body: ${response.text}`);
    }

    return new PrefixedFirebaseError(
      'eventarc', 
      'unknown-error',
      `Unexpected response with status: ${response.status} and body: ${response.text}`);
  }

  private resolveChannelName(name: string): Promise<string> {
    if (!name.includes('/')) {
      const location = DEFAULT_CHANNEL_REGION;
      const channelId = name;
      return this.resolveChannelNameProjectId(location, channelId);
    } else {
      const match = CHANNEL_NAME_REGEX.exec(name);
      if (match === null) {
        throw new FirebaseEventarcError('invalid-argument', 'Invalid channel name format.');
      }
      const projectId = match[2];
      const location = match[3];
      const channelId = match[4];
      if (projectId) {
        return Promise.resolve('projects/' + projectId + '/locations/' + location + '/channels/' + channelId);
      } else {
        return this.resolveChannelNameProjectId(location, channelId);
      }
    }
  }
  
  private async resolveChannelNameProjectId(location: string, channelId: string): Promise<string> {
    const projectId = await utils.findProjectId(this.eventarc.app);
    if (!projectId) {
      throw new FirebaseEventarcError('invalid-argument', 'Unable to resolve project id.');
    }
    return 'projects/' + projectId + '/locations/' + location + '/channels/' + channelId;
  }
}
