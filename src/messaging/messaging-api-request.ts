import {FirebaseApp} from '../firebase-app';
import {HttpMethod, SignedApiRequestHandler} from '../utils/api-request';
import {FirebaseMessagingError, MessagingClientErrorCode} from '../utils/error';


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
   * @return {string|null} The error code if present; null otherwise.
   */
  private static getErrorCode(response: any): string|null {
    if ('error' in response) {
      if (typeof response.error === 'string') {
        return response.error;
      } else {
        return response.error.message;
      }
    }

    return null;
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
      // Send non-JSON responses to the catch() below where they will be treated as errors.
      if (typeof response === 'string') {
        return Promise.reject({
          error: response,
          statusCode: 200,
        });
      }

      // Check for backend errors in the response.
      const errorCode = FirebaseMessagingRequestHandler.getErrorCode(response);
      if (errorCode) {
        return Promise.reject({
          error: response,
          statusCode: 200,
        });
      }

      // Return entire response.
      return response;
    })
    .catch((response: { statusCode: number, error: string|Object }) => {
      // Add special handling for non-JSON responses.
      if (typeof response.error === 'string') {
        let error;
        switch (response.statusCode) {
          case 400:
            error = MessagingClientErrorCode.INVALID_ARGUMENT;
            break;
          case 401:
          case 403:
            error = MessagingClientErrorCode.AUTHENTICATION_ERROR;
            break;
          case 500:
            error = MessagingClientErrorCode.INTERNAL_ERROR;
            break;
          case 503:
            error = MessagingClientErrorCode.SERVER_UNAVAILABLE;
            break;
          default:
            // Treat non-JSON responses with unexpected status codes as unknown errors.
            error = MessagingClientErrorCode.UNKNOWN_ERROR;
        }

        throw new FirebaseMessagingError({
          code: error.code,
          message: `${ error.message } Raw server response: "${ response.error }". Status code: ` +
            `${ response.statusCode }.`,
        });
      }

      // For JSON responses, map the server response to a client-side error.
      const errorCode = FirebaseMessagingRequestHandler.getErrorCode(response.error);
      throw FirebaseMessagingError.fromServerError(errorCode, /* message */ undefined, response.error);
    });
  }
}
