import * as firebase from './default-namespace';
import registerAuth from './auth/register-auth';

// Register the database service
// For historical reasons, the database code is included as minified code and registers itself
// as a side effect of requiring the file.
/* tslint:disable:no-var-requires */
require('./database/database');
/* tslint:enable:no-var-requires */

// Register the auth service
registerAuth();

export = firebase;
