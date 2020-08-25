import * as _admin from './index.d';
import { Agent } from 'http';

export namespace admin.credential {
  /**
   * Interface that provides Google OAuth2 access tokens used to authenticate
   * with Firebase services.
   *
   * In most cases, you will not need to implement this yourself and can instead
   * use the default implementations provided by
   * {@link admin.credential `admin.credential`}.
   */
  interface Credential {

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
    getAccessToken(): Promise<_admin.GoogleOAuthAccessToken>;
  }


  /**
   * Returns a credential created from the
   * {@link
   *    https://developers.google.com/identity/protocols/application-default-credentials
   *    Google Application Default Credentials}
   * that grants admin access to Firebase services. This credential can be used
   * in the call to
   * {@link
   *   https://firebase.google.com/docs/reference/admin/node/admin#.initializeApp
   *  `admin.initializeApp()`}.
   *
   * Google Application Default Credentials are available on any Google
   * infrastructure, such as Google App Engine and Google Compute Engine.
   *
   * See
   * {@link
   *   https://firebase.google.com/docs/admin/setup#initialize_the_sdk
   *   Initialize the SDK}
   * for more details.
   *
   * @example
   * ```javascript
   * admin.initializeApp({
   *   credential: admin.credential.applicationDefault(),
   *   databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
   * });
   * ```
   *
   * @param {!Object=} httpAgent Optional [HTTP Agent](https://nodejs.org/api/http.html#http_class_http_agent)
   *   to be used when retrieving access tokens from Google token servers.
   *
   * @return {!admin.credential.Credential} A credential authenticated via Google
   *   Application Default Credentials that can be used to initialize an app.
   */
  function applicationDefault(httpAgent?: Agent): admin.credential.Credential;

  /**
   * Returns a credential created from the provided service account that grants
   * admin access to Firebase services. This credential can be used in the call
   * to
   * {@link
   *   https://firebase.google.com/docs/reference/admin/node/admin#.initializeApp
   *   `admin.initializeApp()`}.
   *
   * See
   * {@link
   *   https://firebase.google.com/docs/admin/setup#initialize_the_sdk
   *   Initialize the SDK}
   * for more details.
   *
   * @example
   * ```javascript
   * // Providing a path to a service account key JSON file
   * var serviceAccount = require("path/to/serviceAccountKey.json");
   * admin.initializeApp({
   *   credential: admin.credential.cert(serviceAccount),
   *   databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
   * });
   * ```
   *
   * @example
   * ```javascript
   * // Providing a service account object inline
   * admin.initializeApp({
   *   credential: admin.credential.cert({
   *     projectId: "<PROJECT_ID>",
   *     clientEmail: "foo@<PROJECT_ID>.iam.gserviceaccount.com",
   *     privateKey: "-----BEGIN PRIVATE KEY-----<KEY>-----END PRIVATE KEY-----\n"
   *   }),
   *   databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
   * });
   * ```
   *
   * @param serviceAccountPathOrObject The path to a service
   *   account key JSON file or an object representing a service account key.
   * @param httpAgent Optional [HTTP Agent](https://nodejs.org/api/http.html#http_class_http_agent)
   *   to be used when retrieving access tokens from Google token servers.
   *
   * @return A credential authenticated via the
   *   provided service account that can be used to initialize an app.
   */
  function cert(serviceAccountPathOrObject: string | _admin.ServiceAccount, httpAgent?: Agent): admin.credential.Credential;

  /**
   * Returns a credential created from the provided refresh token that grants
   * admin access to Firebase services. This credential can be used in the call
   * to
   * {@link
   *   https://firebase.google.com/docs/reference/admin/node/admin#.initializeApp
   *   `admin.initializeApp()`}.
   *
   * See
   * {@link
   *   https://firebase.google.com/docs/admin/setup#initialize_the_sdk
   *   Initialize the SDK}
   * for more details.
   *
   * @example
   * ```javascript
   * // Providing a path to a refresh token JSON file
   * var refreshToken = require("path/to/refreshToken.json");
   * admin.initializeApp({
   *   credential: admin.credential.refreshToken(refreshToken),
   *   databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
   * });
   * ```
   *
   * @param refreshTokenPathOrObject The path to a Google
   *   OAuth2 refresh token JSON file or an object representing a Google OAuth2
   *   refresh token.
   * @param httpAgent Optional [HTTP Agent](https://nodejs.org/api/http.html#http_class_http_agent)
   *   to be used when retrieving access tokens from Google token servers.
   *
   * @return A credential authenticated via the
   *   provided service account that can be used to initialize an app.
   */
  function refreshToken(refreshTokenPathOrObject: string | object, httpAgent?: Agent): admin.credential.Credential;
}
