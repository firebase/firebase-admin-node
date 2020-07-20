# Firebase Node.js Admin SDK Prototype Testing
### Features
1. Modularized Auth, Database, Firestore
2. Auto-generated typings from the source
3. Non-public API exposed typings automatically removed


### Branch
> https://github.com/firebase/firebase-admin-node/tree/hlazu-modularized-prototype

#### Unit + Integration Tests
```
npm test
npm run integration
```

#### Sanity Test
```
npm run build:dist
mv ./lib/firebase-admin-* ./
./.github/scripts/verify_package.sh ./firebase-admin-*
```

#### Build Artifact
```
npm run build:dist
mv ./lib/firebase-admin-* ./
```

Remarks:
The npm run build:dist will product the artifact in the ./lib folder.


