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

import {FirebaseApp} from '../firebase-app';
import {renameProperties} from '../utils/index';
import {deepCopy, deepExtend} from '../utils/deep-copy';
import {FirebaseMessagingRequestHandler} from './messaging-api-request';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {
  ErrorInfo, FirebaseError, FirebaseArrayIndexError, MessagingClientErrorCode, FirebaseMessagingError,
} from '../utils/error';

import * as utils from '../utils';
import * as validator from '../utils/validator';

// FCM endpoints
const FCM_SEND_HOST = 'fcm.googleapis.com';
const FCM_SEND_PATH = '/fcm/send';
const FCM_TOPIC_MANAGEMENT_HOST = 'iid.googleapis.com';
const FCM_TOPIC_MANAGEMENT_ADD_PATH = '/iid/v1:batchAdd';
const FCM_TOPIC_MANAGEMENT_REMOVE_PATH = '/iid/v1:batchRemove';


// Key renames for the messaging notification payload object.
const CAMELCASED_NOTIFICATION_PAYLOAD_KEYS_MAP = {
  bodyLocArgs: 'body_loc_args',
  bodyLocKey: 'body_loc_key',
  clickAction: 'click_action',
  titleLocArgs: 'title_loc_args',
  titleLocKey: 'title_loc_key',
};

// Key renames for the messaging options object.
const CAMELCASE_OPTIONS_KEYS_MAP = {
  dryRun: 'dry_run',
  timeToLive: 'time_to_live',
  collapseKey: 'collapse_key',
  mutableContent: 'mutable_content',
  contentAvailable: 'content_available',
  restrictedPackageName: 'restricted_package_name',
};

// Key renames for the MessagingDeviceResult object.
const MESSAGING_DEVICE_RESULT_KEYS_MAP = {
  message_id: 'messageId',
  registration_id: 'canonicalRegistrationToken',
};

// Key renames for the MessagingDevicesResponse object.
const MESSAGING_DEVICES_RESPONSE_KEYS_MAP = {
  canonical_ids: 'canonicalRegistrationTokenCount',
  failure: 'failureCount',
  success: 'successCount',
  multicast_id: 'multicastId',
};

// Key renames for the MessagingDeviceGroupResponse object.
const MESSAGING_DEVICE_GROUP_RESPONSE_KEYS_MAP = {
  success: 'successCount',
  failure: 'failureCount',
  failed_registration_ids: 'failedRegistrationTokens',
};

// Key renames for the MessagingTopicResponse object.
const MESSAGING_TOPIC_RESPONSE_KEYS_MAP = {
  message_id: 'messageId',
};

// Key renames for the MessagingConditionResponse object.
const MESSAGING_CONDITION_RESPONSE_KEYS_MAP = {
  message_id: 'messageId',
};

// Keys which are not allowed in the messaging data payload object.
export const BLACKLISTED_DATA_PAYLOAD_KEYS = ['from'];

// Keys which are not allowed in the messaging options object.
export const BLACKLISTED_OPTIONS_KEYS = [
  'condition', 'data', 'notification', 'registrationIds', 'registration_ids', 'to',
];

interface BaseMessage {
  data?: {[key: string]: string};
  notification?: Notification;
  android?: AndroidConfig;
  webpush?: WebpushConfig;
  apns?: ApnsConfig;
}

interface TokenMessage extends BaseMessage {
  token: string;
}

interface TopicMessage extends BaseMessage {
  topic: string;
}

interface ConditionMessage extends BaseMessage {
  condition: string;
}

/**
 * Payload for the admin.messaging.send() operation. The payload contains all the fields
 * in the BaseMessage type, and exactly one of token, topic or condition.
 */
export type Message = TokenMessage | TopicMessage | ConditionMessage;

export interface Notification {
  title?: string;
  body?: string;
}

export interface WebpushConfig {
  headers?: {[key: string]: string};
  data?: {[key: string]: string};
  notification?: WebpushNotification;
}

export interface WebpushNotification extends NotificationOptions {
  title?: string;
  [key: string]: any;
}

export interface ApnsConfig {
  headers?: {[key: string]: string};
  payload?: ApnsPayload;
}

export interface ApnsPayload {
  aps: Aps;
  [customData: string]: object;
}

export interface Aps {
  alert?: string | ApsAlert;
  badge?: number;
  sound?: string;
  contentAvailable?: boolean;
  category?: string;
  threadId?: string;
  mutableContent?: boolean;
  [customData: string]: any;
}

export interface ApsAlert {
  title?: string;
  body?: string;
  locKey?: string;
  locArgs?: string[];
  titleLocKey?: string;
  titleLocArgs?: string[];
  actionLocKey?: string;
  launchImage?: string;
}

export interface AndroidConfig {
  collapseKey?: string;
  priority?: ('high' | 'normal');
  ttl?: number;
  restrictedPackageName?: string;
  data?: {[key: string]: string};
  notification?: AndroidNotification;
}

export interface AndroidNotification {
  title?: string;
  body?: string;
  icon?: string;
  color?: string;
  sound?: string;
  tag?: string;
  clickAction?: string;
  bodyLocKey?: string;
  bodyLocArgs?: string[];
  titleLocKey?: string;
  titleLocArgs?: string[];
}

/**
 * Checks if the given object only contains strings as child values.
 *
 * @param {object} map An object to be validated.
 * @param {string} label A label to be included in the errors thrown.
 */
function validateStringMap(map: object, label: string) {
  if (typeof map === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(map)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, `${label} must be a non-null object`);
  }
  Object.keys(map).forEach((key) => {
    if (!validator.isString(map[key])) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD, `${label} must only contain string values`);
    }
  });
}

