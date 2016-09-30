# firebase-admin - Node.js

The Firebase admin SDK for Node.js, found on npm at `firebase-admin`.

## Local Setup

Follow the [setup instructions for Git-on-Borg](https://gerrit-internal.git.corp.google.com/docs/+/master/users/from-gmac.md#)
and then clone the repo to your local machine with the commit hook:

```bash
$ git credential-corpsso login   # Similar to prodaccess; need to do this daily
$ git clone sso://team/firebase-team/firebase-admin-node && (cd firebase-admin-node && curl -Lo `git rev-parse --git-dir`/hooks/commit-msg https://gerrit-review.googlesource.com/tools/hooks/commit-msg ; chmod +x `git rev-parse --git-dir`/hooks/commit-msg)
```

Next, install all necessary dependencies:

```bash
$ npm install -g gulp typings  # Install global npm dependencies
$ npm install                  # Install local npm dependencies
$ typings install              # Install TypeScript typings
```

In order to run the tests you will need a valid service account key at
`./test/resources/key.json`. Follow the instructions for [downloading a JSON key
file](https://developers.google.com/identity/protocols/application-default-credentials#howtheywork).

You will also need to [download the gcloud CLI](https://cloud.google.com/sdk/downloads#interactive)
and run the following command:

```bash
gcloud beta auth application-default login
```

Finally, simply run `gulp` to lint, build, and test the code:

```bash
$ gulp   # Lint, build, and test
```
