import {FirebaseApp} from '../firebase-app';
import {FirebaseDatabaseError} from '../utils/error';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {initStandalone, Database} from '@firebase/database';

import * as validator from '../utils/validator';


/**
 * Internals of a Database instance.
 */
class DatabaseInternals implements FirebaseServiceInternalsInterface {

  public databases: {
    [dbUrl: string]: Database
  } = {};

  /**
   * Deletes the service and its associated resources.
   *
   * @return {Promise<()>} An empty Promise that will be fulfilled when the service is deleted.
   */
  public delete(): Promise<void> {
    for (const dbUrl of Object.keys(this.databases)) {
      let db: Database = this.databases[dbUrl];
      db.INTERNAL.delete();
    }
    return Promise.resolve(undefined);
  }
}

export class DatabaseService implements FirebaseServiceInterface {

  public INTERNAL: DatabaseInternals = new DatabaseInternals();

  private appInternal: FirebaseApp;

  constructor(app: FirebaseApp) {
    this.appInternal = app;
  }

  /**
   * Returns the app associated with this Storage instance.
   *
   * @return {FirebaseApp} The app associated with this Storage instance.
   */
  get app(): FirebaseApp {
    return this.appInternal;
  }

  public getDatabase(url: string): Database {
    if (!validator.isNonEmptyString(url)) {
      throw new FirebaseDatabaseError({
        code: 'invalid-argument',
        message: 'Can\'t determine Firebase Database URL.',
      });
    }
    let db: Database = this.INTERNAL.databases[url];
    if (typeof db === 'undefined') {
      db = initStandalone(this.appInternal, url).instance;
      this.INTERNAL.databases[url] = db;
    }
    return db;
  }
}
