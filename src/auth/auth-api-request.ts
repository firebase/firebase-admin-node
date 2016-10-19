import {Credential} from './credential';
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


/** Instantiates the getAccountInfo endpoint settings. */
export const FIREBASE_AUTH_GET_ACCOUNT_INFO = new ApiSettings('getAccountInfo', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    if (!request.localId && !request.email) {
      throw new Error('Server request is missing user identifier');
    }
  })
  // Set response validator.
  .setResponseValidator((response: any) => {
    if (!response.users) {
      throw new Error('User not found');
    }
  });

/** Instantiates the deleteAccount endpoint settings. */
export const FIREBASE_AUTH_DELETE_ACCOUNT = new ApiSettings('deleteAccount', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    if (!request.localId) {
      throw new Error('Server request is missing user identifier');
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

  constructor(credential: Credential) {
    this.signedApiRequestHandler = new SignedApiRequestHandler(credential);
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
          throw new Error(errorCode);
        }
        // Validate response.
        let responseValidator = apiSettings.getResponseValidator();
        responseValidator(response);
        // Return entire response.
        return response;
      });
  }
}
