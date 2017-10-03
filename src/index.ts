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

import * as firebase from './default-namespace';
import registerAuth from './auth/register-auth';
import registerMessaging from './messaging/register-messaging';
import registerStorage from './storage/register-storage';
import registerFirestore from './firestore/register-firestore';

// Register the Database service
// For historical reasons, the database code is included as minified code and registers itself
// as a side effect of requiring the file.
/* tslint:disable:no-var-requires */
require('./database/database');
/* tslint:enable:no-var-requires */

// Register the Auth service
registerAuth();

// Register the Messaging service
registerMessaging();

// Register the Storage service
registerStorage();

// Register the Firestore service
registerFirestore();

export = firebase;
