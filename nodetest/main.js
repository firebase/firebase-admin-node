'use strict';

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, GeoPoint } = require('firebase-admin/firestore');

exports.initializeApp = () => initializeApp();
exports.getFirestore = () => getFirestore();
exports.Timestamp = Timestamp;
exports.GeoPoint = GeoPoint;
