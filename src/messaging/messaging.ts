import {FirebaseApp} from '../firebase-app';
import {deepCopy, deepExtend} from '../utils/deep-copy';
import {FirebaseMessagingRequestHandler} from './messaging-api-request';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {MessagingClientErrorCode, FirebaseMessagingError} from '../utils/error';

import * as utils from '../utils';
import * as validator from '../utils/validator';


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


/* Payload for data messages */
export type DataMessagePayload = {
  [key: string]: string;
};

/* Payload for notification messages */
export type NotificationMessagePayload = {
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
};

/* Composite messaging payload (data and notification payloads are both optional) */
export type MessagingPayload = {
  data?: DataMessagePayload;
  notification?: NotificationMessagePayload;
};

/* Options that can passed along with messages */
export type MessagingOptions = {
  dryRun?: boolean;
  priority?: string;
  timeToLive?: number;
  collapseKey?: string;
  contentAvailable?: boolean;
  restrictedPackageName?: string;
  [other: string]: any;
};

/* Individual status response payload from single devices */
export type MessagingDeviceResult = {
  error?: string;
  messageId?: string;
  canonicalRegistrationToken?: string;
};

/* Response payload from sending to a single device ID or array of device IDs */
export type MessagingDevicesResponse = {
  canonicalRegistrationTokenCount: number;
  failureCount: number;
  multicastId: number;
  results: MessagingDeviceResult[];
  successCount: number;
};

/* Response payload from sending to a device group */
export type MessagingDeviceGroupResponse = {
  successCount: number;
  failureCount: number;
  failedRegistrationTokens: string[];
};

/* Response payload from sending to a topic */
export type MessagingTopicResponse = {
  messageId: number;
};

/* Response payload from sending to a condition */
export type MessagingConditionResponse = {
  messageId: number;
};


/**
 * Internals of a Messaging instance.
 */
export class MessagingInternals implements FirebaseServiceInternalsInterface {
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
class Messaging implements FirebaseServiceInterface {
  public INTERNAL: MessagingInternals = new MessagingInternals();

  private appInternal: FirebaseApp;
  private messagingRequestHandler: FirebaseMessagingRequestHandler;

