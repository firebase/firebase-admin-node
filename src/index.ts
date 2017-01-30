import * as firebase from './default-namespace';
import registerAuth from './auth/register-auth';
import registerMessaging from './messaging/register-messaging';

// Register the Database service
// For historical reasons, the database code is included as minified code and registers itself
// as a side effect of requiring the file.
/* tslint:disable:no-var-requires */
require('./database/database');
/* tslint:enable:no-var-requires */

// Register the Auth service
registerAuth();

// Register the Messaging service
registerMessaging();

export = firebase;
