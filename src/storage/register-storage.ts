import {Storage} from './storage';
import {AppHook, FirebaseApp} from '../firebase-app';
import {FirebaseServiceInterface} from '../firebase-service';
import * as firebase from '../default-namespace';
import {FirebaseServiceNamespace} from '../firebase-namespace';

/**
 * Factory function that creates a new Storage service.
 *
 * @param {Object} app The app for this service.
 * @param {function(Object)} extendApp An extend function to extend the app namespace.
 *
 * @return {Storage} The Storage service for the specified app.
 */
function serviceFactory(app: FirebaseApp, extendApp: (props: Object) => void): FirebaseServiceInterface {
  return new Storage(app);
}

/**
 * Handles app life-cycle events.
 *
 * @param {string} event The app event that is occurring.
 * @param {FirebaseApp} app The app for which the app hook is firing.
 */
let appHook: AppHook = (event: string, app: FirebaseApp) => {
  return;
};

export default function(): FirebaseServiceNamespace<FirebaseServiceInterface> {
  return firebase.INTERNAL.registerService(
    'storage',
    serviceFactory,
    {Storage},
    appHook
  );
}
