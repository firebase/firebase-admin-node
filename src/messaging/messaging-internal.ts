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

import { renameProperties } from '../utils/index';
import { MessagingClientErrorCode, FirebaseMessagingError, } from '../utils/error';
import { messaging } from './index';
import * as validator from '../utils/validator';

import AndroidConfig = messaging.AndroidConfig;
import AndroidFcmOptions = messaging.AndroidFcmOptions;
import AndroidNotification = messaging.AndroidNotification;
import ApsAlert = messaging.ApsAlert;
import ApnsConfig = messaging.ApnsConfig;
import ApnsFcmOptions = messaging.ApnsFcmOptions;
import ApnsPayload = messaging.ApnsPayload;
import Aps = messaging.Aps;
import CriticalSound = messaging.CriticalSound;
import FcmOptions = messaging.FcmOptions;
import LightSettings = messaging.LightSettings;
import Message = messaging.Message;
import Notification = messaging.Notification;
import WebpushConfig = messaging.WebpushConfig;

// Keys which are not allowed in the messaging data payload object.
export const BLACKLISTED_DATA_PAYLOAD_KEYS = ['from'];

// Keys which are not allowed in the messaging options object.
export const BLACKLISTED_OPTIONS_KEYS = [
  'condition', 'data', 'notification', 'registrationIds', 'registration_ids', 'to',
];

/**
 * Checks if the given Message object is valid. Recursively validates all the child objects
 * included in the message (android, apns, data etc.). If successful, transforms the message
 * in place by renaming the keys to what's expected by the remote FCM service.
 *
 * @param {Message} Message An object to be validated.
 */
export function validateMessage(message: Message): void {
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
  validateFcmOptions(message.fcmOptions);
  validateNotification(message.notification);
}

/**
 * Checks if the given object only contains strings as child values.
 *
 * @param {object} map An object to be validated.
 * @param {string} label A label to be included in the errors thrown.
 */
function validateStringMap(map: { [key: string]: any } | undefined, label: string): void {
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
function validateWebpushConfig(config: WebpushConfig | undefined): void {
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
function validateApnsConfig(config: ApnsConfig | undefined): void {
  if (typeof config === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(config)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'apns must be a non-null object');
  }
  validateStringMap(config.headers, 'apns.headers');
  validateApnsPayload(config.payload);
  validateApnsFcmOptions(config.fcmOptions);
}

/**
 * Checks if the given ApnsFcmOptions object is valid.
 *
 * @param {ApnsFcmOptions} fcmOptions An object to be validated.
 */
function validateApnsFcmOptions(fcmOptions: ApnsFcmOptions | undefined): void {
  if (typeof fcmOptions === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(fcmOptions)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'fcmOptions must be a non-null object');
  }

  if (typeof fcmOptions.imageUrl !== 'undefined' &&
    !validator.isURL(fcmOptions.imageUrl)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'imageUrl must be a valid URL string');
  }

  if (typeof fcmOptions.analyticsLabel !== 'undefined' && !validator.isString(fcmOptions.analyticsLabel)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'analyticsLabel must be a string value');
  }

  const propertyMappings: { [key: string]: string } = {
    imageUrl: 'image',
  };
  Object.keys(propertyMappings).forEach((key) => {
    if (key in fcmOptions && propertyMappings[key] in fcmOptions) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD,
        `Multiple specifications for ${key} in ApnsFcmOptions`);
    }
  });
  renameProperties(fcmOptions, propertyMappings);
}

/**
 * Checks if the given FcmOptions object is valid.
 *
 * @param {FcmOptions} fcmOptions An object to be validated.
 */
function validateFcmOptions(fcmOptions: FcmOptions | undefined): void {
  if (typeof fcmOptions === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(fcmOptions)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'fcmOptions must be a non-null object');
  }

  if (typeof fcmOptions.analyticsLabel !== 'undefined' && !validator.isString(fcmOptions.analyticsLabel)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'analyticsLabel must be a string value');
  }
}

/**
 * Checks if the given Notification object is valid.
 *
 * @param {Notification} notification An object to be validated.
 */
function validateNotification(notification: Notification | undefined): void {
  if (typeof notification === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(notification)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'notification must be a non-null object');
  }

  if (typeof notification.imageUrl !== 'undefined' && !validator.isURL(notification.imageUrl)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'notification.imageUrl must be a valid URL string');
  }

  const propertyMappings: { [key: string]: string } = {
    imageUrl: 'image',
  };
  Object.keys(propertyMappings).forEach((key) => {
    if (key in notification && propertyMappings[key] in notification) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD,
        `Multiple specifications for ${key} in Notification`);
    }
  });
  renameProperties(notification, propertyMappings);
}

