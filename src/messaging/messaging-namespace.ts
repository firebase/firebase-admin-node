/*!
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

import { App } from '../app';
import { Messaging as TMessaging } from './messaging';
import {
  AndroidConfig as TAndroidConfig,
  AndroidFcmOptions as TAndroidFcmOptions,
  AndroidNotification as TAndroidNotification,
  ApnsConfig as TApnsConfig,
  ApnsFcmOptions as TApnsFcmOptions,
  ApnsPayload as TApnsPayload,
  Aps as TAps,
  ApsAlert as TApsAlert,
  BatchResponse as TBatchResponse,
  CriticalSound as TCriticalSound,
  ConditionMessage as TConditionMessage,
  FcmOptions as TFcmOptions,
  LightSettings as TLightSettings,
  Message as TMessage,
  MessagingTopicManagementResponse as TMessagingTopicManagementResponse,
  MulticastMessage as TMulticastMessage,
  Notification as TNotification,
  SendResponse as TSendResponse,
  TokenMessage as TTokenMessage,
  TopicMessage as TTopicMessage,
  WebpushConfig as TWebpushConfig,
  WebpushFcmOptions as TWebpushFcmOptions,
  WebpushNotification as TWebpushNotification,

  // Legacy APIs
  DataMessagePayload as TDataMessagePayload,
  MessagingConditionResponse as TMessagingConditionResponse,
  MessagingDeviceGroupResponse as TMessagingDeviceGroupResponse,
  MessagingDeviceResult as TMessagingDeviceResult,
  MessagingDevicesResponse as TMessagingDevicesResponse,
  MessagingOptions as TMessagingOptions,
  MessagingPayload as TMessagingPayload,
  MessagingTopicResponse as TMessagingTopicResponse,
  NotificationMessagePayload as TNotificationMessagePayload,
} from './messaging-api';

/**
 * Gets the {@link firebase-admin.messaging#Messaging} service for the
 * default app or a given app.
 *
 * `admin.messaging()` can be called with no arguments to access the default
 * app's `Messaging` service or as `admin.messaging(app)` to access the
 * `Messaging` service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the Messaging service for the default app
 * var defaultMessaging = admin.messaging();
 * ```
 *
 * @example
 * ```javascript
 * // Get the Messaging service for a given app
 * var otherMessaging = admin.messaging(otherApp);
 * ```
 *
 * @param app - Optional app whose `Messaging` service to
 *   return. If not provided, the default `Messaging` service will be returned.
 *
 * @returns The default `Messaging` service if no
 *   app is provided or the `Messaging` service associated with the provided
 *   app.
 */
export declare function messaging(app?: App): messaging.Messaging;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace messaging {
  /**
   * Type alias to {@link firebase-admin.messaging#Messaging}.
   */
  export type Messaging = TMessaging;

  /**
   * Type alias to {@link firebase-admin.messaging#AndroidConfig}.
   */
  export type AndroidConfig = TAndroidConfig;

  /**
   * Type alias to {@link firebase-admin.messaging#AndroidFcmOptions}.
   */
  export type AndroidFcmOptions = TAndroidFcmOptions;

  /**
   * Type alias to {@link firebase-admin.messaging#AndroidNotification}.
   */
  export type AndroidNotification = TAndroidNotification;

  /**
   * Type alias to {@link firebase-admin.messaging#ApnsConfig}.
   */
  export type ApnsConfig = TApnsConfig;

  /**
   * Type alias to {@link firebase-admin.messaging#ApnsFcmOptions}.
   */
  export type ApnsFcmOptions = TApnsFcmOptions;

  /**
   * Type alias to {@link firebase-admin.messaging#ApnsPayload}.
   */
  export type ApnsPayload = TApnsPayload;

  /**
   * Type alias to {@link firebase-admin.messaging#Aps}.
   */
  export type Aps = TAps;

  /**
   * Type alias to {@link firebase-admin.messaging#ApsAlert}.
   */
  export type ApsAlert = TApsAlert;

  /**
   * Type alias to {@link firebase-admin.messaging#BatchResponse}.
   */
  export type BatchResponse = TBatchResponse;

  /**
   * Type alias to {@link firebase-admin.messaging#CriticalSound}.
   */
  export type CriticalSound = TCriticalSound;

  /**
   * Type alias to {@link firebase-admin.messaging#ConditionMessage}.
   */
  export type ConditionMessage = TConditionMessage;

  /**
   * Type alias to {@link firebase-admin.messaging#FcmOptions}.
   */
  export type FcmOptions = TFcmOptions;

  /**
   * Type alias to {@link firebase-admin.messaging#LightSettings}.
   */
  export type LightSettings = TLightSettings;

  /**
   * Type alias to {@link firebase-admin.messaging#Message}.
   */
  export type Message = TMessage;

  /**
   * Type alias to {@link firebase-admin.messaging#MessagingTopicManagementResponse}.
   */
  export type MessagingTopicManagementResponse = TMessagingTopicManagementResponse;

  /**
   * Type alias to {@link firebase-admin.messaging#MulticastMessage}.
   */
  export type MulticastMessage = TMulticastMessage;

  /**
   * Type alias to {@link firebase-admin.messaging#Notification}.
   */
  export type Notification = TNotification;

  /**
   * Type alias to {@link firebase-admin.messaging#SendResponse}.
   */
  export type SendResponse = TSendResponse;

  /**
   * Type alias to {@link firebase-admin.messaging#TokenMessage}.
   */
  export type TokenMessage = TTokenMessage;

  /**
   * Type alias to {@link firebase-admin.messaging#TopicMessage}.
   */
  export type TopicMessage = TTopicMessage;

  /**
   * Type alias to {@link firebase-admin.messaging#WebpushConfig}.
   */
  export type WebpushConfig = TWebpushConfig;

  /**
   * Type alias to {@link firebase-admin.messaging#WebpushFcmOptions}.
   */
  export type WebpushFcmOptions = TWebpushFcmOptions;

  /**
   * Type alias to {@link firebase-admin.messaging#WebpushNotification}.
   */
  export type WebpushNotification = TWebpushNotification;

  // Legacy APIs

  /**
   * Type alias to {@link firebase-admin.messaging#DataMessagePayload}.
   */
  export type DataMessagePayload = TDataMessagePayload;

  /**
   * Type alias to {@link firebase-admin.messaging#MessagingConditionResponse}.
   */
  export type MessagingConditionResponse = TMessagingConditionResponse;

  /**
   * Type alias to {@link firebase-admin.messaging#MessagingDeviceGroupResponse}.
   */
  export type MessagingDeviceGroupResponse = TMessagingDeviceGroupResponse;

  /**
   * Type alias to {@link firebase-admin.messaging#MessagingDeviceResult}.
   */
  export type MessagingDeviceResult = TMessagingDeviceResult;

  /**
   * Type alias to {@link firebase-admin.messaging#MessagingDevicesResponse}.
   */
  export type MessagingDevicesResponse = TMessagingDevicesResponse;

  /**
   * Type alias to {@link firebase-admin.messaging#MessagingOptions}.
   */
  export type MessagingOptions = TMessagingOptions;

  /**
   * Type alias to {@link firebase-admin.messaging#MessagingPayload}.
   */
  export type MessagingPayload = TMessagingPayload;

  /**
   * Type alias to {@link firebase-admin.messaging#MessagingTopicResponse}.
   */
  export type MessagingTopicResponse = TMessagingTopicResponse;

  /**
   * Type alias to {@link firebase-admin.messaging#NotificationMessagePayload}.
   */
  export type NotificationMessagePayload = TNotificationMessagePayload;
}
