#!/usr/bin/env node

'use strict';

const isNode = (Object.prototype.toString.call(global.process) === '[object process]');
if (!isNode) {
  const message = `
======== WARNING! ========

firebase-admin appears to have been installed in an abnormal Node.js environment.
This package should only be used in server-side or backend Node.js environments,
and should not be used in web browsers or other client-side environments.

Use the Firebase JS SDK for client-side Firebase integrations:

https://firebase.google.com/docs/web/setup
`;
  console.log(message);
}
