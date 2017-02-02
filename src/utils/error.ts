import {deepCopy} from '../utils/deep-copy';

/**
 * Defines error info type. This includes a code and message string.
 */
type ErrorInfo = {
  code: string;
  message: string;
}

/**
 * Defines a type that stores all server to client codes (string enum).
 */
type ServerToClientCode = {
  [code: string]: string;
}

/**
 * Firebase error code structure. This extends Error.
 *
 * @param {ErrorInfo} errorInfo The error information (code and message).
 * @constructor
 */
class FirebaseError extends Error {
  constructor(private errorInfo: ErrorInfo) {
    super(errorInfo.message);

    /* tslint:disable:max-line-length */
    // Set the prototype explicitly. See the following link for more details:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    /* tslint:enable:max-line-length */
    (this as any).__proto__ = FirebaseError.prototype;
  }

  /** @return {string} The error code. */
  public get code(): string {
    return this.errorInfo.code;
  }

  /** @return {string} The error message. */
  public get message(): string {
    return this.errorInfo.message;
  }

  /** @return {Object} The object representation of the error. */
  public toJSON(): Object {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

/**
 * Firebase Auth error code structure. This extends FirebaseError.
 *
 * @param {ErrorInfo} info The error code info.
 * @param {string} [message] The error message. This will override the default
 *     message if provided.
 * @constructor
 */
class FirebaseAuthError extends FirebaseError {
  /**
   * Creates the developer-facing error corresponding to the backend error code.
   *
   * @param {string} serverErrorCode The server error code.
   * @param {string} [message] The error message. The default message is used
   *     if not provided.
   * @param {Object} [rawServerResponse] The error's raw server response.
   * @return {FirebaseAuthError} The corresponding developer-facing error.
   */
  public static fromServerError(
    serverErrorCode: string,
    message?: string,
    rawServerResponse?: Object,
  ): FirebaseAuthError {
    // If not found, default to internal error.
    let clientCodeKey = AUTH_SERVER_TO_CLIENT_CODE[serverErrorCode] || 'INTERNAL_ERROR';
    const error: ErrorInfo = deepCopy(AuthClientErrorCode[clientCodeKey]);
    error.message = message || error.message;

    if (clientCodeKey === 'INTERNAL_ERROR' && typeof rawServerResponse !== 'undefined') {
      try {
        error.message += ` Raw server response: "${ JSON.stringify(rawServerResponse) }"`;
      } catch (e) {
        // Ignore JSON parsing error.
      }
    }

    return new FirebaseAuthError(error);
  }

  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({code: 'auth/' + info.code, message: message || info.message});
  }
}


/**
 * Firebase Messaging error code structure. This extends FirebaseError.
 *
 * @param {ErrorInfo} info The error code info.
 * @param {string} [message] The error message. This will override the default message if provided.
 * @constructor
 */
class FirebaseMessagingError extends FirebaseError {
  /**
   * Creates the developer-facing error corresponding to the backend error code.
   *
   * @param {string} serverErrorCode The server error code.
   * @param {string} [message] The error message. The default message is used
   *     if not provided.
   * @param {Object} [rawServerResponse] The error's raw server response.
   * @return {FirebaseMessagingError} The corresponding developer-facing error.
   */
  public static fromServerError(
    serverErrorCode: string,
    message?: string,
    rawServerResponse?: Object,
  ): FirebaseMessagingError {
    // If not found, default to unknown error.
    let clientCodeKey = MESSAGING_SERVER_TO_CLIENT_CODE[serverErrorCode] || 'UNKNOWN_ERROR';
    const error: ErrorInfo = deepCopy(MessagingClientErrorCode[clientCodeKey]);
    error.message = message || error.message;

    if (clientCodeKey === 'UNKNOWN_ERROR' && typeof rawServerResponse !== 'undefined') {
      try {
        error.message += ` Raw server response: "${ JSON.stringify(rawServerResponse) }"`;
      } catch (e) {
        // Ignore JSON parsing error.
      }
    }

    return new FirebaseMessagingError(error);
  }

  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({code: 'messaging/' + info.code, message: message || info.message});
  }
}


/**
 * Auth client error codes and their default messages.
 */
