import * as validator from '../utils/validator';

import {deepCopy} from '../utils/deep-copy';
import {FirebaseApp} from '../firebase-app';
import {AuthClientErrorCode, FirebaseAuthError} from '../utils/error';
import {
  HttpMethod, SignedApiRequestHandler, ApiSettings,
} from '../utils/api-request';


/** Firebase Auth backend host. */
const FIREBASE_AUTH_HOST = 'www.googleapis.com';
/** Firebase Auth backend port number. */
const FIREBASE_AUTH_PORT = 443;
/** Firebase Auth backend path. */
const FIREBASE_AUTH_PATH = '/identitytoolkit/v3/relyingparty/';
/** Firebase Auth request header. */
const FIREBASE_AUTH_HEADER = {
  'Content-Type': 'application/json',
};
/** Firebase Auth request timeout duration in seconds. */
const FIREBASE_AUTH_TIMEOUT = 10000;


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
      sanityCheck: true,
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
    // disableUser should be a boolean.
    if (typeof request.disableUser !== 'undefined' &&
        typeof request.disableUser !== 'boolean') {
      // This is called disableUser on the backend but the developer specifies this as
      // disabled externally. So the error message should use the client facing name.
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_DISABLED_FIELD);
    }
};


/** Instantiates the getAccountInfo endpoint settings. */
export const FIREBASE_AUTH_GET_ACCOUNT_INFO = new ApiSettings('getAccountInfo', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    if (!request.localId && !request.email) {
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
 * Instantiates the uploadAccount endpoint settings for creating a new user with uid
 * specified.
 */
export const FIREBASE_AUTH_UPLOAD_ACCOUNT = new ApiSettings('uploadAccount', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    let validKeys: any = {
      users: true,
      // Required to throw an error when a user already exists with the provided uid.
      allowOverwrite: true,
      // Required to throw an error if the email is already in use by another account.
      sanityCheck: true,
    };
    // Remove unsupported properties.
    for (let key in request) {
      if (!(key in validKeys)) {
        delete request[key];
      }
    }
    // Required uploadAccount parameter.
    if (typeof request.users === 'undefined' ||
        request.users == null ||
        !request.users.length) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid uploadAccount request. No users provider.');
    }
    // Validate each user within users.
    for (let user of request.users) {
      // localId is a required parameter.
      if (typeof user.localId === 'undefined') {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INTERNAL_ERROR,
          'INTERNAL ASSERT FAILED: Server request is missing user identifier');
      }
      // Validate user.
      validateCreateEditRequest(user);
    }
  })
  // Set response validator.
  .setResponseValidator((response: any) => {
    // Return the first error. UploadAccount is used to upload multiple accounts.
    // If an error occurs in any account to be upload, an array of errors is
    // returned.
    if (typeof response.error !== 'undefined' &&
        response.error.length &&
        typeof response.error[0].message === 'string') {
      // Get error description.
      if (response.error[0].message.indexOf('can not overwrite') !== -1) {
        // Duplicate user error.
        throw new FirebaseAuthError(
          AuthClientErrorCode.UID_ALREADY_EXISTS,
          response.error[0].message);
      } else if (response.error[0].message.indexOf('email exists') !== -1) {
        // Email exists error.
        throw new FirebaseAuthError(
          AuthClientErrorCode.EMAIL_ALREADY_EXISTS,
          response.error[0].message);
      }
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: ' + response.error[0].message);
    }
  });

/**
 * Instantiates the signupNewUser endpoint settings for creating a new user without
 * uid being specified. The backend will create a new one and return it.
 */
export const FIREBASE_AUTH_SIGN_UP_NEW_USER = new ApiSettings('signupNewUser', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    // localId should not be specified.
    // This should not occur as when the uid is provided, uploadAccount is used instead.
    if (typeof request.localId !== 'undefined') {
     throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: User identifier must not be specified');
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
 *
 * @param {Credential} credential The service account credential used to sign HTTP requests.
 * @constructor
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
   * @return {string} The error code if present, an empty string otherwise.
   */
  private static getErrorCode(response: any): string {
    return (response.error && (response.error as any).message) || null;
  }

  constructor(app: FirebaseApp) {
    this.signedApiRequestHandler = new SignedApiRequestHandler(app);
  }

  /**
   * Looks a user by uid.
   *
   * @param {string} uid The uid of the user to lookup.
   * @return {Promise<Object>} A promise that resolves with the user information.
   */
  public getAccountInfoByUid(uid: string): Promise<Object> {
    const request = {
      localId: [uid],
    };
    return this.invokeRequestHandler(FIREBASE_AUTH_GET_ACCOUNT_INFO, request);
  }

  /**
   * Looks a user by email.
   *
   * @param {string} email The email of the user to lookup.
   * @return {Promise<Object>} A promise that resolves with the user information.
   */
  public getAccountInfoByEmail(email: string): Promise<Object> {
    const request = {
      email: [email],
    };
    return this.invokeRequestHandler(FIREBASE_AUTH_GET_ACCOUNT_INFO, request);
  }

  /**
   * Deletes an account identified by a uid.
   *
   * @param {string} uid The uid of the user to delete.
   * @return {Promise<Object>} A promise that resolves when the user is deleted.
   */
  public deleteAccount(uid: string): Promise<Object> {
    const request = {
      localId: uid,
    };
    return this.invokeRequestHandler(FIREBASE_AUTH_DELETE_ACCOUNT, request);
  }

  /**
   * Edits an existing user.
   *
   * @param {string} uid The user to edit.
   * @param {Object} properties The properties to set on the user.
   * @return {Promise<string>} A promise that resolves when the operation completes
   *     with the user id that was edited.
   */
  public updateExistingAccount(uid: string, properties: Object): Promise<string> {
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
   * Create a new user with the properties supplied.
   *
   * @param {Object} properties The properties to set on the user.
   * @return {Promise<string>} A promise that resolves when the operation completes
   *     with the user id that was created.
   */
  public createNewAccount(properties: Object): Promise<string> {
    // Build the signupNewUser/uploadAccount request.
    let request: any = deepCopy(properties);
    let finalRequest: any;
    let apiSettings: ApiSettings;
    // Rewrite photoURL to photoUrl.
    if (typeof request.photoURL !== 'undefined') {
      request.photoUrl = request.photoURL;
      delete request.photoURL;
    }
    if (typeof request.uid !== 'undefined') {
      request.localId = request.uid;
      // If uid specified, use uploadAccount endpoint.
      apiSettings = FIREBASE_AUTH_UPLOAD_ACCOUNT;
      // This endpoint takes a hashed password.
      // To pass a plain text password, pass it via rawPassword field.
      if (typeof request.password !== 'undefined') {
        request.rawPassword = request.password;
        delete request.password;
      }
      // Construct uploadAccount request.
      finalRequest = {
        users: [request],
        // Do not overwrite existing users.
        allowOverwrite: false,
        // Do not allow duplicate emails.
        // This will force the backend to throw an error when an email is
        // already in use by another existing account.
        sanityCheck: true,
      };
    } else {
      // If uid not specified, use signupNewUser endpoint.
      apiSettings = FIREBASE_AUTH_SIGN_UP_NEW_USER;
      finalRequest = request;
    }
    return this.invokeRequestHandler(apiSettings, finalRequest)
      .then((response: any) => {
        // Return the user id. It is returned in the setAccountInfo and signupNewUser
        // endpoints but not the uploadAccount endpoint. In that case return the same
        // one in request.
        return (response.localId || request.localId) as string;
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
      });
  }
}
