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

import * as validator from '../utils/validator';

import {deepCopy} from '../utils/deep-copy';
import {FirebaseApp} from '../firebase-app';
import {FirebaseError} from '../utils/error';
import {AuthClientErrorCode, FirebaseAuthError} from '../utils/error';
import {
  HttpMethod, SignedApiRequestHandler, ApiSettings,
} from '../utils/api-request';
import {CreateRequest, UpdateRequest} from './user-record';


/** Firebase Auth backend host. */
const FIREBASE_AUTH_HOST = 'www.googleapis.com';
/** Firebase Auth backend port number. */
const FIREBASE_AUTH_PORT = 443;
/** Firebase Auth backend path. */
const FIREBASE_AUTH_PATH = '/identitytoolkit/v3/relyingparty/';
/** Firebase Auth request header. */
const FIREBASE_AUTH_HEADER = {
  'Content-Type': 'application/json',
  'X-Client-Version': 'Node/Admin/<XXX_SDK_VERSION_XXX>',
};
/** Firebase Auth request timeout duration in milliseconds. */
const FIREBASE_AUTH_TIMEOUT = 10000;


/** List of reserved claims which cannot be provided when creating a custom token. */
export const RESERVED_CLAIMS = [
  'acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash', 'exp', 'iat',
  'iss', 'jti', 'nbf', 'nonce', 'sub', 'firebase',
];

/** Maximum allowed number of characters in the custom claims payload. */
const MAX_CLAIMS_PAYLOAD_SIZE = 1000;

/** Maximum allowed number of users to batch download at one time. */
const MAX_DOWNLOAD_ACCOUNT_PAGE_SIZE = 1000;


/**
 * Validates a create/edit request object. All unsupported parameters
 * are removed from the original request. If an invalid field is passed
 * an error is thrown.
 *
 * @param {any} request The create/edit request object.
 */
function validateCreateEditRequest(request: any) {
    // Hash set of whitelisted parameters.
    let validKeys = {
      displayName: true,
      localId: true,
      email: true,
      password: true,
      rawPassword: true,
      emailVerified: true,
      photoUrl: true,
      disabled: true,
      disableUser: true,
      deleteAttribute: true,
      deleteProvider: true,
      sanityCheck: true,
      phoneNumber: true,
      customAttributes: true,
      validSince: true,
    };
    // Remove invalid keys from original request.
    for (let key in request) {
      if (!(key in validKeys)) {
        delete request[key];
      }
    }
    // For any invalid parameter, use the external key name in the error description.
    // displayName should be a string.
    if (typeof request.displayName !== 'undefined' &&
        typeof request.displayName !== 'string') {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_DISPLAY_NAME);
    }
    if (typeof request.localId !== 'undefined' && !validator.isUid(request.localId)) {
      // This is called localId on the backend but the developer specifies this as
      // uid externally. So the error message should use the client facing name.
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_UID);
    }
    // email should be a string and a valid email.
    if (typeof request.email !== 'undefined' && !validator.isEmail(request.email)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL);
    }
    // phoneNumber should be a string and a valid phone number.
    if (typeof request.phoneNumber !== 'undefined' &&
        !validator.isPhoneNumber(request.phoneNumber)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER);
    }
    // password should be a string and a minimum of 6 chars.
    if (typeof request.password !== 'undefined' &&
        !validator.isPassword(request.password)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PASSWORD);
    }
    // rawPassword should be a string and a minimum of 6 chars.
    if (typeof request.rawPassword !== 'undefined' &&
        !validator.isPassword(request.rawPassword)) {
      // This is called rawPassword on the backend but the developer specifies this as
      // password externally. So the error message should use the client facing name.
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PASSWORD);
    }
    // emailVerified should be a boolean.
    if (typeof request.emailVerified !== 'undefined' &&
        typeof request.emailVerified !== 'boolean') {
     throw new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL_VERIFIED);
    }
    // photoUrl should be a URL.
    if (typeof request.photoUrl !== 'undefined' &&
        !validator.isURL(request.photoUrl)) {
      // This is called photoUrl on the backend but the developer specifies this as
      // photoURL externally. So the error message should use the client facing name.
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PHOTO_URL);
    }
    // disabled should be a boolean.
    if (typeof request.disabled !== 'undefined' &&
        typeof request.disabled !== 'boolean') {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_DISABLED_FIELD);
    }
    // validSince should be a number.
    if (typeof request.validSince !== 'undefined' &&
        !validator.isNumber(request.validSince)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_TOKENS_VALID_AFTER_TIME);
    }
    // disableUser should be a boolean.
    if (typeof request.disableUser !== 'undefined' &&
        typeof request.disableUser !== 'boolean') {
      // This is called disableUser on the backend but the developer specifies this as
      // disabled externally. So the error message should use the client facing name.
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_DISABLED_FIELD);
    }
    // customAttributes should be stringified JSON with no blacklisted claims.
    // The payload should not exceed 1KB.
    if (typeof request.customAttributes !== 'undefined') {
      let developerClaims;
      try {
        developerClaims = JSON.parse(request.customAttributes);
      } catch (error) {
        // JSON parsing error. This should never happen as we stringify the claims internally.
        // However, we still need to check since setAccountInfo via edit requests could pass
        // this field.
        throw new FirebaseAuthError(AuthClientErrorCode.INVALID_CLAIMS, error.message);
      }
      const invalidClaims = [];
      // Check for any invalid claims.
      RESERVED_CLAIMS.forEach((blacklistedClaim) => {
        if (developerClaims.hasOwnProperty(blacklistedClaim)) {
          invalidClaims.push(blacklistedClaim);
        }
      });
      // Throw an error if an invalid claim is detected.
      if (invalidClaims.length > 0) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.FORBIDDEN_CLAIM,
          invalidClaims.length > 1 ?
          `Developer claims "${invalidClaims.join('", "')}" are reserved and cannot be specified.` :
          `Developer claim "${invalidClaims[0]}" is reserved and cannot be specified.`,
        );
      }
      // Check claims payload does not exceed maxmimum size.
      if (request.customAttributes.length > MAX_CLAIMS_PAYLOAD_SIZE) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.CLAIMS_TOO_LARGE,
          `Developer claims payload should not exceed ${MAX_CLAIMS_PAYLOAD_SIZE} characters.`,
        );
      }
    }
};