class AuthClientErrorCode {
  public static INVALID_ARGUMENT = {
    code: 'argument-error',
    message: 'Invalid argument provided.',
  };
  public static EMAIL_ALREADY_EXISTS = {
    code: 'email-already-exists',
    message: 'The email address is already in use by another account.',
  };
  public static INTERNAL_ERROR = {
    code: 'internal-error',
    message: 'An internal error has occurred.',
  };
  public static INVALID_CREDENTIAL = {
    code: 'invalid-credential',
    message: 'Invalid credential object provided.',
  };
  public static INVALID_DISABLED_FIELD = {
    code: 'invalid-disabled-field',
    message: 'The disabled field must be a boolean.',
  };
  public static INVALID_DISPLAY_NAME = {
    code: 'invalid-display-name',
    message: 'The displayName field must be a valid string.',
  };
  public static INVALID_EMAIL_VERIFIED = {
    code: 'invalid-email-verified',
    message: 'The emailVerified field must be a boolean.',
  };
  public static INVALID_EMAIL = {
    code: 'invalid-email',
    message: 'The email address is improperly formatted.',
  };
  public static INVALID_PASSWORD = {
    code: 'invalid-password',
    message: 'The password must be a string with at least 6 characters.',
  };
  public static INVALID_PHOTO_URL = {
    code: 'invalid-photo-url',
    message: 'The photoURL field must be a valid URL.',
  };
  public static INVALID_UID = {
    code: 'invalid-uid',
    message: 'The uid must be a non-empty string with at most 128 characters.',
  };
  public static MISSING_UID = {
    code: 'missing-uid',
    message: 'A uid identifier is required for the current operation.',
  };
  public static OPERATION_NOT_ALLOWED = {
    code: 'operation-not-allowed',
    message: 'The given sign-in provider is disabled for this Firebase project. ' +
        'Enable it in the Firebase console, under the sign-in method tab of the ' +
        'Auth section.',
  };
  public static PROJECT_NOT_FOUND = {
    code: 'project-not-found',
    message: 'No Firebase project was found for the provided credential.',
  };
  public static INSUFFICIENT_PERMISSION = {
    code: 'insufficient-permission',
    message: 'Credential implementation provided to initializeApp() via the "credential" property ' +
      'has insufficient permission to access the requested resource. See ' +
      'https://firebase.google.com/docs/admin/setup for details on how to authenticate this SDK ' +
      'with appropriate permissions.',
  };
  public static UID_ALREADY_EXISTS = {
    code: 'uid-already-exists',
    message: 'The user with the provided uid already exists.',
  };
  public static USER_NOT_FOUND = {
    code: 'user-not-found',
    message: 'There is no user record corresponding to the provided identifier.',
  };
};

/**
 * Messaging client error codes and their default messages.
 */
class MessagingClientErrorCode {
  public static INVALID_ARGUMENT = {
    code: 'invalid-argument',
    message: 'Invalid argument provided.',
  };
  public static INVALID_RECIPIENT = {
    code: 'invalid-recipient',
    message: 'Invalid message recipient provided.',
  };
  public static INVALID_PAYLOAD = {
    code: 'invalid-payload',
    message: 'Invalid message payload provided.',
  };
  public static INVALID_DATA_PAYLOAD_KEY = {
    code: 'invalid-data-payload-key',
    message: 'The data message payload contains an invalid key. See the reference documentation ' +
      'for the DataMessagePayload type for restricted keys.',
  };
  public static PAYLOAD_SIZE_LIMIT_EXCEEDED = {
    code: 'payload-size-limit-exceeded',
    message: 'The provided message payload exceeds the FCM size limits. See the error documentation ' +
      'for more details.',
  };
  public static INVALID_OPTIONS = {
    code: 'invalid-options',
    message: 'Invalid message options provided.',
  };
  public static INVALID_REGISTRATION_TOKEN = {
    code: 'invalid-registration-token',
    message: 'Invalid registration token provided. Make sure it matches the registration token ' +
      'the client app receives from registering with FCM.',
  };
  public static REGISTRATION_TOKEN_NOT_REGISTERED = {
    code: 'registration-token-not-registered',
    message: 'The provided registration token is not registered. A previously valid registration ' +
      'token can be unregistered for a variety of reasons. See the error documentation for more ' +
      'details. Remove this registration token and stop using it to send messages.',
  };
  public static MISMATCHED_CREDENTIAL = {
    code: 'mismatched-credential',
    message: 'The credential used to authenticate this SDK does not have permission to send ' +
      'messages to the device corresponding to the provided registration token. Make sure the ' +
      'credential and registration token both belong to the same Firebase project.',
  };
  public static INVALID_PACKAGE_NAME = {
    code: 'invalid-package-name',
    message: 'The message was addressed to a registration token whose package name does not match ' +
      'the provided "restrictedPackageName" option.',
  };
  public static DEVICE_MESSAGE_RATE_EXCEEDED = {
    code: 'device-message-rate-exceeded',
    message: 'The rate of messages to a particular device is too high. Reduce the number of ' +
      'messages sent to this device and do not immediately retry sending to this device.',
  };
  public static TOPICS_MESSAGE_RATE_EXCEEDED = {
    code: 'topics-message-rate-exceeded',
    message: 'The rate of messages to subscribers to a particular topic is too high. Reduce the ' +
      'number of messages sent for this topic, and do not immediately retry sending to this topic.',
  };
  public static INVALID_APNS_CREDENTIALS = {
    code: 'invalid-apns-credentials',
    message: 'A message targeted to an iOS device could not be sent because the required APNs ' +
      'SSL certificate was not uploaded or has expired. Check the validity of your development ' +
      'and production certificates.',
  };
  public static AUTHENTICATION_ERROR = {
    code: 'authentication-error',
    message: 'An error occurred when trying to authenticate to the FCM servers. Make sure the ' +
      'credential used to authenticate this SDK has the proper permissions. See ' +
      'https://firebase.google.com/docs/admin/setup for setup instructions.',
  };
  public static SERVER_UNAVAILABLE = {
    code: 'server-unavailable',
    message: 'The FCM server could not process the request in time. See the error documentation ' +
      'for more details.',
  };
  public static INTERNAL_ERROR = {
    code: 'internal-error',
    message: 'An internal error has occurred.',
  };
  public static UNKNOWN_ERROR = {
    code: 'unknown-error',
    message: 'An unknown server error was returned.',
  };
};

