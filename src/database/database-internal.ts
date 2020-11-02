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

import { FirebaseApp } from '../firebase-app';
import { FirebaseDatabaseError, AppErrorCodes, FirebaseAppError } from '../utils/error';
import { FirebaseServiceInterface, FirebaseServiceInternalsInterface } from '../firebase-service';
import { Database as DatabaseImpl } from '@firebase/database';
import { database } from './index';

import * as validator from '../utils/validator';
import { AuthorizedHttpClient, HttpRequestConfig, HttpError } from '../utils/api-request';
import { getSdkVersion } from '../utils/index';

import Database = database.Database;

/**
 * Internals of a Database instance.
 */
class DatabaseInternals implements FirebaseServiceInternalsInterface {

  public databases: {
    [dbUrl: string]: Database;
  } = {};

  /**
   * Deletes the service and its associated resources.
   *
   * @return {Promise<()>} An empty Promise that will be fulfilled when the service is deleted.
   */
  public delete(): Promise<void> {
    for (const dbUrl of Object.keys(this.databases)) {
      const db: DatabaseImpl = ((this.databases[dbUrl] as any) as DatabaseImpl);
      db.INTERNAL.delete();
    }
    return Promise.resolve(undefined);
  }
}

export class DatabaseService implements FirebaseServiceInterface {

  public readonly INTERNAL: DatabaseInternals = new DatabaseInternals();

  private readonly appInternal: FirebaseApp;

  constructor(app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseDatabaseError({
        code: 'invalid-argument',
        message: 'First argument passed to admin.database() must be a valid Firebase app instance.',
      });
    }
    this.appInternal = app;
  }

  /**
   * Returns the app associated with this DatabaseService instance.
   *
   * @return {FirebaseApp} The app associated with this DatabaseService instance.
   */
  get app(): FirebaseApp {
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

    let db: Database = this.INTERNAL.databases[dbUrl];
    if (typeof db === 'undefined') {
      const rtdb = require('@firebase/database'); // eslint-disable-line @typescript-eslint/no-var-requires
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

      this.INTERNAL.databases[dbUrl] = db;
    }
    return db;
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

  constructor(app: FirebaseApp, dbUrl: string) {
    const parsedUrl = new URL(dbUrl);
    parsedUrl.pathname = path.join(parsedUrl.pathname, RULES_URL_PATH);
    this.dbUrl = parsedUrl.toString();
    this.httpClient = new AuthorizedHttpClient(app);
  }

  /**
   * Gets the currently applied security rules as a string. The return value consists of
   * the rules source including comments.
   *
   * @return {Promise<string>} A promise fulfilled with the rules as a raw string.
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
   * @return {Promise<object>} A promise fulfilled with the parsed rules source.
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
   * @return {Promise<void>} Resolves when the rules are set on the Database.
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