/** Instantiates the downloadAccount endpoint settings. */
export const FIREBASE_AUTH_DOWNLOAD_ACCOUNT = new ApiSettings('downloadAccount', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    // Validate next page token.
    if (typeof request.nextPageToken !== 'undefined' &&
        !validator.isNonEmptyString(request.nextPageToken)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PAGE_TOKEN);
    }
    // Validate max results.
    if (!validator.isNumber(request.maxResults) ||
        request.maxResults <= 0 ||
        request.maxResults > MAX_DOWNLOAD_ACCOUNT_PAGE_SIZE) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `Required "maxResults" must be a positive non-zero number that does not exceed ` +
        `the allowed ${MAX_DOWNLOAD_ACCOUNT_PAGE_SIZE}.`
      );
    }
  });


/** Instantiates the getAccountInfo endpoint settings. */
export const FIREBASE_AUTH_GET_ACCOUNT_INFO = new ApiSettings('getAccountInfo', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    if (!request.localId && !request.email && !request.phoneNumber) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Server request is missing user identifier');
    }
  })
  // Set response validator.
  .setResponseValidator((response: any) => {
    if (!response.users) {
      throw new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
    }
  });

/** Instantiates the deleteAccount endpoint settings. */
export const FIREBASE_AUTH_DELETE_ACCOUNT = new ApiSettings('deleteAccount', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    if (!request.localId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Server request is missing user identifier');
    }
  });

/** Instantiates the setAccountInfo endpoint settings for updating existing accounts. */
export const FIREBASE_AUTH_SET_ACCOUNT_INFO = new ApiSettings('setAccountInfo', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    // localId is a required parameter.
    if (typeof request.localId === 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Server request is missing user identifier');
    }
    validateCreateEditRequest(request);
  })
  // Set response validator.
  .setResponseValidator((response: any) => {
    // If the localId is not returned, then the request failed.
    if (!response.localId) {
      throw new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
    }
  });