/**
 * Checks if the given WebpushConfig object is valid. The object must have valid headers and data.
 *
 * @param {WebpushConfig} config An object to be validated.
 */
function validateWebpushConfig(config: WebpushConfig) {
  if (typeof config === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(config)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'webpush must be a non-null object');
  }
  validateStringMap(config.headers, 'webpush.headers');
  validateStringMap(config.data, 'webpush.data');
}

/**
 * Checks if the given ApnsConfig object is valid. The object must have valid headers and a
 * payload.
 *
 * @param {ApnsConfig} config An object to be validated.
 */
function validateApnsConfig(config: ApnsConfig) {
  if (typeof config === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(config)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'apns must be a non-null object');
  }
  validateStringMap(config.headers, 'apns.headers');
  validateApnsPayload(config.payload);
}

/**
 * Checks if the given ApnsPayload object is valid. The object must have a valid aps value.
 *
 * @param {ApnsPayload} payload An object to be validated.
 */
function validateApnsPayload(payload: ApnsPayload) {
  if (typeof payload === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(payload)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'apns.payload must be a non-null object');
  }
  validateAps(payload.aps);
}

/**
 * Checks if the given Aps object is valid. The object must have a valid alert. If the validation
 * is successful, transforms the input object by renaming the keys to valid APNS payload keys.
 *
 * @param {Aps} aps An object to be validated.
 */
function validateAps(aps: Aps) {
  if (typeof aps === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(aps)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'apns.payload.aps must be a non-null object');
  }
  validateApsAlert(aps.alert);

  const propertyMappings = {
    contentAvailable: 'content-available',
    mutableContent: 'mutable-content',
    threadId: 'thread-id',
  };
  Object.keys(propertyMappings).forEach((key) => {
    if (key in aps && propertyMappings[key] in aps) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD, `Multiple specifications for ${key} in Aps`);
    }
  });
  renameProperties(aps, propertyMappings);

  const contentAvailable = aps['content-available'];
  if (typeof contentAvailable !== 'undefined' && contentAvailable !== 1) {
    if (contentAvailable === true) {
      aps['content-available'] = 1;
    } else {
      delete aps['content-available'];
    }
  }

  const mutableContent = aps['mutable-content'];
  if (typeof mutableContent !== 'undefined' && mutableContent !== 1) {
    if (mutableContent === true) {
      aps['mutable-content'] = 1;
    } else {
      delete aps['mutable-content'];
    }
  }
}

/**
 * Checks if the given alert object is valid. Alert could be a string or a complex object.
 * If specified as an object, it must have valid localization parameters. If successful, transforms
 * the input object by renaming the keys to valid APNS payload keys.
 *
 * @param {string | ApsAlert} alert An alert string or an object to be validated.
 */
function validateApsAlert(alert: string | ApsAlert) {
  if (typeof alert === 'undefined' || validator.isString(alert)) {
    return;
  } else if (!validator.isNonNullObject(alert)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'apns.payload.aps.alert must be a string or a non-null object');
  }

  const apsAlert: ApsAlert = alert as ApsAlert;
  if (validator.isNonEmptyArray(apsAlert.locArgs) &&
      !validator.isNonEmptyString(apsAlert.locKey)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'apns.payload.aps.alert.locKey is required when specifying locArgs');
  }
  if (validator.isNonEmptyArray(apsAlert.titleLocArgs) &&
      !validator.isNonEmptyString(apsAlert.titleLocKey)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'apns.payload.aps.alert.titleLocKey is required when specifying titleLocArgs');
  }

  const propertyMappings = {
    locKey: 'loc-key',
    locArgs: 'loc-args',
    titleLocKey: 'title-loc-key',
    titleLocArgs: 'title-loc-args',
    actionLocKey: 'action-loc-key',
    launchImage: 'launch-image',
  };
  renameProperties(apsAlert, propertyMappings);
}

/**
 * Checks if the given AndroidConfig object is valid. The object must have valid ttl, data,
 * and notification fields. If successful, transforms the input object by renaming keys to valid
 * Android keys. Also transforms the ttl value to the format expected by FCM service.
 *
 * @param {AndroidConfig} config An object to be validated.
 */
function validateAndroidConfig(config: AndroidConfig) {
  if (typeof config === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(config)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'android must be a non-null object');
  }

  if (typeof config.ttl !== 'undefined') {
    if (!validator.isNumber(config.ttl) || config.ttl < 0) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD,
        'TTL must be a non-negative duration in milliseconds');
    }
    const seconds = Math.floor(config.ttl / 1000);
    const nanos = (config.ttl - seconds * 1000) * 1000000;
    let duration: string;
    if (nanos > 0) {
      let nanoString = nanos.toString();
      while (nanoString.length < 9) {
        nanoString = '0' + nanoString;
      }
      duration = `${seconds}.${nanoString}s`;
    } else {
      duration = `${seconds}s`;
    }
    (config as any).ttl = duration;
  }
  validateStringMap(config.data, 'android.data');
  validateAndroidNotification(config.notification);

  const propertyMappings = {
    collapseKey: 'collapse_key',
    restrictedPackageName: 'restricted_package_name',
  };
  renameProperties(config, propertyMappings);
}

/**
 * Checks if the given AndroidNotification object is valid. The object must have valid color and
 * localization parameters. If successful, transforms the input object by renaming keys to valid
 * Android keys.
 *
 * @param {AndroidNotification} notification An object to be validated.
 */
