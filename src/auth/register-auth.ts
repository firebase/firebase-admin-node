import {Auth} from './auth';
import {AppHook, FirebaseApp} from '../firebase-app';
import {FirebaseServiceInterface} from '../firebase-service';
import * as firebase from '../default-namespace';
import {FirebaseServiceNamespace} from '../firebase-namespace';

/**
 * Factory function that creates a new Auth service.
 *
 * @param {Object} app The app for this service.
 * @param {function(Object)} extendApp An extend function to extend the app namespace.
 *
 * @return {Auth} The Auth service for the specified app.
 */
function serviceFactory(app: FirebaseApp, extendApp: (props: Object) => void): FirebaseServiceInterface {
  return new Auth(app);
}

/**
 * Handles app life-cycle events. Initializes auth so listeners and getToken() functions are
 * available to other services immediately.
 *
 * @param {string} event The app event that is occurring.
 * @param {FirebaseApp} app The app for which the app hook is firing.
 */
let appHook: AppHook = (event: string, app: FirebaseApp) => {
  if (event === 'create') {
    // Initializes auth so listeners and getToken() functions are available to other services immediately.
    app.auth();
  }
};

export default function(): FirebaseServiceNamespace<FirebaseServiceInterface> {
  return firebase.INTERNAL.registerService(
    'auth',
    serviceFactory,
    {Auth},
    appHook
  );
}