/**
 * Instantiates the signupNewUser endpoint settings for creating a new user with or without
 * uid being specified. The backend will create a new one if not provided and return it.
 */
export const FIREBASE_AUTH_SIGN_UP_NEW_USER = new ApiSettings('signupNewUser', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    // signupNewUser does not support customAttributes.
    if (typeof request.customAttributes !== 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `"customAttributes" cannot be set when creating a new user.`,
      );
    }
    // signupNewUser does not support validSince.
    if (typeof request.validSince !== 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `"validSince" cannot be set when creating a new user.`,
      );
    }
    validateCreateEditRequest(request);
  })
  // Set response validator.
  .setResponseValidator((response: any) => {
    // If the localId is not returned, then the request failed.
    if (!response.localId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to create new user');
    }
  });

/**
 * Class that provides mechanism to send requests to the Firebase Auth backend endpoints.
 */
export class FirebaseAuthRequestHandler {
  private host: string = FIREBASE_AUTH_HOST;
  private port: number = FIREBASE_AUTH_PORT;
  private path: string = FIREBASE_AUTH_PATH;
  private headers: Object = FIREBASE_AUTH_HEADER;
  private timeout: number = FIREBASE_AUTH_TIMEOUT;
  private signedApiRequestHandler: SignedApiRequestHandler;

  /**
   * @param {Object} response The response to check for errors.
   * @return {string|null} The error code if present; null otherwise.
   */
  private static getErrorCode(response: any): string|null {
    return (validator.isNonNullObject(response) && response.error && (response.error as any).message) || null;
  }

