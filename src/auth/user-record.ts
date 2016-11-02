import {FirebaseAuthError, AUTH_CLIENT_ERROR_CODE} from '../utils/error';

/**
 * Parses a time stamp string or number and returns the corresponding date if valid.
 *
 * @param {any} time The unix timestamp string or number in milliseconds.
 * @return {Date} The corresponding date if valid.
 */
function parseDate(time: any): Date {
  try {
    let date = new Date(parseInt(time, 10));
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // Do nothing. null will be returned.
  }
  return null;
}


/**
 * User metadata class that provides metadata information like user account creation
 * and last sign in time.
 *
 * @param {Object} response The server side response returned from the getAccountInfo
 *     endpoint.
 * @constructor
 */
export class UserMetadata {
  private lastSignedInAtInternal: Date;
  private createdAtInternal: Date;

  constructor(response: any) {
    // Creation date is required.
    this.createdAtInternal = parseDate(response.createdAt);
    if (!this.createdAtInternal) {
      throw new FirebaseAuthError(
        AUTH_CLIENT_ERROR_CODE.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid metadata response');
    }
    this.lastSignedInAtInternal = parseDate(response.lastLoginAt);
  }

  /** @return {Date} The user's last sign-in date. */
  public get lastSignedInAt(): Date {
    return this.lastSignedInAtInternal;
  }

  /** @return {Date} The user's account creation date. */
  public get createdAt(): Date {
    return this.createdAtInternal;
  }

  /** @return {Object} The plain object representation of the user's metadata. */
  public toJSON(): Object {
    return {
      lastSignedInAt: this.lastSignedInAt,
      createdAt: this.createdAt,
    };
  }
}

/**
 * User info class that provides provider user information for different
 * Firebase providers like google.com, facebook.com, password, etc.
 *
 * @param {Object} response The server side response returned from the getAccountInfo
 *     endpoint.
 * @constructor
 */
export class UserInfo {
  private uidInternal: string;
  private displayNameInternal: string;
  private emailInternal: string;
  private photoURLInternal: string;
  private providerIdInternal: string;

  constructor(response: any) {
    // Provider user id and provider id are required.
    if (!response.rawId || !response.providerId) {
      throw new FirebaseAuthError(
        AUTH_CLIENT_ERROR_CODE.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid user info response');
    }
    this.uidInternal = response.rawId;
    this.displayNameInternal = response.displayName;
    this.emailInternal = response.email;
    this.photoURLInternal = response.photoUrl;
    this.providerIdInternal = response.providerId;
  }

  /** @return {string} The provider user id. */
  public get uid(): string {
    return this.uidInternal;
  }

  /** @return {string} The provider display name. */
  public get displayName(): string {
    return this.displayNameInternal;
  }

  /** @return {string} The provider email. */
  public get email(): string {
    return this.emailInternal;
  }

  /** @return {string} The provider photo URL. */
  public get photoURL(): string {
    return this.photoURLInternal;
  }

  /** @return {string} The provider Firebase ID. */
  public get providerId(): string {
    return this.providerIdInternal;
  }

  /** @return {Object} The plain object representation of the current provider data. */
  public toJSON(): Object {
    return {
      uid: this.uid,
      displayName: this.displayName,
      email: this.email,
      photoURL: this.photoURL,
      providerId: this.providerId,
    };
  }
}

/**
 * User record class that defines the Firebase user object populated from
 * the Firebase Auth getAccountInfo response.
 *
 * @param {Object} response The server side response returned from the getAccountInfo
 *     endpoint.
 * @constructor
 */
export class UserRecord {
  private uidInternal: string;
  private emailInternal: string;
  private emailVerifiedInternal: boolean;
  private displayNameInternal: string;
  private photoURLInternal: string;
  private disabledInternal: boolean;
  private metadataInternal: UserMetadata;
  private providerDataInternal: UserInfo[];

  constructor(response: any) {
    // The Firebase user id is required.
    if (!response.localId) {
      throw new FirebaseAuthError(
        AUTH_CLIENT_ERROR_CODE.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid user response');
    }
    this.uidInternal = response.localId;
    this.emailInternal = response.email;
    this.emailVerifiedInternal  = !!response.emailVerified;
    this.displayNameInternal = response.displayName;
    this.photoURLInternal = response.photoUrl;
    // If disabled is not provided, the account is enabled by default.
    this.disabledInternal = response.disabled || false;
    this.metadataInternal = new UserMetadata(response);
    let providerData: UserInfo[] = response.providerUserInfo || [];
    this.providerDataInternal = [];
    for (let entry of providerData) {
      this.providerData.push(new UserInfo(entry));
    }
  }

  /** @return {string} The Firebase user id corresponding to the current user record. */
  public get uid(): string {
    return this.uidInternal;
  }

  /** @return {string} The primary email corresponding to the current user record. */
  public get email(): string {
    return this.emailInternal;
  }

  /** @return {boolean} Whether the primary email is verified. */
  public get emailVerified(): boolean {
    return this.emailVerifiedInternal;
  }

  /** @return {string} The display name corresponding to the current user record. */
  public get displayName(): string {
    return this.displayNameInternal;
  }

  /** @return {string} The photo URL corresponding to the current user record. */
  public get photoURL(): string {
    return this.photoURLInternal;
  }

  /** @return {boolean} Whether the current user is disabled or not. */
  public get disabled(): boolean {
    return this.disabledInternal;
  }

  /** @return {UserMetadata} The user record's metadata. */
  public get metadata(): UserMetadata {
    return this.metadataInternal;
  }

  /** @return {UserInfo[]} The list of providers linked to the current record. */
  public get providerData(): UserInfo[] {
    return this.providerDataInternal;
  }

  /** @return {Object} The plain object representation of the user record. */
  public toJSON(): Object {
    let json: any = {};
    json.uid = this.uid;
    json.email = this.email;
    json.emailVerified = this.emailVerified;
    json.displayName = this.displayName;
    json.photoURL = this.photoURL;
    json.disabled = this.disabled;
    // Convert metadata to json.
    json.metadata = this.metadata.toJSON();
    json.providerData = [];
    for (let entry of this.providerData) {
       // Convert each provider data to json.
       json.providerData.push(entry.toJSON());
    }
    return json;
  }
}