function validateAndroidNotification(notification: AndroidNotification) {
  if (typeof notification === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(notification)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'android.notification must be a non-null object');
  }

  if (typeof notification.color !== 'undefined' && !/^#[0-9a-fA-F]{6}$/.test(notification.color)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'android.notification.color must be in the form #RRGGBB');
  }
  if (validator.isNonEmptyArray(notification.bodyLocArgs) &&
      !validator.isNonEmptyString(notification.bodyLocKey)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'android.notification.bodyLocKey is required when specifying bodyLocArgs');
  }
  if (validator.isNonEmptyArray(notification.titleLocArgs) &&
      !validator.isNonEmptyString(notification.titleLocKey)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'android.notification.titleLocKey is required when specifying titleLocArgs');
  }

  const propertyMappings = {
    clickAction: 'click_action',
    bodyLocKey: 'body_loc_key',
    bodyLocArgs: 'body_loc_args',
    titleLocKey: 'title_loc_key',
    titleLocArgs: 'title_loc_args',
  };
  renameProperties(notification, propertyMappings);
}

/**
 * Checks if the given Message object is valid. Recursively validates all the child objects
 * included in the message (android, apns, data etc.). If successful, transforms the message
 * in place by renaming the keys to what's expected by the remote FCM service.
 *
 * @param {Message} Message An object to be validated.
 */
function validateMessage(message: Message) {
  if (!validator.isNonNullObject(message)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'Message must be a non-null object');
  }

  const anyMessage = message as any;
  if (anyMessage.topic) {
    // If the topic name is prefixed, remove it.
    if (anyMessage.topic.startsWith('/topics/')) {
      anyMessage.topic = anyMessage.topic.replace(/^\/topics\//, '');
    }
    // Checks for illegal characters and empty string.
    if (!/^[a-zA-Z0-9-_.~%]+$/.test(anyMessage.topic)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD, 'Malformed topic name');
    }
  }

  const targets = [anyMessage.token, anyMessage.topic, anyMessage.condition];
  if (targets.filter((v) => validator.isNonEmptyString(v)).length !== 1) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'Exactly one of topic, token or condition is required');
  }

  validateStringMap(message.data, 'data');
  validateAndroidConfig(message.android);
  validateWebpushConfig(message.webpush);
  validateApnsConfig(message.apns);
}

/* Payload for data messages */
export interface DataMessagePayload {
  [key: string]: string;
}

/* Payload for notification messages */
export interface NotificationMessagePayload {
  tag?: string;
  body?: string;
  icon?: string;
  badge?: string;
  color?: string;
  sound?: string;
  title?: string;
  bodyLocKey?: string;
  bodyLocArgs?: string;
  clickAction?: string;
  titleLocKey?: string;
  titleLocArgs?: string;
  [other: string]: string;
}

/* Composite messaging payload (data and notification payloads are both optional) */
export interface MessagingPayload {
  data?: DataMessagePayload;
  notification?: NotificationMessagePayload;
}

/* Options that can passed along with messages */
export interface MessagingOptions {
  dryRun?: boolean;
  priority?: string;
  timeToLive?: number;
  collapseKey?: string;
  mutableContent?: boolean;
  contentAvailable?: boolean;
  restrictedPackageName?: string;
  [other: string]: any;
}

/* Individual status response payload from single devices */
export interface MessagingDeviceResult {
  error?: FirebaseError;
  messageId?: string;
  canonicalRegistrationToken?: string;
}

/* Response payload from sending to a single device ID or array of device IDs */
export interface MessagingDevicesResponse {
  canonicalRegistrationTokenCount: number;
  failureCount: number;
  multicastId: number;
  results: MessagingDeviceResult[];
  successCount: number;
}

/* Response payload from sending to a device group */
export interface MessagingDeviceGroupResponse {
  successCount: number;
  failureCount: number;
  failedRegistrationTokens: string[];
}

/* Response payload from sending to a topic */
export interface MessagingTopicResponse {
  messageId: number;
}

/* Response payload from sending to a condition */
export interface MessagingConditionResponse {
  messageId: number;
}


/* Response payload from sending to a single registration token or array of registration tokens */
export interface MessagingTopicManagementResponse {
  failureCount: number;
  successCount: number;
  errors: FirebaseArrayIndexError[];
}


/**
 * Maps a raw FCM server response to a MessagingDevicesResponse object.
 *
 * @param {object} response The raw FCM server response to map.
 *
 * @return {MessagingDeviceGroupResponse} The mapped MessagingDevicesResponse object.
 */
function mapRawResponseToDevicesResponse(response: object): MessagingDevicesResponse {
  // Rename properties on the server response
  utils.renameProperties(response, MESSAGING_DEVICES_RESPONSE_KEYS_MAP);
  if ('results' in response) {
    (response as any).results.forEach((messagingDeviceResult) => {
      utils.renameProperties(messagingDeviceResult, MESSAGING_DEVICE_RESULT_KEYS_MAP);

      // Map the FCM server's error strings to actual error objects.
      if ('error' in messagingDeviceResult) {
        const newError = FirebaseMessagingError.fromServerError(
          messagingDeviceResult.error, /* message */ undefined, messagingDeviceResult.error,
        );
        messagingDeviceResult.error = newError;
      }
    });
  }

  return response as MessagingDevicesResponse;
}

/**
 * Maps a raw FCM server response to a MessagingDeviceGroupResponse object.
 *
 * @param {object} response The raw FCM server response to map.
 *
 * @return {MessagingDeviceGroupResponse} The mapped MessagingDeviceGroupResponse object.
 */
