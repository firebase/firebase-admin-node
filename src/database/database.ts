import {resolve} from 'url';

import {FirebaseApp} from '../firebase-app';
import {FirebaseDatabaseError, AppErrorCodes} from '../utils/error';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {Database} from '@firebase/database';

import * as validator from '../utils/validator';
import { AuthorizedHttpClient, HttpRequestConfig, HttpError } from '../utils/api-request';


/**
 * Internals of a Database instance.
 */
class DatabaseInternals implements FirebaseServiceInternalsInterface {

  public databases: {
    [dbUrl: string]: Database,
  } = {};

  /**
   * Deletes the service and its associated resources.
   *
   * @return {Promise<()>} An empty Promise that will be fulfilled when the service is deleted.
   */
  public delete(): Promise<void> {
    for (const dbUrl of Object.keys(this.databases)) {
      const db: Database = this.databases[dbUrl];
      db.INTERNAL.delete();
    }
    return Promise.resolve(undefined);
  }
}

declare module '@firebase/database' {
  interface Database {
    getRules(): Promise<string>;
    getRulesJSON(): Promise<object>;
    setRules(source: string | Buffer | object): Promise<void>;
  }
}

export class DatabaseService implements FirebaseServiceInterface {

  public readonly INTERNAL: DatabaseInternals = new DatabaseInternals();

  private readonly appInternal: FirebaseApp;
  private readonly httpClient: AuthorizedHttpClient;

  constructor(app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseDatabaseError({
        code: 'invalid-argument',
        message: 'First argument passed to admin.database() must be a valid Firebase app instance.',
      });
    }
    this.appInternal = app;
    this.httpClient = new AuthorizedHttpClient(app);
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
      const rtdb = require('@firebase/database');
      const { version } = require('../../package.json');
      db = rtdb.initStandalone(this.appInternal, dbUrl, version).instance;

      const rulesClient = new DatabaseRulesClient(this.app, dbUrl);
      db.getRules = () => {
        return rulesClient.getRules();
      };
      db.getRulesJSON = () => {
        return rulesClient.getRulesJSON();
      };
      db.setRules = (source) => {
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

class DatabaseRulesClient {

  private readonly httpClient: AuthorizedHttpClient;
  private readonly dbUrl: string;

  constructor(app: FirebaseApp, dbUrl: string) {
    this.httpClient = new AuthorizedHttpClient(app);
    this.dbUrl = dbUrl;
  }

  public getRules(): Promise<string> {
    const req: HttpRequestConfig = {
      method: 'GET',
      url: this.getRulesUrl(),
    };
    return this.httpClient.send(req)
      .then((resp) => {
        return resp.text;
      })
      .catch((err) => {
        throw this.handleError(err);
      });
  }

  public getRulesJSON(): Promise<object> {
    const req: HttpRequestConfig = {
      method: 'GET',
      url: `${this.getRulesUrl()}?format=strict`,
    };
    return this.httpClient.send(req)
      .then((resp) => {
        return resp.data;
      })
      .catch((err) => {
        throw this.handleError(err);
      });
  }

  public setRules(source: string | Buffer | object): Promise<void> {
    const req: HttpRequestConfig = {
      method: 'PUT',
      url: this.getRulesUrl(),
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

  private getRulesUrl(): string {
    return resolve(this.dbUrl, RULES_URL_PATH);
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
      const body: {error?: string} = err.response.data;
      if (body && body.error) {
        return `${intro}: ${body.error.trim()}`;
      }
    } catch {
      // Ignore parsing errors
    }

    return `${intro}: ${err.response.text}`;
  }
}
