import {initFirestoreService} from './firestore';
import {AppHook, FirebaseApp} from '../firebase-app';
import {FirebaseServiceInterface} from '../firebase-service';
import * as firebase from '../default-namespace';
import {FirebaseServiceNamespace} from '../firebase-namespace';
import * as firestoreNamespace from '@google-cloud/firestore';
import * as _ from 'lodash/object';

/**
 * Factory function that creates a new Firestore service.
 *
 * @param {Object} app The app for this service.
 * @param {function(Object)} extendApp An extend function to extend the app namespace.
 *
 * @return {Firestore} The Firestore service for the specified app.
 */
function serviceFactory(app: FirebaseApp, extendApp: (props: Object) => void): FirebaseServiceInterface {
  return initFirestoreService(app);
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
    'firestore',
    serviceFactory,
    _.assign({}, firestoreNamespace),
    appHook
  );
}
