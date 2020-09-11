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

import { FirebaseApp } from '../firebase-app';
import * as messagingApi from './messaging';
import * as messagingTypesApi from './messaging-types';
import * as firebaseAdmin from '../index';

export function messaging(app?: FirebaseApp): messagingApi.Messaging {
  if (typeof(app) === 'undefined') {
    app = firebaseAdmin.app();
  }
  return app.messaging();
}

/**
 * We must define a namespace to make the typings work correctly. Otherwise
 * `admin.messaging()` cannot be called like a function. Temporarily,
 * admin.messaging is used as the namespace name because we cannot barrel 
 * re-export the contents from messsaging, and we want it to
 * match the namespacing in the re-export inside src/index.d.ts
 */
/* eslint-disable @typescript-eslint/no-namespace */
export namespace admin.messaging {
  // See https://github.com/microsoft/TypeScript/issues/4336
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // See https://github.com/typescript-eslint/typescript-eslint/issues/363
  export import AndroidConfig = messagingTypesApi.AndroidConfig;
  export import AndroidFcmOptions = messagingTypesApi.AndroidFcmOptions;
  export import AndroidNotification = messagingTypesApi.AndroidNotification;
  export import ApnsConfig = messagingTypesApi.ApnsConfig;
  export import ApnsFcmOptions = messagingTypesApi.ApnsFcmOptions;
  export import ApnsPayload = messagingTypesApi.ApnsPayload;
  export import Aps = messagingTypesApi.Aps;
  export import ApsAlert = messagingTypesApi.ApsAlert;
  export import BatchResponse = messagingTypesApi.BatchResponse;
  export import CriticalSound = messagingTypesApi.CriticalSound;
  export import FcmOptions = messagingTypesApi.FcmOptions;
  export import LightSettings = messagingTypesApi.LightSettings;
  export import Message = messagingTypesApi.Message;
  export import MessagingTopicManagementResponse = messagingTypesApi.MessagingTopicManagementResponse;
  export import MulticastMessage = messagingTypesApi.MulticastMessage;
  export import Notification = messagingTypesApi.Notification;
  export import SendResponse = messagingTypesApi.SendResponse;
  export import WebpushConfig = messagingTypesApi.WebpushConfig;
  export import WebpushFcmOptions = messagingTypesApi.WebpushFcmOptions;
  export import WebpushNotification = messagingTypesApi.WebpushNotification;

  // See https://github.com/microsoft/TypeScript/issues/4336
  // Allows for exposing classes as interfaces in typings
  /* eslint-disable @typescript-eslint/no-empty-interface */
  export interface Messaging extends messagingApi.Messaging {}

  // Legacy API types.
  export import DataMessagePayload = messagingTypesApi.DataMessagePayload;
  export import MessagingConditionResponse = messagingTypesApi.MessagingConditionResponse;
  export import MessagingDeviceGroupResponse = messagingTypesApi.MessagingDeviceGroupResponse;
  export import MessagingDevicesResponse = messagingTypesApi.MessagingDevicesResponse;
  export import MessagingDeviceResult = messagingTypesApi.MessagingDeviceResult;
  export import MessagingOptions = messagingTypesApi.MessagingOptions;
  export import MessagingPayload = messagingTypesApi.MessagingPayload;
  export import MessagingTopicResponse = messagingTypesApi.MessagingTopicResponse;
  export import NotificationMessagePayload = messagingTypesApi.NotificationMessagePayload;
}