function mapRawResponseToDeviceGroupResponse(response: object): MessagingDeviceGroupResponse {
  // Rename properties on the server response
  utils.renameProperties(response, MESSAGING_DEVICE_GROUP_RESPONSE_KEYS_MAP);

  // Add the 'failedRegistrationTokens' property if it does not exist on the response, which
  // it won't when the 'failureCount' property has a value of 0)
  (response as any).failedRegistrationTokens = (response as any).failedRegistrationTokens || [];

  return response as MessagingDeviceGroupResponse;
}

/**
 * Maps a raw FCM server response to a MessagingTopicManagementResponse object.
 *
 * @param {object} response The raw FCM server response to map.
 *
 * @return {MessagingTopicManagementResponse} The mapped MessagingTopicManagementResponse object.
 */
function mapRawResponseToTopicManagementResponse(response: object): MessagingTopicManagementResponse {
  // Add the success and failure counts.
  const result: MessagingTopicManagementResponse = {
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  const errors: FirebaseArrayIndexError[] = [];
  if ('results' in response) {
    (response as any).results.forEach((tokenManagementResult, index) => {
      // Map the FCM server's error strings to actual error objects.
      if ('error' in tokenManagementResult) {
        result.failureCount += 1;
        const newError = FirebaseMessagingError.fromTopicManagementServerError(
          tokenManagementResult.error, /* message */ undefined, tokenManagementResult.error,
        );

        result.errors.push({
          index,
          error: newError,
        });
      } else {
        result.successCount += 1;
      }
    });
  }
  return result;
}


/**
 * Internals of a Messaging instance.
 */
class MessagingInternals implements FirebaseServiceInternalsInterface {
  /**
   * Deletes the service and its associated resources.
   *
   * @return {Promise<()>} An empty Promise that will be fulfilled when the service is deleted.
   */
  public delete(): Promise<void> {
    // There are no resources to clean up.
    return Promise.resolve(undefined);
  }
}


/**
 * Messaging service bound to the provided app.
 */
export class Messaging implements FirebaseServiceInterface {

  public INTERNAL: MessagingInternals = new MessagingInternals();

  private urlPath: string;
  private appInternal: FirebaseApp;
  private messagingRequestHandler: FirebaseMessagingRequestHandler;

  /**
   * @param {FirebaseApp} app The app for this Messaging service.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT,
        'First argument passed to admin.messaging() must be a valid Firebase app instance.',
      );
    }

    const projectId: string = utils.getProjectId(app);
    if (!validator.isNonEmptyString(projectId)) {
      // Assert for an explicit projct ID (either via AppOptions or the cert itself).
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT,
        'Failed to determine project ID for Messaging. Initialize the '
        + 'SDK with service account credentials or set project ID as an app option. '
        + 'Alternatively set the GOOGLE_CLOUD_PROJECT environment variable.',
      );
    }

    this.urlPath = `/v1/projects/${projectId}/messages:send`;
    this.appInternal = app;
    this.messagingRequestHandler = new FirebaseMessagingRequestHandler(app);
  }

  /**
   * Returns the app associated with this Messaging instance.
   *
   * @return {FirebaseApp} The app associated with this Messaging instance.
   */
  get app(): FirebaseApp {
    return this.appInternal;
  }

  /**
   * Sends a message via Firebase Cloud Messaging (FCM).
   *
   * @param {Message} message The message to be sent.
   * @param {boolean=} dryRun Whether to send the message in the dry-run (validation only) mode.
   *
   * @return {Promise<string>} A Promise fulfilled with a message ID string.
   */
  public send(message: Message, dryRun?: boolean): Promise<string> {
    const copy: Message = deepCopy(message);
    validateMessage(copy);
    if (typeof dryRun !== 'undefined' && !validator.isBoolean(dryRun)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT, 'dryRun must be a boolean');
    }
    return Promise.resolve()
      .then(() => {
        const request: {message: Message, validate_only?: boolean} = {message: copy};
        if (dryRun) {
          request.validate_only = true;
        }
        return this.messagingRequestHandler.invokeRequestHandler(FCM_SEND_HOST, this.urlPath, request);
      })
      .then((response) => {
        return (response as any).name;
      });
  }

  /**
   * Sends an FCM message to a single device or an array of devices.
   *
   * @param {string|string[]} registrationTokenOrTokens The registration token or an array of
   *     registration tokens for the device(s) to which to send the message.
   * @param {MessagingPayload} payload The message payload.
   * @param {MessagingOptions} [options = {}] Optional options to alter the message.
   *
   * @return {Promise<MessagingDevicesResponse|MessagingDeviceGroupResponse>} A Promise fulfilled
   *     with the server's response after the message has been sent.
   */
  public sendToDevice(
    registrationTokenOrTokens: string | string[],
    payload: MessagingPayload,
    options: MessagingOptions = {},
  ): Promise<MessagingDevicesResponse | MessagingDeviceGroupResponse> {
    // Validate the input argument types. Since these are common developer errors when getting
    // started, throw an error instead of returning a rejected promise.
    this.validateRegistrationTokensType(
      registrationTokenOrTokens, 'sendToDevice', MessagingClientErrorCode.INVALID_RECIPIENT,
    );
    this.validateMessagingPayloadAndOptionsTypes(payload, options);

    return Promise.resolve()
      .then(() => {
        // Validate the contents of the input arguments. Because we are now in a promise, any thrown
        // error will cause this method to return a rejected promise.
        this.validateRegistrationTokens(
          registrationTokenOrTokens, 'sendToDevice', MessagingClientErrorCode.INVALID_RECIPIENT,
        );
        const payloadCopy = this.validateMessagingPayload(payload);
        const optionsCopy = this.validateMessagingOptions(options);

        const request: any = deepCopy(payloadCopy);
        deepExtend(request, optionsCopy);

        if (validator.isString(registrationTokenOrTokens)) {
          request.to = registrationTokenOrTokens;
        } else {
          request.registration_ids = registrationTokenOrTokens;
        }

        return this.messagingRequestHandler.invokeRequestHandler(FCM_SEND_HOST, FCM_SEND_PATH, request);
      })
      .then((response) => {
        // The sendToDevice() and sendToDeviceGroup() methods both set the `to` query parameter in
        // the underlying FCM request. If the provided registration token argument is actually a
        // valid notification key, the response from the FCM server will be a device group response.
        // If that is the case, we map the response to a MessagingDeviceGroupResponse.
        // See b/35394951 for more context.
        if ('multicast_id' in response) {
          return mapRawResponseToDevicesResponse(response);
        } else {
          return mapRawResponseToDeviceGroupResponse(response);
        }
      });
  }

  /**
   * Sends an FCM message to a device group.
   *
   * @param {string} notificationKey The notification key representing the device group to which to
   *     send the message.
   * @param {MessagingPayload} payload The message payload.
   * @param {MessagingOptions} [options = {}] Optional options to alter the message.
   *
   * @return {Promise<MessagingDeviceGroupResponse|MessagingDevicesResponse>} A Promise fulfilled
   *     with the server's response after the message has been sent.
   */
  public sendToDeviceGroup(
    notificationKey: string,
    payload: MessagingPayload,
    options: MessagingOptions = {},
  ): Promise<MessagingDeviceGroupResponse | MessagingDevicesResponse> {
    if (!validator.isNonEmptyString(notificationKey)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_RECIPIENT,
        'Notification key provided to sendToDeviceGroup() must be a non-empty string.',
      );
    } else if (notificationKey.indexOf(':') !== -1) {
      // It is possible the developer provides a registration token instead of a notification key
      // to this method. We can detect some of those cases by checking to see if the string contains
      // a colon. Not all registration tokens will contain a colon (only newer ones will), but no
      // notification keys will contain a colon, so we can use it as a rough heuristic.
      // See b/35394951 for more context.
      return Promise.reject(new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_RECIPIENT,
        'Notification key provided to sendToDeviceGroup() has the format of a registration token. ' +
        'You should use sendToDevice() instead.',
      ));
    }

    // Validate the types of the payload and options arguments. Since these are common developer
    // errors, throw an error instead of returning a rejected promise.
    this.validateMessagingPayloadAndOptionsTypes(payload, options);

    return Promise.resolve()
      .then(() => {
        // Validate the contents of the payload and options objects. Because we are now in a
        // promise, any thrown error will cause this method to return a rejected promise.
        const payloadCopy = this.validateMessagingPayload(payload);
        const optionsCopy = this.validateMessagingOptions(options);

        const request: any = deepCopy(payloadCopy);
        deepExtend(request, optionsCopy);
        request.to = notificationKey;

        return this.messagingRequestHandler.invokeRequestHandler(FCM_SEND_HOST, FCM_SEND_PATH, request);
      })
      .then((response) => {
        // The sendToDevice() and sendToDeviceGroup() methods both set the `to` query parameter in
        // the underlying FCM request. If the provided notification key argument has an invalid
        // format (that is, it is either a registration token or some random string), the response
        // from the FCM server will default to a devices response (which we detect by looking for
        // the `multicast_id` property). If that is the case, we either throw an error saying the
        // provided notification key is invalid (if the message failed to send) or map the response
        // to a MessagingDevicesResponse (if the message succeeded).
        // See b/35394951 for more context.
        if ('multicast_id' in response) {
          if ((response as any).success === 0) {
            throw new FirebaseMessagingError(
              MessagingClientErrorCode.INVALID_RECIPIENT,
              'Notification key provided to sendToDeviceGroup() is invalid.',
            );
          } else {
            return mapRawResponseToDevicesResponse(response);
          }
        }

        return mapRawResponseToDeviceGroupResponse(response);
      });
  }

  /**
   * Sends an FCM message to a topic.
   *
   * @param {string} topic The name of the topic to which to send the message.
   * @param {MessagingPayload} payload The message payload.
   * @param {MessagingOptions} [options = {}] Optional options to alter the message.
   *
   * @return {Promise<MessagingTopicResponse>} A Promise fulfilled with the server's response after
   *     the message has been sent.
   */
  public sendToTopic(
    topic: string,
    payload: MessagingPayload,
    options: MessagingOptions = {},
  ): Promise<MessagingTopicResponse> {
    // Validate the input argument types. Since these are common developer errors when getting
    // started, throw an error instead of returning a rejected promise.
    this.validateTopicType(topic, 'sendToTopic', MessagingClientErrorCode.INVALID_RECIPIENT);
    this.validateMessagingPayloadAndOptionsTypes(payload, options);

    // Prepend the topic with /topics/ if necessary.
    topic = this.normalizeTopic(topic);

    return Promise.resolve()
      .then(() => {
        // Validate the contents of the payload and options objects. Because we are now in a
        // promise, any thrown error will cause this method to return a rejected promise.
        const payloadCopy = this.validateMessagingPayload(payload);
        const optionsCopy = this.validateMessagingOptions(options);
        this.validateTopic(topic, 'sendToTopic', MessagingClientErrorCode.INVALID_RECIPIENT);

        const request: any = deepCopy(payloadCopy);
        deepExtend(request, optionsCopy);
        request.to = topic;

        return this.messagingRequestHandler.invokeRequestHandler(FCM_SEND_HOST, FCM_SEND_PATH, request);
      })
      .then((response) => {
        // Rename properties on the server response
        utils.renameProperties(response, MESSAGING_TOPIC_RESPONSE_KEYS_MAP);

        return response as MessagingTopicResponse;
      });
  }

  /**
   * Sends an FCM message to a condition.
   *
   * @param {string} condition The condition to which to send the message.
   * @param {MessagingPayload} payload The message payload.
   * @param {MessagingOptions} [options = {}] Optional options to alter the message.
   *
   * @return {Promise<MessagingConditionResponse>} A Promise fulfilled with the server's response
   *     after the message has been sent.
   */
  public sendToCondition(
    condition: string,
    payload: MessagingPayload,
    options: MessagingOptions = {},
  ): Promise<MessagingConditionResponse> {
    if (!validator.isNonEmptyString(condition)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_RECIPIENT,
        'Condition provided to sendToCondition() must be a non-empty string.',
      );
    }
    // Validate the types of the payload and options arguments. Since these are common developer
    // errors, throw an error instead of returning a rejected promise.
    this.validateMessagingPayloadAndOptionsTypes(payload, options);

    // The FCM server rejects conditions which are surrounded in single quotes. When the condition
    // is stringified over the wire, double quotes in it get converted to \" which the FCM server
    // does not properly handle. We can get around this by replacing internal double quotes with
    // single quotes.
    condition = condition.replace(/"/g, '\'');

    return Promise.resolve()
      .then(() => {
        // Validate the contents of the payload and options objects. Because we are now in a
        // promise, any thrown error will cause this method to return a rejected promise.
        const payloadCopy = this.validateMessagingPayload(payload);
        const optionsCopy = this.validateMessagingOptions(options);

        const request: any = deepCopy(payloadCopy);
        deepExtend(request, optionsCopy);
        request.condition = condition;

        return this.messagingRequestHandler.invokeRequestHandler(FCM_SEND_HOST, FCM_SEND_PATH, request);
      })
      .then((response) => {
        // Rename properties on the server response
        utils.renameProperties(response, MESSAGING_CONDITION_RESPONSE_KEYS_MAP);

        return response as MessagingConditionResponse;
      });
  }

  /**
   * Subscribes a single device or an array of devices to a topic.
   *
   * @param {string|string[]} registrationTokenOrTokens The registration token or an array of
   *     registration tokens to subscribe to the topic.
   * @param {string} topic The topic to which to subscribe.
   *
   * @return {Promise<MessagingTopicManagementResponse>} A Promise fulfilled with the parsed FCM
   *   server response.
   */
  public subscribeToTopic(
    registrationTokenOrTokens: string | string[],
    topic: string,
  ): Promise<MessagingTopicManagementResponse> {
    return this.sendTopicManagementRequest(
      registrationTokenOrTokens,
      topic,
      'subscribeToTopic',
      FCM_TOPIC_MANAGEMENT_ADD_PATH,
    );
  }

  /**
   * Unsubscribes a single device or an array of devices from a topic.
   *
   * @param {string|string[]} registrationTokenOrTokens The registration token or an array of
   *     registration tokens to unsubscribe from the topic.
   * @param {string} topic The topic to which to subscribe.
   *
   * @return {Promise<MessagingTopicManagementResponse>} A Promise fulfilled with the parsed FCM
   *   server response.
   */
  public unsubscribeFromTopic(
    registrationTokenOrTokens: string | string[],
    topic: string,
  ): Promise<MessagingTopicManagementResponse> {
    return this.sendTopicManagementRequest(
      registrationTokenOrTokens,
      topic,
      'unsubscribeFromTopic',
      FCM_TOPIC_MANAGEMENT_REMOVE_PATH,
    );
  }

  /**
   * Helper method which sends and handles topic subscription management requests.
   *
   * @param {string|string[]} registrationTokenOrTokens The registration token or an array of
   *     registration tokens to unsubscribe from the topic.
   * @param {string} topic The topic to which to subscribe.
   * @param {string} methodName The name of the original method called.
   * @param {string} path The endpoint path to use for the request.
   *
   * @return {Promise<MessagingTopicManagementResponse>} A Promise fulfilled with the parsed server
   *   response.
   */
  private sendTopicManagementRequest(
    registrationTokenOrTokens: string | string[],
    topic: string,
    methodName: string,
    path: string,
  ): Promise<MessagingTopicManagementResponse> {
    this.validateRegistrationTokensType(registrationTokenOrTokens, methodName);
    this.validateTopicType(topic, methodName);

    // Prepend the topic with /topics/ if necessary.
    topic = this.normalizeTopic(topic);

    return Promise.resolve()
      .then(() => {
        // Validate the contents of the input arguments. Because we are now in a promise, any thrown
        // error will cause this method to return a rejected promise.
        this.validateRegistrationTokens(registrationTokenOrTokens, methodName);
        this.validateTopic(topic, methodName);

        // Ensure the registration token(s) input argument is an array.
        let registrationTokensArray: string[] = registrationTokenOrTokens as string[];
        if (validator.isString(registrationTokenOrTokens)) {
          registrationTokensArray = [registrationTokenOrTokens as string];
        }

        const request = {
          to: topic,
          registration_tokens: registrationTokensArray,
        };

        return this.messagingRequestHandler.invokeRequestHandler(
          FCM_TOPIC_MANAGEMENT_HOST, path, request,
        );
      })
      .then((response) => {
        return mapRawResponseToTopicManagementResponse(response);
      });
  }

  /**
   * Validates the types of the messaging payload and options. If invalid, an error will be thrown.
   *
   * @param {MessagingPayload} payload The messaging payload to validate.
   * @param {MessagingOptions} options The messaging options to validate.
   */
  private validateMessagingPayloadAndOptionsTypes(
    payload: MessagingPayload,
    options: MessagingOptions,
  ) {
    // Validate the payload is an object
    if (!validator.isNonNullObject(payload)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD,
        'Messaging payload must be an object with at least one of the "data" or "notification" properties.',
      );
    }

    // Validate the options argument is an object
    if (!validator.isNonNullObject(options)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        'Messaging options must be an object.',
      );
    }
  }

  /**
   * Validates the messaging payload. If invalid, an error will be thrown.
   *
   * @param {MessagingPayload} payload The messaging payload to validate.
   *
   * @return {MessagingPayload} A copy of the provided payload with whitelisted properties switched
   *     from camelCase to underscore_case.
   */
  private validateMessagingPayload(payload: MessagingPayload) {
    const payloadCopy: MessagingPayload = deepCopy(payload);

    const payloadKeys = Object.keys(payloadCopy);
    const validPayloadKeys = ['data', 'notification'];

    let containsDataOrNotificationKey = false;
    payloadKeys.forEach((payloadKey) => {
      // Validate the payload does not contain any invalid keys
      if (validPayloadKeys.indexOf(payloadKey) === -1) {
        throw new FirebaseMessagingError(
          MessagingClientErrorCode.INVALID_PAYLOAD,
          `Messaging payload contains an invalid "${ payloadKey }" property. Valid properties are ` +
          `"data" and "notification".`,
        );
      } else {
        containsDataOrNotificationKey = true;
      }
    });

    // Validate the payload contains at least one of the "data" and "notification" keys
    if (!containsDataOrNotificationKey) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD,
        'Messaging payload must contain at least one of the "data" or "notification" properties.',
      );
    }

    payloadKeys.forEach((payloadKey) => {
      const value = payloadCopy[payloadKey];

      // Validate each top-level key in the payload is an object
      if (!validator.isNonNullObject(value)) {
        throw new FirebaseMessagingError(
          MessagingClientErrorCode.INVALID_PAYLOAD,
          `Messaging payload contains an invalid value for the "${ payloadKey }" property. ` +
          `Value must be an object.`,
        );
      }

      Object.keys(value).forEach((subKey) => {
        if (!validator.isString(value[subKey])) {
          // Validate all sub-keys have a string value
          throw new FirebaseMessagingError(
            MessagingClientErrorCode.INVALID_PAYLOAD,
            `Messaging payload contains an invalid value for the "${ payloadKey }.${ subKey }" ` +
            `property. Values must be strings.`,
          );
        } else if (payloadKey === 'data' && /^google\./.test(subKey)) {
          // Validate the data payload does not contain keys which start with 'google.'.
          throw new FirebaseMessagingError(
            MessagingClientErrorCode.INVALID_PAYLOAD,
            `Messaging payload contains the blacklisted "data.${ subKey }" property.`,
          );
        }
      });
    });

    // Validate the data payload object does not contain blacklisted properties
    if ('data' in payloadCopy) {
      BLACKLISTED_DATA_PAYLOAD_KEYS.forEach((blacklistedKey) => {
        if (blacklistedKey in payloadCopy.data) {
          throw new FirebaseMessagingError(
            MessagingClientErrorCode.INVALID_PAYLOAD,
            `Messaging payload contains the blacklisted "data.${ blacklistedKey }" property.`,
          );
        }
      });
    }

    // Convert whitelisted camelCase keys to underscore_case
    if ('notification' in payloadCopy) {
      utils.renameProperties(payloadCopy.notification, CAMELCASED_NOTIFICATION_PAYLOAD_KEYS_MAP);
    }

    return payloadCopy;
  }

  /**
   * Validates the messaging options. If invalid, an error will be thrown.
   *
   * @param {MessagingOptions} options The messaging options to validate.
   *
   * @return {MessagingOptions} A copy of the provided options with whitelisted properties switched
   *   from camelCase to underscore_case.
   */
  private validateMessagingOptions(options: MessagingOptions) {
    const optionsCopy: MessagingOptions = deepCopy(options);

    // Validate the options object does not contain blacklisted properties
    BLACKLISTED_OPTIONS_KEYS.forEach((blacklistedKey) => {
      if (blacklistedKey in optionsCopy) {
        throw new FirebaseMessagingError(
          MessagingClientErrorCode.INVALID_OPTIONS,
          `Messaging options contains the blacklisted "${ blacklistedKey }" property.`,
        );
      }
    });

    // Convert whitelisted camelCase keys to underscore_case
    utils.renameProperties(optionsCopy, CAMELCASE_OPTIONS_KEYS_MAP);

    // Validate the options object contains valid values for whitelisted properties
    if ('collapse_key' in optionsCopy && !validator.isNonEmptyString((optionsCopy as any).collapse_key)) {
      const keyName = ('collapseKey' in options) ? 'collapseKey' : 'collapse_key';
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        `Messaging options contains an invalid value for the "${ keyName }" property. Value must ` +
        'be a non-empty string.',
      );
    } else if ('dry_run' in optionsCopy && !validator.isBoolean((optionsCopy as any).dry_run)) {
      const keyName = ('dryRun' in options) ? 'dryRun' : 'dry_run';
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        `Messaging options contains an invalid value for the "${ keyName }" property. Value must ` +
        'be a boolean.',
      );
    } else if ('priority' in optionsCopy && !validator.isNonEmptyString(optionsCopy.priority)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        'Messaging options contains an invalid value for the "priority" property. Value must ' +
        'be a non-empty string.',
      );
    } else if ('restricted_package_name' in optionsCopy &&
               !validator.isNonEmptyString((optionsCopy as any).restricted_package_name)) {
      const keyName = ('restrictedPackageName' in options) ? 'restrictedPackageName' : 'restricted_package_name';
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        `Messaging options contains an invalid value for the "${ keyName }" property. Value must ` +
        'be a non-empty string.',
      );
    } else if ('time_to_live' in optionsCopy && !validator.isNumber((optionsCopy as any).time_to_live)) {
      const keyName = ('timeToLive' in options) ? 'timeToLive' : 'time_to_live';
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        `Messaging options contains an invalid value for the "${ keyName }" property. Value must ` +
        'be a number.',
      );
    } else if ('content_available' in optionsCopy && !validator.isBoolean((optionsCopy as any).content_available)) {
      const keyName = ('contentAvailable' in options) ? 'contentAvailable' : 'content_available';
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        `Messaging options contains an invalid value for the "${ keyName }" property. Value must ` +
        'be a boolean.',
      );
    } else if ('mutable_content' in optionsCopy && !validator.isBoolean((optionsCopy as any).mutable_content)) {
      const keyName = ('mutableContent' in options) ? 'mutableContent' : 'mutable_content';
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        `Messaging options contains an invalid value for the "${ keyName }" property. Value must ` +
        'be a boolean.',
      );
    }

    return optionsCopy;
  }

  /**
   * Validates the type of the provided registration token(s). If invalid, an error will be thrown.
   *
   * @param {string|string[]} registrationTokenOrTokens The registration token(s) to validate.
   * @param {string} method The method name to use in error messages.
   * @param {ErrorInfo?} [errorInfo] The error info to use if the registration tokens are invalid.
   */
  private validateRegistrationTokensType(
    registrationTokenOrTokens: string | string[],
    methodName: string,
    errorInfo: ErrorInfo = MessagingClientErrorCode.INVALID_ARGUMENT,
  ) {
    if (!validator.isNonEmptyArray(registrationTokenOrTokens) &&
        !validator.isNonEmptyString(registrationTokenOrTokens)) {
      throw new FirebaseMessagingError(
        errorInfo,
        `Registration token(s) provided to ${methodName}() must be a non-empty string or a ` +
        'non-empty array.',
      );
    }
  }

  /**
   * Validates the provided registration tokens. If invalid, an error will be thrown.
   *
   * @param {string|string[]} registrationTokenOrTokens The registration token or an array of
   *     registration tokens to validate.
   * @param {string} method The method name to use in error messages.
   * @param {errorInfo?} [ErrorInfo] The error info to use if the registration tokens are invalid.
   */
  private validateRegistrationTokens(
    registrationTokenOrTokens: string | string[],
    methodName: string,
    errorInfo: ErrorInfo = MessagingClientErrorCode.INVALID_ARGUMENT,
  ) {
    if (validator.isArray(registrationTokenOrTokens)) {
      // Validate the array contains no more than 1,000 registration tokens.
      if (registrationTokenOrTokens.length > 1000) {
        throw new FirebaseMessagingError(
          errorInfo,
          `Too many registration tokens provided in a single request to ${methodName}(). Batch ` +
          'your requests to contain no more than 1,000 registration tokens per request.',
        );
      }

      // Validate the array contains registration tokens which are non-empty strings.
      (registrationTokenOrTokens as string[]).forEach((registrationToken, index) => {
        if (!validator.isNonEmptyString(registrationToken)) {
          throw new FirebaseMessagingError(
            errorInfo,
            `Registration token provided to ${methodName}() at index ${index} must be a ` +
            'non-empty string.',
          );
        }
      });
    }
  }

  /**
   * Validates the type of the provided topic. If invalid, an error will be thrown.
   *
   * @param {string} topic The topic to validate.
   * @param {string} method The method name to use in error messages.
   * @param {ErrorInfo?} [errorInfo] The error info to use if the topic is invalid.
   */
  private validateTopicType(
    topic: string | string[],
    methodName: string,
    errorInfo: ErrorInfo = MessagingClientErrorCode.INVALID_ARGUMENT,
  ) {
    if (!validator.isNonEmptyString(topic)) {
      throw new FirebaseMessagingError(
        errorInfo,
        `Topic provided to ${methodName}() must be a string which matches the format ` +
        '"/topics/[a-zA-Z0-9-_.~%]+".',
      );
    }
  }

  /**
   * Validates the provided topic. If invalid, an error will be thrown.
   *
   * @param {string} topic The topic to validate.
   * @param {string} method The method name to use in error messages.
   * @param {ErrorInfo?} [errorInfo] The error info to use if the topic is invalid.
   */
  private validateTopic(
    topic: string,
    methodName: string,
    errorInfo: ErrorInfo = MessagingClientErrorCode.INVALID_ARGUMENT,
  ) {
    if (!validator.isTopic(topic)) {
      throw new FirebaseMessagingError(
        errorInfo,
        `Topic provided to ${methodName}() must be a string which matches the format ` +
        '"/topics/[a-zA-Z0-9-_.~%]+".',
      );
    }
  }

  /**
   * Normalizes the provided topic name by prepending it with '/topics/', if necessary.
   *
   * @param {string} topic The topic name to normalize.
   *
   * @return {string} The normalized topic name.
   */
  private normalizeTopic(topic: string) {
    if (!/^\/topics\//.test(topic)) {
      topic = `/topics/${ topic }`;
    }
    return topic;
  }
}