/** @const {ServerToClientCode} Auth server to client enum error codes. */
const AUTH_SERVER_TO_CLIENT_CODE: ServerToClientCode = {
  // Project not found.
  CONFIGURATION_NOT_FOUND: 'PROJECT_NOT_FOUND',
  // Provided credential has insufficient permissions.
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  // uploadAccount provides an email that already exists.
  DUPLICATE_EMAIL: 'EMAIL_EXISTS',
  // uploadAccount provides a localId that already exists.
  DUPLICATE_LOCAL_ID: 'UID_ALREADY_EXISTS',
  // setAccountInfo email already exists.
  EMAIL_EXISTS: 'EMAIL_ALREADY_EXISTS',
  // Invalid email provided.
  INVALID_EMAIL: 'INVALID_EMAIL',
  // Invalid service account.
  INVALID_SERVICE_ACCOUNT: 'INVALID_SERVICE_ACCOUNT',
  // No localId provided (deleteAccount missing localId).
  MISSING_LOCAL_ID: 'MISSING_UID',
  // Empty user list in uploadAccount.
  MISSING_USER_ACCOUNT: 'MISSING_UID',
  // Password auth disabled in console.
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  // Project not found.
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  // User on which action is to be performed is not found.
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  // Password provided is too weak.
  WEAK_PASSWORD: 'INVALID_PASSWORD',
};

/** @const {ServerToClientCode} Messaging server to client enum error codes. */
const MESSAGING_SERVER_TO_CLIENT_CODE: ServerToClientCode = {
  // Generic invalid message parameter provided.
  InvalidParameters: 'INVALID_ARGUMENT',
  // Invalid registration token format.
  InvalidRegistration: 'INVALID_REGISTRATION_TOKEN',
  // Registration token is not registered.
  NotRegistered: 'REGISTRATION_TOKEN_NOT_REGISTERED',
  // Mismatched sender ID.
  MismatchSenderId: 'MISMATCHED_CREDENTIAL',
  // Registration token does not match restricted package name.
  InvalidPackageName: 'INVALID_PACKAGE_NAME',
  // Message payload size limit exceeded.
  MessageTooBig: 'PAYLOAD_SIZE_LIMIT_EXCEEDED',
  // Invalid key in the data message payload.
  InvalidDataKey: 'INVALID_DATA_PAYLOAD_KEY',
  // Invalid time to live option.
  InvalidTtl: 'INVALID_OPTIONS',
  // Device message rate exceeded.
  DeviceMessageRateExceeded: 'DEVICE_MESSAGE_RATE_EXCEEDED',
  // Topics message rate exceeded.
  TopicsMessageRateExceeded: 'TOPICS_MESSAGE_RATE_EXCEEDED',
  // Invalid APNs credentials.
  InvalidApnsCredential: 'INVALID_APNS_CREDENTIALS',
  // FCM server unavailable.
  Unavailable: 'SERVER_UNAVAILABLE',
  // FCM server internal error.
  InternalServerError: 'INTERNAL_ERROR',
};


export {
  ErrorInfo,
  FirebaseError,
  FirebaseAuthError,
  AuthClientErrorCode,
  FirebaseMessagingError,
  MessagingClientErrorCode,
}
