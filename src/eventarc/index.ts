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

import { App, getApp } from '../app';
import { FirebaseApp } from '../app/firebase-app';

import { Eventarc } from './eventarc';

export { Eventarc, Channel, CloudEvent, CloudEventVersion } from './eventarc';
export { FirebaseEventarcError } from './eventarc-utils';

export function getEventarc(app?: App): Eventarc {
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  return firebaseApp.getOrInitService('eventarc', (app) => new Eventarc(app));
}
