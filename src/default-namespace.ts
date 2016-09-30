import {FirebaseNamespace} from './firebase-namespace';

let firebase = new FirebaseNamespace();

// Inject a circular default export to allow users to use both:
//
//   import firebase from 'firebase';
//   which becomes: var firebase = require('firebase').default;
//
// as well as the more correct:
//
//   import * as firebase from 'firebase';
//   which becomes: var firebase = require('firebase');
(firebase as any).default = firebase;

export = firebase;
