import {FirebaseApp} from '../firebase-app';
import {FirebaseDatabaseError} from '../utils/error';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {Database} from '@firebase/database';

import * as validator from '../utils/validator';


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

export class DatabaseService implements FirebaseServiceInterface {

  public INTERNAL: DatabaseInternals = new DatabaseInternals();

  private appInternal: FirebaseApp;

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
      const rtdb = require('@firebase/database');
      const { version } = require('../../package.json');
      db = rtdb.initStandalone(this.appInternal, dbUrl, version).instance;
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
