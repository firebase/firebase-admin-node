import {Auth} from './auth';
import {FirebaseApp} from '../firebase-app';
import * as firebase from '../default-namespace';

/**
 * Factory function that creates a new auth service.
 * @param {Object} app The app for this service
 * @param {function(Object)} extendApp An extend function to extend the app
 *                                     namespace
 * @return {Auth} The auth service for the specified app.
 */
function serviceFactory(app: FirebaseApp, extendApp: (props: Object) => void): FirebaseServiceInterface {
  const auth = new Auth(app);

  extendApp({
    INTERNAL: {
      getToken: auth.INTERNAL.getToken.bind(auth.INTERNAL),
      addAuthTokenListener: auth.INTERNAL.addAuthTokenListener.bind(auth.INTERNAL),
      removeAuthTokenListener: auth.INTERNAL.removeAuthTokenListener.bind(auth.INTERNAL),
    },
  });

  return auth;
}

/**
 * Handles app life-cycle events. Initializes auth so listerners and getToken() functions are
 * available to other services immediately.
 *
 * @param {string} event The app event that is occurring.
 * @param {FirebaseApp} app The app for which the app hook is firing.
 */
let appHook: AppHook = (event: string, app: FirebaseApp) => {
  if (event === 'create') {
    // Initializes auth so listeners and getToken() functions are available to other services immediately.
    (app as FirebaseAppInterface).auth();
  }
};

export default function() {
  return firebase.INTERNAL.registerService(
    'auth',
    serviceFactory,
    {Auth},
    appHook
  );
}
