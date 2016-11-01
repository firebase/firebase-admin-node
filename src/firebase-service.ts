import {FirebaseApp} from './firebase-app';


/**
 * Internals of a FirebaseService instance.
 */
export interface FirebaseServiceInternalsInterface {
  delete(): Promise<void>;
}

/**
 * Services are exposed through instances, each of which is associated with a FirebaseApp.
 */
export interface FirebaseServiceInterface {
  app: FirebaseApp;
  INTERNAL: FirebaseServiceInternalsInterface;
}

/**
 * Factory method to create FirebaseService instances given a FirebaseApp instance. Can optionally
 * add properties and methods to each FirebaseApp instance via the extendApp() function.
 */
export interface FirebaseServiceFactory {
  (app: FirebaseApp, extendApp?: (props: Object) => void): FirebaseServiceInterface;
}
