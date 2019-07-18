import {DatabaseEmulatorCredential} from '../auth/credential';
import {FirebaseApp} from '../firebase-app';
import {FirebaseDatabaseError} from '../utils/error';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {Database} from '@firebase/database';

import * as validator from '../utils/validator';

const APP_OPTIONS_PROJECT_ID = 'projectId';
const APP_OPTIONS_CREDENTIAL = 'credential';

/**
 * Constant holding the fully-qualified domain URI for a database emulator
 * instance. If specified, the contents of this variable will be used to
 * set `databaseURL` in FirebaseAppOptions. The varaible should be a complete
 * URI specifying a transfer protocol, hostname, and port number:
 *
 * FIREBASE_DATABASE_EMULATOR_HOST=http://localhost:9000
 *
 *
 * If a `projectId` is specified in FirebaseAppOptions, the database url will
 * include the `ns=${projectId}` query parameter to identify the appropriate
 * namespace within the emulator. The final `databaseURL` for a firebase project
 * called "test" would be:
 *
 * http://localhost:9000?ns=test
 */
const FIREBASE_DATABASE_EMULATOR_HOST_VAR = 'FIREBASE_DATABASE_EMULATOR_HOST';
const DEFAULT_DATABASE_EMULATOR_PROJECT_ID = 'fake-server';

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
    const emulatorUrl = process.env[FIREBASE_DATABASE_EMULATOR_HOST_VAR];
    if (emulatorUrl) {
      url = `${emulatorUrl}?ns=${this.appInternal.options[APP_OPTIONS_PROJECT_ID] ||
        DEFAULT_DATABASE_EMULATOR_PROJECT_ID }`;
      this.appInternal.options[APP_OPTIONS_CREDENTIAL] = new DatabaseEmulatorCredential();
    }
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
