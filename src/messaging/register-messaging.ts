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

import {Messaging} from './messaging';
import {AppHook, FirebaseApp} from '../firebase-app';
import {FirebaseServiceInterface} from '../firebase-service';
import * as firebase from '../default-namespace';
import {FirebaseServiceNamespace} from '../firebase-namespace';

/**
 * Factory function that creates a new Messaging service.
 *
 * @param {Object} app The app for this service.
 * @param {function(Object)} extendApp An extend function to extend the app namespace.
 *
 * @return {Messaging} The Messaging service for the specified app.
 */
function serviceFactory(app: FirebaseApp, extendApp: (props: Object) => void): FirebaseServiceInterface {
  return new Messaging(app);
}

/**
 * Handles app life-cycle events.
 *
 * @param {string} event The app event that is occurring.
 * @param {FirebaseApp} app The app for which the app hook is firing.
 */
let appHook: AppHook = (event: string, app: FirebaseApp) => {
  return;
};

export default function(): FirebaseServiceNamespace<FirebaseServiceInterface> {
  return firebase.INTERNAL.registerService(
    'messaging',
    serviceFactory,
    {Messaging},
    appHook
  );
}