  /**
   * @param {Object} app The app for this Messaging service.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT,
        'First argument passed to admin.messaging() must be a valid Firebase app instance.'
      );
    }

    this.appInternal = app;

    // Initialize messaging request handler with the app.
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
   * Sends an FCM message to a single device or an array of devices.
   *
   * @param {string|string[]} registrationTokenOrTokens The registration token or an array of
   *     registration tokens for the device(s) to which to send the message.
   * @param {MessagingPayload} payload The message payload.
   * @param {MessagingOptions} [options = {}] Optional options to alter the message.
   *
   * @return {Promise<MessagingDevicesResponse>} A Promise fulfilled with the server's response
   *     after the message has been sent.
   */
  public sendToDevice(
    registrationTokenOrTokens: string|string[],
    payload: MessagingPayload,
    options: MessagingOptions = {},
  ): Promise<MessagingDevicesResponse> {
    if (registrationTokenOrTokens instanceof Array && registrationTokenOrTokens.length !== 0) {
      // Validate the array contains no more than 1,000 registration tokens.
      if (registrationTokenOrTokens.length > 1000) {
        return Promise.reject(new FirebaseMessagingError(
          MessagingClientErrorCode.INVALID_RECIPIENT,
          'Too many registration tokens provided in a single request. Batch your requests to ' +
          'contain no more than 1,000 registration tokens per request.'
        ));
      }

      // Validate the array contains registration tokens which are non-empty strings.
      try {
        registrationTokenOrTokens.forEach((registrationToken, index) => {
          if (!validator.isNonEmptyString(registrationToken)) {
            throw new FirebaseMessagingError(
              MessagingClientErrorCode.INVALID_RECIPIENT,
              `Registration token provided to sendToDevice() at index ${index} must be a non-empty string.`
            );
          }
        });
      } catch (error) {
        return Promise.reject(error);
      }
    } else if (!validator.isNonEmptyString(registrationTokenOrTokens)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_RECIPIENT,
        'Registration token provided to sendToDevice() must be a non-empty string or a non-empty array.'
      );
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

        if (validator.isString(registrationTokenOrTokens)) {
          request.to = registrationTokenOrTokens;
        } else {
          request.registration_ids = registrationTokenOrTokens;
        }

        return this.messagingRequestHandler.invokeRequestHandler(request);
      })
      .then((response) => {
        // Rename properties on the server response
        utils.renameProperties(response, MESSAGING_DEVICES_RESPONSE_KEYS_MAP);
        if ('results' in response) {
          (response as any).results.forEach((messagingDeviceResult) => {
            utils.renameProperties(messagingDeviceResult, MESSAGING_DEVICE_RESULT_KEYS_MAP);

            // Map the FCM server's error strings to actual error objects.
            if ('error' in messagingDeviceResult) {
              const newError = FirebaseMessagingError.fromServerError(
                messagingDeviceResult.error, /* message */ undefined, messagingDeviceResult.error
              );
              messagingDeviceResult.error = newError;
            }
          });
        }

        return response;
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
   * @return {Promise<MessagingDeviceGroupResponse>} A Promise fulfilled with the server's response
   *     after the message has been sent.
   */
  public sendToDeviceGroup(
    notificationKey: string,
    payload: MessagingPayload,
    options: MessagingOptions = {},
  ): Promise<MessagingDeviceGroupResponse> {
    if (!validator.isNonEmptyString(notificationKey)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_RECIPIENT,
        'Notification key provided to sendToDeviceGroup() must be a non-empty string.'
      );
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

        return this.messagingRequestHandler.invokeRequestHandler(request);
      })
      .then((response) => {
        // Rename properties on the server response
        utils.renameProperties(response, MESSAGING_DEVICE_GROUP_RESPONSE_KEYS_MAP);

        // Add the 'failedRegistrationTokens' property if it does not exist on the response, which
        // it won't when the 'failureCount' property has a value of 0)
        (response as any).failedRegistrationTokens = (response as any).failedRegistrationTokens || [];

        return response;
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
    if (!validator.isNonEmptyString(topic)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_RECIPIENT,
        'Topic provided to sendToTopic() must be a string which matches the format "/topics/[a-zA-Z0-9-_.~%]+".'
      );
    } else if (!validator.isTopic(topic)) {
      return Promise.reject(new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_RECIPIENT,
        'Topic provided to sendToTopic() must be a string which matches the format "/topics/[a-zA-Z0-9-_.~%]+".'
      ));
    }

    // Prepend the topic with /topics/ if necessary
    if (!/^\/topics\//.test(topic)) {
      topic = `/topics/${ topic }`;
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
        request.to = topic;

        return this.messagingRequestHandler.invokeRequestHandler(request);
      })
      .then((response) => {
        // Rename properties on the server response
        utils.renameProperties(response, MESSAGING_TOPIC_RESPONSE_KEYS_MAP);

        return response;
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
        'Condition provided to sendToCondition() must be a non-empty string.'
      );
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
        request.condition = condition;

        return this.messagingRequestHandler.invokeRequestHandler(request);
      })
      .then((response) => {
        // Rename properties on the server response
        utils.renameProperties(response, MESSAGING_CONDITION_RESPONSE_KEYS_MAP);

        return response;
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
        'Messaging payload must be an object with at least one of the "data" or "notification" properties.'
      );
    }

    // Validate the options argument is an object
    if (!validator.isNonNullObject(options)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        'Messaging options must be an object.'
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
          `"data" and "notification".`
        );
      } else {
        containsDataOrNotificationKey = true;
      }
    });

    // Validate the payload contains at least one of the "data" and "notification" keys
    if (!containsDataOrNotificationKey) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD,
        'Messaging payload must contain at least one of the "data" or "notification" properties.'
      );
    }

    payloadKeys.forEach((payloadKey) => {
      const value = payloadCopy[payloadKey];

      // Validate each top-level key in the payload is an object
      if (!validator.isNonNullObject(value)) {
        throw new FirebaseMessagingError(
          MessagingClientErrorCode.INVALID_PAYLOAD,
          `Messaging payload contains an invalid value for the "${ payloadKey }" property. ` +
          `Value must be an object.`
        );
      }

      Object.keys(value).forEach((subKey) => {
        if (!validator.isString(value[subKey])) {
          // Validate all sub-keys have a string value
          throw new FirebaseMessagingError(
            MessagingClientErrorCode.INVALID_PAYLOAD,
            `Messaging payload contains an invalid value for the "${ payloadKey }.${ subKey }" ` +
            `property. Values must be strings.`
          );
        } else if (payloadKey === 'data' && /^google\./.test(subKey)) {
          // Validate the data payload does not contain keys which start with 'google.'.
          throw new FirebaseMessagingError(
            MessagingClientErrorCode.INVALID_PAYLOAD,
            `Messaging payload contains the blacklisted "data.${ subKey }" property.`
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
            `Messaging payload contains the blacklisted "data.${ blacklistedKey }" property.`
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
          `Messaging options contains the blacklisted "${ blacklistedKey }" property.`
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
        'be a non-empty string.'
      );
    } else if ('dry_run' in optionsCopy && !validator.isBoolean((optionsCopy as any).dry_run)) {
      const keyName = ('dryRun' in options) ? 'dryRun' : 'dry_run';
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        `Messaging options contains an invalid value for the "${ keyName }" property. Value must ` +
        'be a boolean.'
      );
    } else if ('priority' in optionsCopy && !validator.isNonEmptyString(optionsCopy.priority)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        'Messaging options contains an invalid value for the "priority" property. Value must ' +
        'be a non-empty string.'
      );
    } else if ('restricted_package_name' in optionsCopy &&
               !validator.isNonEmptyString((optionsCopy as any).restricted_package_name)) {
      const keyName = ('restrictedPackageName' in options) ? 'restrictedPackageName' : 'restricted_package_name';
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        `Messaging options contains an invalid value for the "${ keyName }" property. Value must ` +
        'be a non-empty string.'
      );
    } else if ('time_to_live' in optionsCopy && !validator.isNumber((optionsCopy as any).time_to_live)) {
      const keyName = ('timeToLive' in options) ? 'timeToLive' : 'time_to_live';
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        `Messaging options contains an invalid value for the "${ keyName }" property. Value must ` +
        'be a number.'
      );
    } else if ('content_available' in optionsCopy && !validator.isBoolean((optionsCopy as any).content_available)) {
      const keyName = ('contentAvailable' in options) ? 'contentAvailable' : 'content_available';
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_OPTIONS,
        `Messaging options contains an invalid value for the "${ keyName }" property. Value must ` +
        'be a boolean.'
      );
    }

    return optionsCopy;
  }
};


export {
  Messaging,
}