  /**
   * @param {FirebaseApp} app The app used to fetch access tokens to sign API requests.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    this.signedApiRequestHandler = new SignedApiRequestHandler(app);
  }

  /**
   * Looks up a user by uid.
   *
   * @param {string} uid The uid of the user to lookup.
   * @return {Promise<Object>} A promise that resolves with the user information.
   */
  public getAccountInfoByUid(uid: string): Promise<Object> {
    if (!validator.isUid(uid)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_UID));
    }

    const request = {
      localId: [uid],
    };
    return this.invokeRequestHandler(FIREBASE_AUTH_GET_ACCOUNT_INFO, request);
  }

  /**
   * Looks up a user by email.
   *
   * @param {string} email The email of the user to lookup.
   * @return {Promise<Object>} A promise that resolves with the user information.
   */
  public getAccountInfoByEmail(email: string): Promise<Object> {
    if (!validator.isEmail(email)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL));
    }

    const request = {
      email: [email],
    };
    return this.invokeRequestHandler(FIREBASE_AUTH_GET_ACCOUNT_INFO, request);
  }

  /**
   * Looks up a user by phone number.
   *
   * @param {string} phoneNumber The phone number of the user to lookup.
   * @return {Promise<Object>} A promise that resolves with the user information.
   */
  public getAccountInfoByPhoneNumber(phoneNumber: string): Promise<Object> {
    if (!validator.isPhoneNumber(phoneNumber)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER));
    }

    const request = {
      phoneNumber: [phoneNumber],
    };
    return this.invokeRequestHandler(FIREBASE_AUTH_GET_ACCOUNT_INFO, request);
  }

  /**
   * Exports the users (single batch only) with a size of maxResults and starting from
   * the offset as specified by pageToken.
   *
   * @param {number=} maxResults The page size, 1000 if undefined. This is also the maximum
   *     allowed limit.
   * @param {string=} pageToken The next page token. If not specified, returns users starting
   *     without any offset. Users are returned in the order they were created from oldest to
   *     newest, relative to the page token offset.
   * @return {Promise<Object>} A promise that resolves with the current batch of downloaded
   *     users and the next page token if available. For the last page, an empty list of users
   *     and no page token are returned.
   */
  public downloadAccount(
      maxResults: number = MAX_DOWNLOAD_ACCOUNT_PAGE_SIZE,
      pageToken?: string): Promise<{users: Object[], nextPageToken?: string}> {
    // Construct request.
    const request = {
      maxResults,
      nextPageToken: pageToken,
    };
    // Remove next page token if not provided.
    if (typeof request.nextPageToken === 'undefined') {
      delete request.nextPageToken;
    }
    return this.invokeRequestHandler(FIREBASE_AUTH_DOWNLOAD_ACCOUNT, request)
        .then((response: any) => {
          // No more users available.
          if (!response.users) {
            response.users = [];
          }
          return response as {users: Object[], nextPageToken?: string};
        });
  }

  /**
   * Deletes an account identified by a uid.
   *
   * @param {string} uid The uid of the user to delete.
   * @return {Promise<Object>} A promise that resolves when the user is deleted.
   */
  public deleteAccount(uid: string): Promise<Object> {
    if (!validator.isUid(uid)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_UID));
    }

    const request = {
      localId: uid,
    };
    return this.invokeRequestHandler(FIREBASE_AUTH_DELETE_ACCOUNT, request);
  }

  /**
   * Sets additional developer claims on an existing user identified by provided UID.
   *
   * @param {string} uid The user to edit.
   * @param {Object} customUserClaims The developer claims to set.
   * @return {Promise<string>} A promise that resolves when the operation completes
   *     with the user id that was edited.
   */
  public setCustomUserClaims(uid: string, customUserClaims: Object): Promise<string> {
    // Validate user UID.
    if (!validator.isUid(uid)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_UID));
    } else if (!validator.isObject(customUserClaims)) {
      return Promise.reject(
        new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          'CustomUserClaims argument must be an object or null.',
        ),
      );
    }
    // Delete operation. Replace null with an empty object.
    if (customUserClaims === null) {
      customUserClaims = {};
    }
    // Construct custom user attribute editting request.
    let request: any = {
      localId: uid,
      customAttributes: JSON.stringify(customUserClaims),
    };
    return this.invokeRequestHandler(FIREBASE_AUTH_SET_ACCOUNT_INFO, request)
        .then((response: any) => {
          return response.localId as string;
        });
  }

  /**
   * Edits an existing user.
   *
   * @param {string} uid The user to edit.
   * @param {Object} properties The properties to set on the user.
   * @return {Promise<string>} A promise that resolves when the operation completes
   *     with the user id that was edited.
   */
  public updateExistingAccount(uid: string, properties: UpdateRequest): Promise<string> {
    if (!validator.isUid(uid)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_UID));
    } else if (!validator.isNonNullObject(properties)) {
      return Promise.reject(
        new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          'Properties argument must be a non-null object.',
        ),
      );
    }

    // Build the setAccountInfo request.
    let request: any = deepCopy(properties);
    request.localId = uid;
    // For deleting displayName or photoURL, these values must be passed as null.
    // They will be removed from the backend request and an additional parameter
    // deleteAttribute: ['PHOTO_URL', 'DISPLAY_NAME']
    // with an array of the parameter names to delete will be passed.

    // Parameters that are deletable and their deleteAttribute names.
    // Use client facing names, photoURL instead of photoUrl.
    let deletableParams = {
      displayName: 'DISPLAY_NAME',
      photoURL: 'PHOTO_URL',
    };
    // Properties to delete if available.
    request.deleteAttribute = [];
    for (let key in deletableParams) {
      if (request[key] === null) {
        // Add property identifier to list of attributes to delete.
        request.deleteAttribute.push(deletableParams[key]);
        // Remove property from request.
        delete request[key];
      }
    }
    if (request.deleteAttribute.length === 0) {
      delete request.deleteAttribute;
    }

    // For deleting phoneNumber, this value must be passed as null.
    // It will be removed from the backend request and an additional parameter
    // deleteProvider: ['phone'] with an array of providerIds (phone in this case),
    // will be passed.
    // Currently this applies to phone provider only.
    if (request.phoneNumber === null) {
      request.deleteProvider = ['phone'];
      delete request.phoneNumber;
    } else {
      // Doesn't apply to other providers in admin SDK.
      delete request.deleteProvider;
    }

    // Rewrite photoURL to photoUrl.
    if (typeof request.photoURL !== 'undefined') {
      request.photoUrl = request.photoURL;
      delete request.photoURL;
    }
    // Rewrite disabled to disableUser.
    if (typeof request.disabled !== 'undefined') {
      request.disableUser = request.disabled;
      delete request.disabled;
    }
    return this.invokeRequestHandler(FIREBASE_AUTH_SET_ACCOUNT_INFO, request)
        .then((response: any) => {
          return response.localId as string;
        });
  }

  /**
   * Revokes all refresh tokens for the specified user identified by the uid provided.
   * In addition to revoking all refresh tokens for a user, all ID tokens issued
   * before revocation will also be revoked on the Auth backend. Any request with an
   * ID token generated before revocation will be rejected with a token expired error.
   * Note that due to the fact that the timestamp is stored in seconds, any tokens minted in
   * the same second as the revocation will still be valid. If there is a chance that a token
   * was minted in the last second, delay for 1 second before revoking.
   *
   * @param {string} uid The user whose tokens are to be revoked.
   * @return {Promise<string>} A promise that resolves when the operation completes
   *     successfully with the user id of the corresponding user.
   */
  public revokeRefreshTokens(uid: string): Promise<string> {
    // Validate user UID.
    if (!validator.isUid(uid)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_UID));
    }
    let request: any = {
      localId: uid,
      // validSince is in UTC seconds.
      validSince: Math.ceil(new Date().getTime() / 1000),
    };
    return this.invokeRequestHandler(FIREBASE_AUTH_SET_ACCOUNT_INFO, request)
        .then((response: any) => {
          return response.localId as string;
        });
  }

  /**
   * Create a new user with the properties supplied.
   *
   * @param {Object} properties The properties to set on the user.
   * @return {Promise<string>} A promise that resolves when the operation completes
   *     with the user id that was created.
   */
  public createNewAccount(properties: CreateRequest): Promise<string> {
    if (!validator.isNonNullObject(properties)) {
      return Promise.reject(
        new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          'Properties argument must be a non-null object.',
        ),
      );
    }

    // Build the signupNewUser request.
    let request: any = deepCopy(properties);
    // Rewrite photoURL to photoUrl.
    if (typeof request.photoURL !== 'undefined') {
      request.photoUrl = request.photoURL;
      delete request.photoURL;
    }
    // Rewrite uid to localId if it exists.
    if (typeof request.uid !== 'undefined') {
      request.localId = request.uid;
      delete request.uid;
    }
    return this.invokeRequestHandler(FIREBASE_AUTH_SIGN_UP_NEW_USER, request)
      .then((response: any) => {
        // Return the user id.
        return response.localId as string;
      });
  }

  /**
   * Invokes the request handler based on the API settings object passed.
   *
   * @param {ApiSettings} apiSettings The API endpoint settings to apply to request and response.
   * @param {Object} requestData The request data.
   * @return {Promise<Object>} A promise that resolves with the response.
   */
  private invokeRequestHandler(apiSettings: ApiSettings, requestData: Object): Promise<Object> {
    let path: string = this.path + apiSettings.getEndpoint();
    let httpMethod: HttpMethod = apiSettings.getHttpMethod();
    return Promise.resolve()
      .then(() => {
        // Validate request.
        let requestValidator = apiSettings.getRequestValidator();
        requestValidator(requestData);
        // Process request.
        return this.signedApiRequestHandler.sendRequest(
            this.host, this.port, path, httpMethod, requestData, this.headers, this.timeout);
      })
      .then((response) => {
        // Check for backend errors in the response.
        let errorCode = FirebaseAuthRequestHandler.getErrorCode(response);
        if (errorCode) {
          throw FirebaseAuthError.fromServerError(errorCode, /* message */ undefined, response);
        }
        // Validate response.
        let responseValidator = apiSettings.getResponseValidator();
        responseValidator(response);
        // Return entire response.
        return response;
      })
      .catch((response) => {
        let error;
        if (typeof response === 'object' && 'statusCode' in response) {
          // response came directly from a non-200 response.
          error = response.error;
        } else {
          // response came from a thrown error on a 200 response.
          error = response;
        }

        if (error instanceof FirebaseError) {
          throw error;
        }

        let errorCode = FirebaseAuthRequestHandler.getErrorCode(error);
        throw FirebaseAuthError.fromServerError(errorCode, /* message */ undefined, error);
      });
  }
}
