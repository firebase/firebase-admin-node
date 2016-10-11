import {FirebaseNamespace} from './firebase-namespace';

let firebaseAdmin = new FirebaseNamespace();

// Inject a circular default export to allow users to use both:
//
//   import firebaseAdmin from 'firebase-admin';
//   which becomes: var firebaseAdmin = require('firebase-admin').default;
//
// as well as the more correct:
//
//   import * as firebaseAdmin from 'firebase-admin';
//   which becomes: var firebaseAdmin = require('firebase-admin');
(firebaseAdmin as any).default = firebaseAdmin;

export = firebaseAdmin;
