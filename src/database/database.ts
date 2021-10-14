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

import { URL } from 'url';
import * as path from 'path';

import { FirebaseDatabase } from '@firebase/database-types';
import { FirebaseDatabaseError, AppErrorCodes, FirebaseAppError } from '../utils/error';
import { Database as DatabaseImpl } from '@firebase/database-compat/standalone';

import { App } from '../app';
import { FirebaseApp } from '../app/firebase-app';
import * as validator from '../utils/validator';
import { AuthorizedHttpClient, HttpRequestConfig, HttpError } from '../utils/api-request';
import { getSdkVersion } from '../utils/index';

/**
 * The Firebase Database service interface. Extends the
 * {@link https://firebase.google.com/docs/reference/js/firebase.database.Database | Database}
 * interface provided by the `@firebase/database` package.
 */
export interface Database extends FirebaseDatabase {
  /**
   * Gets the currently applied security rules as a string. The return value consists of
   * the rules source including comments.
   *
   * @returns A promise fulfilled with the rules as a raw string.
   */
  getRules(): Promise<string>;

  /**
   * Gets the currently applied security rules as a parsed JSON object. Any comments in
   * the original source are stripped away.
   *
   * @returns A promise fulfilled with the parsed rules object.
   */
  getRulesJSON(): Promise<object>;

  /**
   * Sets the specified rules on the Firebase Realtime Database instance. If the rules source is
   * specified as a string or a Buffer, it may include comments.
   *
   * @param source - Source of the rules to apply. Must not be `null` or empty.
   * @returns Resolves when the rules are set on the Realtime Database.
   */
  setRules(source: string | Buffer | object): Promise<void>;
}

const TOKEN_REFRESH_THRESHOLD_MILLIS = 5 * 60 * 1000;

export class DatabaseService {

  private readonly appInternal: App;
  private tokenListener: (token: string) => void;
  private tokenRefreshTimeout: NodeJS.Timeout;

  private databases: {
    [dbUrl: string]: Database;
  } = {};

  constructor(app: App) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseDatabaseError({
        code: 'invalid-argument',
        message: 'First argument passed to admin.database() must be a valid Firebase app instance.',
      });
    }
    this.appInternal = app;
  }

  private get firebaseApp(): FirebaseApp {
    return this.app as FirebaseApp;
  }

  /**
   * @internal
   */
  public delete(): Promise<void> {
    if (this.tokenListener) {
      this.firebaseApp.INTERNAL.removeAuthTokenListener(this.tokenListener);
      clearTimeout(this.tokenRefreshTimeout);
    }

    const promises = [];
    for (const dbUrl of Object.keys(this.databases)) {
      const db: DatabaseImpl = ((this.databases[dbUrl] as any) as DatabaseImpl);
      promises.push(db.INTERNAL.delete());
    }
    return Promise.all(promises).then(() => {
      this.databases = {};
    });
  }

  /**
   * Returns the app associated with this DatabaseService instance.
   *
   * @returns The app associated with this DatabaseService instance.
   */
  get app(): App {
    return this.appInternal;
  }

  public getDatabase(url?: string): Database {
    const dbUrl: string = this.ensureUrl(url);
    if (!validator.isNonEmptyString(dbUrl)) {
      throw new FirebaseDatabaseError({
        code: 'invalid-argument',
        message: 'Database URL must be a valid, non-empty URL string.',
      });
    }

    let db: Database = this.databases[dbUrl];
    if (typeof db === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const rtdb = require('@firebase/database-compat/standalone');
      db = rtdb.initStandalone(this.appInternal, dbUrl, getSdkVersion()).instance;

      const rulesClient = new DatabaseRulesClient(this.app, dbUrl);
      db.getRules = () => {
        return rulesClient.getRules();
      };
      db.getRulesJSON = () => {
        return rulesClient.getRulesJSON();
      };
      db.setRules = (source: string) => {
        return rulesClient.setRules(source);
      };

      this.databases[dbUrl] = db;
    }

    if (!this.tokenListener) {
      this.tokenListener = this.onTokenChange.bind(this);
      this.firebaseApp.INTERNAL.addAuthTokenListener(this.tokenListener);
    }

    return db;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onTokenChange(_: string): void {
    const token = this.firebaseApp.INTERNAL.getCachedToken();
    if (token) {
      const delayMillis = token.expirationTime - TOKEN_REFRESH_THRESHOLD_MILLIS - Date.now();
      // If the new token is set to expire soon (unlikely), do nothing. Somebody will eventually
      // notice and refresh the token, at which point this callback will fire again.
      if (delayMillis > 0) {
        this.scheduleTokenRefresh(delayMillis);
      }
    }
  }

  private scheduleTokenRefresh(delayMillis: number): void {
    clearTimeout(this.tokenRefreshTimeout);
    this.tokenRefreshTimeout = setTimeout(() => {
      this.firebaseApp.INTERNAL.getToken(/*forceRefresh=*/ true)
        .catch(() => {
          // Ignore the error since this might just be an intermittent failure. If we really cannot
          // refresh the token, an error will be logged once the existing token expires and we try
          // to fetch a fresh one.
        });
    }, delayMillis);
  }

  private ensureUrl(url?: string): string {
    if (typeof url !== 'undefined') {
      return url;
    } else if (typeof this.appInternal.options.databaseURL !== 'undefined') {
      return this.appInternal.options.databaseURL;
    }
    throw new FirebaseDatabaseError({
      code: 'invalid-argument',
      message: 'Can\'t determine Firebase Database URL.',
    });
  }
}