/**
 * Checks if the given ApnsPayload object is valid. The object must have a valid aps value.
 *
 * @param {ApnsPayload} payload An object to be validated.
 */
function validateApnsPayload(payload: ApnsPayload | undefined): void {
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
function validateAps(aps: Aps): void {
  if (typeof aps === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(aps)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'apns.payload.aps must be a non-null object');
  }
  validateApsAlert(aps.alert);
  validateApsSound(aps.sound);

  const propertyMappings: { [key: string]: string } = {
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

function validateApsSound(sound: string | CriticalSound | undefined): void {
  if (typeof sound === 'undefined' || validator.isNonEmptyString(sound)) {
    return;
  } else if (!validator.isNonNullObject(sound)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'apns.payload.aps.sound must be a non-empty string or a non-null object');
  }

  if (!validator.isNonEmptyString(sound.name)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'apns.payload.aps.sound.name must be a non-empty string');
  }
  const volume = sound.volume;
  if (typeof volume !== 'undefined') {
    if (!validator.isNumber(volume)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD,
        'apns.payload.aps.sound.volume must be a number');
    }
    if (volume < 0 || volume > 1) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD,
        'apns.payload.aps.sound.volume must be in the interval [0, 1]');
    }
  }
  const soundObject = sound as { [key: string]: any };
  const key = 'critical';
  const critical = soundObject[key];
  if (typeof critical !== 'undefined' && critical !== 1) {
    if (critical === true) {
      soundObject[key] = 1;
    } else {
      delete soundObject[key];
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
function validateApsAlert(alert: string | ApsAlert | undefined): void {
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
  if (validator.isNonEmptyArray(apsAlert.subtitleLocArgs) &&
    !validator.isNonEmptyString(apsAlert.subtitleLocKey)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'apns.payload.aps.alert.subtitleLocKey is required when specifying subtitleLocArgs');
  }

  const propertyMappings = {
    locKey: 'loc-key',
    locArgs: 'loc-args',
    titleLocKey: 'title-loc-key',
    titleLocArgs: 'title-loc-args',
    subtitleLocKey: 'subtitle-loc-key',
    subtitleLocArgs: 'subtitle-loc-args',
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
function validateAndroidConfig(config: AndroidConfig | undefined): void {
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
    const duration: string = transformMillisecondsToSecondsString(config.ttl);
    (config as any).ttl = duration;
  }
  validateStringMap(config.data, 'android.data');
  validateAndroidNotification(config.notification);
  validateAndroidFcmOptions(config.fcmOptions);

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
function validateAndroidNotification(notification: AndroidNotification | undefined): void {
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
  if (typeof notification.imageUrl !== 'undefined' &&
    !validator.isURL(notification.imageUrl)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'android.notification.imageUrl must be a valid URL string');
  }

  if (typeof notification.eventTimestamp !== 'undefined') {
    if (!(notification.eventTimestamp instanceof Date)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD, 'android.notification.eventTimestamp must be a valid `Date` object');
    }
    // Convert timestamp to RFC3339 UTC "Zulu" format, example "2014-10-02T15:01:23.045123456Z"
    const zuluTimestamp = notification.eventTimestamp.toISOString();
    (notification as any).eventTimestamp = zuluTimestamp;
  }

  if (typeof notification.vibrateTimingsMillis !== 'undefined') {
    if (!validator.isNonEmptyArray(notification.vibrateTimingsMillis)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_PAYLOAD,
        'android.notification.vibrateTimingsMillis must be a non-empty array of numbers');
    }
    const vibrateTimings: string[] = [];
    notification.vibrateTimingsMillis.forEach((value) => {
      if (!validator.isNumber(value) || value < 0) {
        throw new FirebaseMessagingError(
          MessagingClientErrorCode.INVALID_PAYLOAD,
          'android.notification.vibrateTimingsMillis must be non-negative durations in milliseconds');
      }
      const duration = transformMillisecondsToSecondsString(value);
      vibrateTimings.push(duration);
    });
    (notification as any).vibrateTimingsMillis = vibrateTimings;
  }

  if (typeof notification.priority !== 'undefined') {
    const priority = 'PRIORITY_' + notification.priority.toUpperCase();
    (notification as any).priority = priority;
  }

  if (typeof notification.visibility !== 'undefined') {
    const visibility = notification.visibility.toUpperCase();
    (notification as any).visibility = visibility;
  }

  validateLightSettings(notification.lightSettings);

  const propertyMappings = {
    clickAction: 'click_action',
    bodyLocKey: 'body_loc_key',
    bodyLocArgs: 'body_loc_args',
    titleLocKey: 'title_loc_key',
    titleLocArgs: 'title_loc_args',
    channelId: 'channel_id',
    imageUrl: 'image',
    eventTimestamp: 'event_time',
    localOnly: 'local_only',
    priority: 'notification_priority',
    vibrateTimingsMillis: 'vibrate_timings',
    defaultVibrateTimings: 'default_vibrate_timings',
    defaultSound: 'default_sound',
    lightSettings: 'light_settings',
    defaultLightSettings: 'default_light_settings',
    notificationCount: 'notification_count',
  };
  renameProperties(notification, propertyMappings);
}

