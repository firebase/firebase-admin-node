This is a simple test to verify the `firebase-admin/*` module imports on
Node.js 12.

## Steps to run

1. `npm install`
2. `npm test`

## Expected output

The `main.js` file imports some functions and classes from
`firebase-admin/app` and `firebase-admin/firestore` module entry points.
These are then re-exported for further use.

The `main.spec.js` is a simple Mocha test script that imports the
definitions re-exported by `main.js`.

If everything works as expected:

```
$ npm test

> nodetest@1.0.0 test
> mocha main.spec.js



  firebase-admin/app
    ✔ should load initializeApp

  firebase-admin/firestore
    ✔ should load getFirestore


  2 passing (34ms)
```