const RULES_URL_PATH = '.settings/rules.json';

/**
 * A helper client for managing RTDB security rules.
 */
class DatabaseRulesClient {

  private readonly dbUrl: string;
  private readonly httpClient: AuthorizedHttpClient;

  constructor(app: App, dbUrl: string) {
    let parsedUrl = new URL(dbUrl);
    const emulatorHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
    if (emulatorHost) {
      const namespace = extractNamespace(parsedUrl);
      parsedUrl = new URL(`http://${emulatorHost}?ns=${namespace}`);
    }

    parsedUrl.pathname = path.join(parsedUrl.pathname, RULES_URL_PATH);
    this.dbUrl = parsedUrl.toString();
    this.httpClient = new AuthorizedHttpClient(app as FirebaseApp);
  }

  /**
   * Gets the currently applied security rules as a string. The return value consists of
   * the rules source including comments.
   *
   * @returns A promise fulfilled with the rules as a raw string.
   */
  public getRules(): Promise<string> {
    const req: HttpRequestConfig = {
      method: 'GET',
      url: this.dbUrl,
    };
    return this.httpClient.send(req)
      .then((resp) => {
        if (!resp.text) {
          throw new FirebaseAppError(AppErrorCodes.INTERNAL_ERROR, 'HTTP response missing data.');
        }
        return resp.text;
      })
      .catch((err) => {
        throw this.handleError(err);
      });
  }

  /**
   * Gets the currently applied security rules as a parsed JSON object. Any comments in
   * the original source are stripped away.
   *
   * @returns {Promise<object>} A promise fulfilled with the parsed rules source.
   */
  public getRulesJSON(): Promise<object> {
    const req: HttpRequestConfig = {
      method: 'GET',
      url: this.dbUrl,
      data: { format: 'strict' },
    };
    return this.httpClient.send(req)
      .then((resp) => {
        return resp.data;
      })
      .catch((err) => {
        throw this.handleError(err);
      });
  }

  /**
   * Sets the specified rules on the Firebase Database instance. If the rules source is
   * specified as a string or a Buffer, it may include comments.
   *
   * @param {string|Buffer|object} source Source of the rules to apply. Must not be `null`
   *  or empty.
   * @returns {Promise<void>} Resolves when the rules are set on the Database.
   */
  public setRules(source: string | Buffer | object): Promise<void> {
    if (!validator.isNonEmptyString(source) &&
      !validator.isBuffer(source) &&
      !validator.isNonNullObject(source)) {
      const error = new FirebaseDatabaseError({
        code: 'invalid-argument',
        message: 'Source must be a non-empty string, Buffer or an object.',
      });
      return Promise.reject(error);
    }

    const req: HttpRequestConfig = {
      method: 'PUT',
      url: this.dbUrl,
      data: source,
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    };
    return this.httpClient.send(req)
      .then(() => {
        return;
      })
      .catch((err) => {
        throw this.handleError(err);
      });
  }

  private handleError(err: Error): Error {
    if (err instanceof HttpError) {
      return new FirebaseDatabaseError({
        code: AppErrorCodes.INTERNAL_ERROR,
        message: this.getErrorMessage(err),
      });
    }
    return err;
  }

  private getErrorMessage(err: HttpError): string {
    const intro = 'Error while accessing security rules';
    try {
      const body: { error?: string } = err.response.data;
      if (body && body.error) {
        return `${intro}: ${body.error.trim()}`;
      }
    } catch {
      // Ignore parsing errors
    }

    return `${intro}: ${err.response.text}`;
  }
}

function extractNamespace(parsedUrl: URL): string {
  const ns = parsedUrl.searchParams.get('ns');
  if (ns) {
    return ns;
  }

  const hostname = parsedUrl.hostname;
  const dotIndex = hostname.indexOf('.');
  return hostname.substring(0, dotIndex).toLowerCase();
}
