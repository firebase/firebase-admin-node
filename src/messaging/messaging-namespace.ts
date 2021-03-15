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
 * Gets the {@link messaging.Messaging `Messaging`} service for the
 * default app or a given app.
 *
 * `admin.messaging()` can be called with no arguments to access the default
 * app's {@link messaging.Messaging `Messaging`} service or as
 * `admin.messaging(app)` to access the
 * {@link messaging.Messaging `Messaging`} service associated with a
 * specific app.
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
 * @param app Optional app whose `Messaging` service to
 *   return. If not provided, the default `Messaging` service will be returned.
 *
 * @return The default `Messaging` service if no
 *   app is provided or the `Messaging` service associated with the provided
 *   app.
 */
export declare function messaging(app?: App): messaging.Messaging;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace messaging {
  export type Messaging = TMessaging;

  export type AndroidConfig = TAndroidConfig;
  export type AndroidFcmOptions = TAndroidFcmOptions;
  export type AndroidNotification = TAndroidNotification;
  export type ApnsConfig = TApnsConfig;
  export type ApnsFcmOptions = TApnsFcmOptions;
  export type ApnsPayload = TApnsPayload;
  export type Aps = TAps;
  export type ApsAlert = TApsAlert;
  export type BatchResponse = TBatchResponse;
  export type CriticalSound = TCriticalSound;
  export type ConditionMessage = TConditionMessage;
  export type FcmOptions = TFcmOptions;
  export type LightSettings = TLightSettings;
  export type Message = TMessage;
  export type MessagingTopicManagementResponse = TMessagingTopicManagementResponse;
  export type MulticastMessage = TMulticastMessage;
  export type Notification = TNotification;
  export type SendResponse = TSendResponse;
  export type TokenMessage = TTokenMessage;
  export type TopicMessage = TTopicMessage;
  export type WebpushConfig = TWebpushConfig;
  export type WebpushFcmOptions = TWebpushFcmOptions;
  export type WebpushNotification = TWebpushNotification;

  // Legacy APIs
  export type DataMessagePayload = TDataMessagePayload;
  export type MessagingConditionResponse = TMessagingConditionResponse;
  export type MessagingDeviceGroupResponse = TMessagingDeviceGroupResponse;
  export type MessagingDeviceResult = TMessagingDeviceResult;
  export type MessagingDevicesResponse = TMessagingDevicesResponse;
  export type MessagingOptions = TMessagingOptions;
  export type MessagingPayload = TMessagingPayload;
  export type MessagingTopicResponse = TMessagingTopicResponse;
  export type NotificationMessagePayload = TNotificationMessagePayload;
}
