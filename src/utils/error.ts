import {deepCopy} from '../utils/deep-copy';

/** Error code type. */
type ErrorCode =
  'INVALID_ARGUMENT' |
  'EMAIL_ALREADY_EXISTS' |
  'INTERNAL_ERROR' |
  'INVALID_CREDENTIAL' |
  'INVALID_DISABLED_FIELD' |
  'INVALID_DISPLAY_NAME' |
  'INVALID_EMAIL_VERIFIED' |
  'INVALID_EMAIL' |
  'INVALID_PASSWORD' |
  'INVALID_PHOTO_URL' |
  'INVALID_SERVICE_ACCOUNT' |
  'INVALID_UID' |
  'MISSING_UID' |
  'OPERATION_NOT_ALLOWED' |
  'PROJECT_NOT_FOUND' |
  'UID_ALREADY_EXISTS' |
  'USER_NOT_FOUND';

/**
 * Defines error info type. This includes a code and message string.
 */
type ErrorInfo = {
  code: string;
  message: string;
}

/**
 * Type that represents a map that stores all error codes (ErrorInfo enum).
 */
type ErrorCodeMap = {
  [code: ErrorCode]: ErrorInfo;
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
   * Creates the developer facing error corresponding to the backend error code.
   *
   * @param {string} serverErrorCode The server error code.
   * @param {string} [message] The error message. The default message is used
   *     if not provided.
   * @return {FirebaseAuthError} The corresponding developer facing error.
   */
  public static fromServerError(serverErrorCode: string, message?: string): FirebaseAuthError {
    // If not found, default to internal error.
    let clientCodeKey = AUTH_SERVER_TO_CLIENT_CODE[serverErrorCode] || 'INTERNAL_ERROR';
    const error: ErrorInfo = deepCopy(AUTH_CLIENT_ERROR_CODE[clientCodeKey]);
    error.message = message || error.message;
    return new FirebaseAuthError(error);
  }

  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({code: 'auth/' + info.code, message: message || info.message});
  }
}

/** @const {ErrorCodeMap} Auth client error codes and their default messages. */
const AUTH_CLIENT_ERROR_CODE: ErrorCodeMap = {
  INVALID_ARGUMENT: {
    code: 'argument-error',
    message: 'Invalid argument provided.',
  },
  EMAIL_ALREADY_EXISTS: {
    code: 'email-already-exists',
    message: 'The email address is already in use by another account.',
  },
  INTERNAL_ERROR: {
    code: 'internal-error',
    message: 'An internal error has occurred.',
  },
  INVALID_CREDENTIAL: {
    code: 'invalid-credential',
    message: 'Invalid credential object provided.',
  },
  INVALID_DISABLED_FIELD: {
    code: 'invalid-disabled-field',
    message: 'The disabled field must be a boolean.',
  },
  INVALID_DISPLAY_NAME: {
    code: 'invalid-display-name',
    message: 'The displayName field must be a valid string.',
  },
  INVALID_EMAIL_VERIFIED: {
    code: 'invalid-email-verified',
    message: 'The emailVerified field must be a boolean.',
  },
  INVALID_EMAIL: {
    code: 'invalid-email',
    message: 'The email address is improperly formatted.',
  },
  INVALID_PASSWORD: {
    code: 'invalid-password',
    message: 'The password must be a string with at least 6 characters.',
  },
  INVALID_PHOTO_URL: {
    code: 'invalid-photo-url',
    message: 'The photoURL field must be a valid URL.',
  },
  INVALID_SERVICE_ACCOUNT: {
    code: 'invalid-service-account',
    message: 'The service account provided is invalid.',
  },
  INVALID_UID: {
    code: 'invalid-uid',
    message: 'The uid must be a non-empty string with at most 128 alphanumeric characters.',
  },
  MISSING_UID: {
    code: 'missing-uid',
    message: 'A uid identifier is required for the current operation.',
  },
  OPERATION_NOT_ALLOWED: {
    code: 'operation-not-allowed',
    message: 'The given sign-in provider is disabled for this Firebase project. ' +
        'Enable it in the Firebase console, under the sign-in method tab of the ' +
        'Auth section.',
  },
  PROJECT_NOT_FOUND: {
    code: 'project-not-found',
    message: 'No Firebase project was found for the provided credential.',
  },
  UID_ALREADY_EXISTS: {
    code: 'uid-already-exists',
    message: 'The user with the provided uid already exists.',
  },
  USER_NOT_FOUND: {
    code: 'user-not-found',
    message: 'There is no user record corresponding to the provided identifier.',
  },
};

/** @const {ServerToClientCode} Auth server to client enum error codes. */
const AUTH_SERVER_TO_CLIENT_CODE: ServerToClientCode = {
  // Project not found.
  CONFIGURATION_NOT_FOUND: 'PROJECT_NOT_FOUND',
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


export {
  ErrorCode,
  ErrorCodeMap,
  ErrorInfo,
  FirebaseError,
  FirebaseAuthError,
  AUTH_CLIENT_ERROR_CODE,
}
