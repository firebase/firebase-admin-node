## API Report File for "firebase-admin.instance-id"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { Agent } from 'http';

// Warning: (ae-forgotten-export) The symbol "FirebaseError" needs to be exported by the entry point index.d.ts
//
// @public
export class FirebaseInstanceIdError extends FirebaseError {
}

// Warning: (ae-forgotten-export) The symbol "App" needs to be exported by the entry point index.d.ts
//
// @public @deprecated
export function getInstanceId(app?: App): InstanceId;

// @public @deprecated
export class InstanceId {
    get app(): App;
    deleteInstanceId(instanceId: string): Promise<void>;
}

// Warning: (ae-forgotten-export) The symbol "InstallationsClientErrorCode" needs to be exported by the entry point index.d.ts
//
// @public (undocumented)
export class InstanceIdClientErrorCode extends InstallationsClientErrorCode {
    // (undocumented)
    static INVALID_INSTANCE_ID: {
        code: string;
        message: string;
    };
}

```