/**
 * Checks if the given LightSettings object is valid. The object must have valid color and
 * light on/off duration parameters. If successful, transforms the input object by renaming
 * keys to valid Android keys.
 *
 * @param {LightSettings} lightSettings An object to be validated.
 */
function validateLightSettings(lightSettings?: LightSettings): void {
  if (typeof lightSettings === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(lightSettings)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'android.notification.lightSettings must be a non-null object');
  }

  if (!validator.isNumber(lightSettings.lightOnDurationMillis) || lightSettings.lightOnDurationMillis < 0) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'android.notification.lightSettings.lightOnDurationMillis must be a non-negative duration in milliseconds');
  }
  const durationOn = transformMillisecondsToSecondsString(lightSettings.lightOnDurationMillis);
  (lightSettings as any).lightOnDurationMillis = durationOn;

  if (!validator.isNumber(lightSettings.lightOffDurationMillis) || lightSettings.lightOffDurationMillis < 0) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'android.notification.lightSettings.lightOffDurationMillis must be a non-negative duration in milliseconds');
  }
  const durationOff = transformMillisecondsToSecondsString(lightSettings.lightOffDurationMillis);
  (lightSettings as any).lightOffDurationMillis = durationOff;

  if (!validator.isString(lightSettings.color) ||
    (!/^#[0-9a-fA-F]{6}$/.test(lightSettings.color) && !/^#[0-9a-fA-F]{8}$/.test(lightSettings.color))) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD,
      'android.notification.lightSettings.color must be in the form #RRGGBB or #RRGGBBAA format');
  }
  const colorString = lightSettings.color.length === 7 ? lightSettings.color + 'FF' : lightSettings.color;
  const rgb = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/i.exec(colorString);
  if (!rgb || rgb.length < 4) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INTERNAL_ERROR,
      'regex to extract rgba values from ' + colorString + ' failed.');
  }
  const color = {
    red: parseInt(rgb[1], 16) / 255.0,
    green: parseInt(rgb[2], 16) / 255.0,
    blue: parseInt(rgb[3], 16) / 255.0,
    alpha: parseInt(rgb[4], 16) / 255.0,
  };
  (lightSettings as any).color = color;

  const propertyMappings = {
    lightOnDurationMillis: 'light_on_duration',
    lightOffDurationMillis: 'light_off_duration',
  };
  renameProperties(lightSettings, propertyMappings);
}

/**
 * Checks if the given AndroidFcmOptions object is valid.
 *
 * @param {AndroidFcmOptions} fcmOptions An object to be validated.
 */
function validateAndroidFcmOptions(fcmOptions: AndroidFcmOptions | undefined): void {
  if (typeof fcmOptions === 'undefined') {
    return;
  } else if (!validator.isNonNullObject(fcmOptions)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'fcmOptions must be a non-null object');
  }

  if (typeof fcmOptions.analyticsLabel !== 'undefined' && !validator.isString(fcmOptions.analyticsLabel)) {
    throw new FirebaseMessagingError(
      MessagingClientErrorCode.INVALID_PAYLOAD, 'analyticsLabel must be a string value');
  }
}

/**
 * Transforms milliseconds to the format expected by FCM service.
 * Returns the duration in seconds with up to nine fractional
 * digits, terminated by 's'. Example: "3.5s".
 *
 * @param {number} milliseconds The duration in milliseconds.
 * @return {string} The resulting formatted string in seconds with up to nine fractional
 * digits, terminated by 's'.
 */
function transformMillisecondsToSecondsString(milliseconds: number): string {
  let duration: string;
  const seconds = Math.floor(milliseconds / 1000);
  const nanos = (milliseconds - seconds * 1000) * 1000000;
  if (nanos > 0) {
    let nanoString = nanos.toString();
    while (nanoString.length < 9) {
      nanoString = '0' + nanoString;
    }
    duration = `${seconds}.${nanoString}s`;
  } else {
    duration = `${seconds}s`;
  }
  return duration;
}
