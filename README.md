[![Build Status](https://travis-ci.org/firebase/firebase-admin-node.svg?branch=master)](https://travis-ci.org/firebase/firebase-admin-node)

# Firebase Admin Node.js SDK


## Table of Contents

 * [Overview](#overview)
 * [Installation](#installation)
 * [Contributing](#contributing)
 * [Documentation](#documentation)
 * [Acknowledgments](#acknowledgments)
 * [License](#license)


## Overview

[Firebase](https://firebase.google.com) provides the tools and infrastructure
you need to develop your app, grow your user base, and earn money. The Firebase
Admin Node.js SDK enables access to Firebase services from privileged environments
(such as servers or cloud) in Node.js.

For more information, visit the
[Firebase Admin SDK setup guide](https://firebase.google.com/docs/admin/setup/).


## Installation

The Firebase Admin Node.js SDK is available on npm as `firebase-admin`:

```bash
$ npm install --save firebase-admin
```

To use the module in your application, `require` it from any JavaScript file:

```js
var admin = require("firebase-admin");
```

If you are using ES2015, you can `import` the module instead:

```js
import * as admin from "firebase-admin";
```


## Contributing

Please refer to the [CONTRIBUTING page](./CONTRIBUTING.md) for more information
about how you can contribute to this project. We welcome bug reports, feature
requests, code review feedback, and also pull requests.


## Documentation

* [Setup Guide](https://firebase.google.com/docs/admin/setup/)
* [Database Guide](https://firebase.google.com/docs/database/admin/start/)
* [Authentication Guide](https://firebase.google.com/docs/auth/admin/)
* [Cloud Messaging Guide](https://firebase.google.com/docs/cloud-messaging/admin/)
* [API Reference](https://firebase.google.com/docs/reference/admin/node/)
* [Release Notes](https://firebase.google.com/support/release-notes/admin/node/)


## Acknowledgments

Thanks to the team at [Casetext](https://casetext.com/) for transferring
ownership of the `firebase-admin` npm module over to the Firebase team
and for their longtime use and support of the Firebase platform.


## License

Firebase Admin Node.js SDK is licensed under the
[Apache License, version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

Your use of Firebase is governed by the
[Terms of Service for Firebase Services](https://firebase.google.com/terms/).
