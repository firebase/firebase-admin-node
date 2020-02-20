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

import { FirebaseRemoteConfigError } from './remote-config-utils';
import { FirebaseApp } from '../firebase-app';
import * as validator from '../utils/validator';

/**
 * Class that facilitates sending requests to the Firebase Remote Config backend API.
 *
 * @private
 */
export class RemoteConfigApiClient {

	constructor(app: FirebaseApp) {
		if (!validator.isNonNullObject(app) || !('options' in app)) {
			throw new FirebaseRemoteConfigError(
				'invalid-argument',
				'First argument passed to admin.RemoteConfig() must be a valid Firebase app '
				+ 'instance.');
		}
	}

	// Just a placeholder for now
	//TODO(lahirumaramba): implement the functionality
	public getTemplate() { }
}
