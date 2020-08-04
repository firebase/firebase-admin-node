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

import { FirebaseApp } from '../firebase-app';
import {
  MessagingConditionResponse, MessagingDeviceGroupResponse,
  MessagingDevicesResponse, MessagingTopicManagementResponse, MessagingTopicResponse
} from './messaging-types';
import { BatchResponse, Message, MessagingPayload, MessagingOptions, MulticastMessage } from './messaging-types';

/**
 * Gets the {@link admin.messaging.Messaging `Messaging`} service for the
 * current app.
 *
 * @example
 * ```javascript
 * var messaging = app.messaging();
 * // The above is shorthand for:
 * // var messaging = admin.messaging(app);
 * ```
 *
 * @return The `Messaging` service for the current app.
 */
export interface Messaging {
  /**
   * The {@link admin.app.App app} associated with the current `Messaging` service
   * instance.
   *
   * @example
   * ```javascript
   * var app = messaging.app;
   * ```
   */
  app: FirebaseApp;

  /**
   * Sends the given message via FCM.
   *
   * @param message The message payload.
   * @param dryRun Whether to send the message in the dry-run
   *   (validation only) mode.
   * @return A promise fulfilled with a unique message ID
   *   string after the message has been successfully handed off to the FCM
   *   service for delivery.
   */
  send(message: Message, dryRun?: boolean): Promise<string>;

  /**
   * Sends all the messages in the given array via Firebase Cloud Messaging.
   * Employs batching to send the entire list as a single RPC call. Compared
   * to the `send()` method, this method is a significantly more efficient way
   * to send multiple messages.
   *
   * The responses list obtained from the return value
   * corresponds to the order of tokens in the `MulticastMessage`. An error
   * from this method indicates a total failure -- i.e. none of the messages in
   * the list could be sent. Partial failures are indicated by a `BatchResponse`
   * return value.
   *
   * @param messages A non-empty array
   *   containing up to 500 messages.
   * @param dryRun Whether to send the messages in the dry-run
   *   (validation only) mode.
   * @return A Promise fulfilled with an object representing the result of the
   *   send operation.
   */
  sendAll(
    messages: Array<Message>,
    dryRun?: boolean
  ): Promise<BatchResponse>;

  /**
   * Sends the given multicast message to all the FCM registration tokens
   * specified in it.
   *
   * This method uses the `sendAll()` API under the hood to send the given
   * message to all the target recipients. The responses list obtained from the
   * return value corresponds to the order of tokens in the `MulticastMessage`.
   * An error from this method indicates a total failure -- i.e. the message was
   * not sent to any of the tokens in the list. Partial failures are indicated by
   * a `BatchResponse` return value.
   *
   * @param message A multicast message
   *   containing up to 500 tokens.
   * @param dryRun Whether to send the message in the dry-run
   *   (validation only) mode.
   * @return A Promise fulfilled with an object representing the result of the
   *   send operation.
   */
  sendMulticast(
    message: MulticastMessage,
    dryRun?: boolean
  ): Promise<BatchResponse>;

  /**
   * Sends an FCM message to a single device corresponding to the provided
   * registration token.
   *
   * See
   * [Send to individual devices](/docs/cloud-messaging/admin/legacy-fcm#send_to_individual_devices)
   * for code samples and detailed documentation. Takes either a
   * `registrationToken` to send to a single device or a
   * `registrationTokens` parameter containing an array of tokens to send
   * to multiple devices.
   *
   * @param registrationToken A device registration token or an array of
   *   device registration tokens to which the message should be sent.
   * @param payload The message payload.
   * @param options Optional options to
   *   alter the message.
   *
   * @return A promise fulfilled with the server's response after the message
   *   has been sent.
   */
  sendToDevice(
    registrationToken: string | string[],
    payload: MessagingPayload,
    options?: MessagingOptions
  ): Promise<MessagingDevicesResponse>;

  /**
   * Sends an FCM message to a device group corresponding to the provided
   * notification key.
   *
   * See
   * [Send to a device group](/docs/cloud-messaging/admin/legacy-fcm#send_to_a_device_group)
   * for code samples and detailed documentation.
   *
   * @param notificationKey The notification key for the device group to
   *   which to send the message.
   * @param payload The message payload.
   * @param options Optional options to
   *   alter the message.
   *
   * @return A promise fulfilled with the server's response after the message
   *   has been sent.
   */
  sendToDeviceGroup(
    notificationKey: string,
    payload: MessagingPayload,
    options?: MessagingOptions
  ): Promise<MessagingDeviceGroupResponse>;

  /**
   * Sends an FCM message to a topic.
   *
   * See
   * [Send to a topic](/docs/cloud-messaging/admin/legacy-fcm#send_to_a_topic)
   * for code samples and detailed documentation.
   *
   * @param topic The topic to which to send the message.
   * @param payload The message payload.
   * @param options Optional options to
   *   alter the message.
   *
   * @return A promise fulfilled with the server's response after the message
   *   has been sent.
   */
  sendToTopic(
    topic: string,
    payload: MessagingPayload,
    options?: MessagingOptions
  ): Promise<MessagingTopicResponse>;

  /**
   * Sends an FCM message to a condition.
   *
   * See
   * [Send to a condition](/docs/cloud-messaging/admin/legacy-fcm#send_to_a_condition)
   * for code samples and detailed documentation.
   *
   * @param condition The condition determining to which topics to send
   *   the message.
   * @param payload The message payload.
   * @param options Optional options to
   *   alter the message.
   *
   * @return A promise fulfilled with the server's response after the message
   *   has been sent.
   */
  sendToCondition(
    condition: string,
    payload: MessagingPayload,
    options?: MessagingOptions
  ): Promise<MessagingConditionResponse>;

  /**
   * Subscribes a device to an FCM topic.
   *
   * See [Subscribe to a
   * topic](/docs/cloud-messaging/manage-topics#suscribe_and_unsubscribe_using_the)
   * for code samples and detailed documentation. Optionally, you can provide an
   * array of tokens to subscribe multiple devices.
   *
   * @param registrationTokens A token or array of registration tokens
   *   for the devices to subscribe to the topic.
   * @param topic The topic to which to subscribe.
   *
   * @return A promise fulfilled with the server's response after the device has been
   *   subscribed to the topic.
   */
  subscribeToTopic(
    registrationTokens: string | string[],
    topic: string
  ): Promise<MessagingTopicManagementResponse>;

  /**
   * Unsubscribes a device from an FCM topic.
   *
   * See [Unsubscribe from a
   * topic](/docs/cloud-messaging/admin/manage-topic-subscriptions#unsubscribe_from_a_topic)
   * for code samples and detailed documentation.  Optionally, you can provide an
   * array of tokens to unsubscribe multiple devices.
   *
   * @param registrationTokens A device registration token or an array of
   *   device registration tokens to unsubscribe from the topic.
   * @param topic The topic from which to unsubscribe.
   *
   * @return A promise fulfilled with the server's response after the device has been
   *   unsubscribed from the topic.
   */
  unsubscribeFromTopic(
    registrationTokens: string | string[],
    topic: string
  ): Promise<MessagingTopicManagementResponse>;
}