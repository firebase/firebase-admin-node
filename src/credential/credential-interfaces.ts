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

// TODO: According to the typings this is part of the Firebase Namespace today
// and not credential; it will need to be moved accordingly.
/**
 * Interface for Google OAuth 2.0 access tokens.
 */
export interface GoogleOAuthAccessToken {
  /* tslint:disable:variable-name */
  access_token: string;
  expires_in: number;
  /* tslint:enable:variable-name */
}

/**
 * Interface that provides Google OAuth2 access tokens used to authenticate
 * with Firebase services.
 *
 * In most cases, you will not need to implement this yourself and can instead
 * use the default implementations provided by
 * {@link admin.credential `admin.credential`}.
 */
export interface Credential {
  /**
   * Returns a Google OAuth2 access token object used to authenticate with
   * Firebase services.
   *
   * This object contains the following properties:
   * * `access_token` (`string`): The actual Google OAuth2 access token.
   * * `expires_in` (`number`): The number of seconds from when the token was
   *   issued that it expires.
   *
   * @return A Google OAuth2 access token object.
   */
  getAccessToken(): Promise<GoogleOAuthAccessToken>;
}
