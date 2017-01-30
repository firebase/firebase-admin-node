import {FirebaseApp} from '../firebase-app';
import {HttpMethod, SignedApiRequestHandler} from '../utils/api-request';


// FCM backend constants
const FIREBASE_MESSAGING_HOST = 'fcm.googleapis.com';
const FIREBASE_MESSAGING_PORT = 443;
const FIREBASE_MESSAGING_PATH = '/fcm/send';
const FIREBASE_MESSAGING_TIMEOUT = 10000;
const FIREBASE_MESSAGING_HTTP_METHOD: HttpMethod = 'POST';
const FIREBASE_MESSAGING_HEADERS = {
  'Content-Type': 'application/json',
  access_token_auth: 'true',
};


/**
 * Class that provides a mechanism to send requests to the Firebase Cloud Messaging backend.
 */
export class FirebaseMessagingRequestHandler {
  private signedApiRequestHandler: SignedApiRequestHandler;

  /**
   * @param {Object} response The response to check for errors.
   * @return {string} The error code if present, an empty string otherwise.
   */
  private static getErrorCode(response: any): string {
    return (response.error && (response.error as any).message) || null;
  }

  /**
   * @param {FirebaseApp} app The app used to fetch access tokens to sign API requests.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    this.signedApiRequestHandler = new SignedApiRequestHandler(app);
  }

  /**
   * Invokes the request handler with the provided request data.
   *
   * @param {Object} requestData The request data.
   * @return {Promise<Object>} A promise that resolves with the response.
   */
  public invokeRequestHandler(requestData: Object): Promise<Object> {
    return this.signedApiRequestHandler.sendRequest(
      FIREBASE_MESSAGING_HOST,
      FIREBASE_MESSAGING_PORT,
      FIREBASE_MESSAGING_PATH,
      FIREBASE_MESSAGING_HTTP_METHOD,
      requestData,
      FIREBASE_MESSAGING_HEADERS,
      FIREBASE_MESSAGING_TIMEOUT,
    ).then((response) => {
      // Check for backend errors in the response.
      let errorCode = FirebaseMessagingRequestHandler.getErrorCode(response);
      if (errorCode) {
        // TODO(jwngr): throw Messaging specific error instead of generic error.
        throw new Error(errorCode);
      }

      // Return entire response.
      return response;
    });
  }
}
