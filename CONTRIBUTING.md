# Contributing | Firebase Admin Node.js SDK

## Table of Contents

1. [Local Setup](#Local-Setup)
2. [Running Tests](#Running-Tests)
3. [Proposing Changes](#Proposing-Changes)
4. [Release Process](#Release-Process)
   1. [Initial Steps](#Initial-Steps)
   2. [Recurring Steps](#Recurring-Steps)
5. [Updating Realtime Database Code](#Updating-Realtime-Database-Code)
6. [Updating Reference Documentation](#Updating-Reference-Documentation)


## Local Setup

Follow the [setup instructions for Git-on-Borg](https://gerrit-internal.git.corp.google.com/docs/+/master/users/from-gmac.md#Setup)
and then clone the repo to your local machine with the commit hook:

```bash
$ git credential-corpsso login   # Similar to prodaccess; need to do this daily
$ git clone sso://team/firebase-team/firebase-admin-node && (cd firebase-admin-node && curl -Lo `git rev-parse --git-dir`/hooks/commit-msg https://gerrit-review.googlesource.com/tools/hooks/commit-msg ; chmod +x `git rev-parse --git-dir`/hooks/commit-msg)
```

Next, install all necessary dependencies:

```bash
$ npm install -g gulp # Install global npm dependencies
$ npm install         # Install local npm dependencies
```

In order to run the tests, you need to [download the gcloud CLI](https://cloud.google.com/sdk/downloads#interactive)
and run the following command:

```bash
gcloud beta auth application-default login
```

Finally, simply run `gulp` to lint, build, and test the code:

```bash
$ gulp   # Lint, build, and test
```


## Running Tests

There are two test suites: unit and integration. The unit test suite is intended to be run during
development and the integration test suite is intended to be run before packaging up release
candidates.

To run the unit test suite:

```bash
$ gulp   # Lint, build, and run unit test suite
```

To run the integration test suite:

```bash
$ node test/integration   # Run integration test suite
```

The integration test suite requires you to generate a service account key JSON file for the
**admin-sdks-test** Firebase project and save it to `test/resources/key.json`. You can generate this
from the
[**Service Accounts**](https://console.firebase.google.com/project/admin-sdks-test/settings/serviceaccounts/adminsdk)
tab of that project's settings page.


## Proposing Changes

Git-on-Borg requires all reviews to contain just a single commit. To propose a change to this repo,
follow the local setup instructions above. It is important to use the `git clone` command above
which includes the commit hook. Once you are set up locally, create a new feature branch:

```bash
$ git checkout -b <NEW_BRANCH_NAME>
```

After you've made your code changes, commit your files:

```bash
$ git commit -am "<COMMIT_MESSAGE>"
```

To kick off a new CL, upload the changes to Gerrit, the code review tool:

```bash
$ git push origin HEAD:refs/for/master
```

You should see the CL show up [within the Gerrit UI](https://team-review.git.corp.google.com/#/dashboard/self). If you need to make changes after your first commit, you will need to amend the previous
commit so that you only ever have one commit:

```bash
$ git commit --amend
```

You can then upload your changes back to Gerrit via the same `git push` command listed above.


## Release Process

### Initial Steps

1. Email firebase-ops@google.com and vikrum@google.com requesting the following:
   1. Read access to the
      [`firebase/firebase-client-js`](https://www.github.com/firebase/firebase-client-js) GitHub
      repo in order to get the latest Realtime Database code.
   2. Editor access to the
      [Firebase Development](https://pantheon.corp.google.com/home/dashboard?project=firebase-dev)
      GCP project in order to upload new release tarballs.
   3. Access to the
      [Firebase SF production Jenkins instance](https://jenkins-firebase-prod.firebaseint.com/) in
      order to do Catapult deploys.

### Recurring Steps

1. [If needed] Update `src/database/database.js` to the latest commit.
   1. See [Updating Realtime Database Code](#Updating-Realtime-Database-Code) for details.
2. Prepare release notes for the upcoming release (e.g.,
   [cl/141203171](https://critique.corp.google.com/#review/141203171)).
3. Create a release tarball containing the code that will be shipped.
   1. Run `$ ./createReleaseTarball.sh X.Y.Z-rc#` where `X.Y.Z` is the SDK's new SemVer version
      number and `#` is the release candidate version, starting at `0`.
   2. This will update the `package.json` and `npm-shrinkwrap.json` files as well and create a new
      tarball named `firebase-admin-X.Y.Z-rc#.tgz`.
4. Create a CL with the updated `package.json` and `npm-shrinkwrap.json` (e.g.,
   [gob-cl/56646](https://team-review.git.corp.google.com/#/c/56646/)).
5. Upload the `firebase-admin-X.Y.Z-rc#.tgz` tarball to the
   [firebase-admin-node](https://pantheon.corp.google.com/storage/browser/firebase-admin-node/?project=firebase-dev)
   GCS bucket within the Firebase Development project.
   1. After uploading, make sure to select "Public link" on the right hand side to ensure the
      tarball is publicly accessible.
   2. The tarball can be downloaded via:
      `$ npm install https://storage.googleapis.com/firebase-admin-node/firebase-admin-X.Y.Z-rc#.tgz`
   3. When the release is actually going to happen, copy the latest release candidate to
      `firebase-admin-X.Y.Z.tgz` (note the lack of a `-rc#` suffix).
6. Deploy the library via [Catapult](https://jenkins-firebase-prod.firebaseint.com/job/catapult/build).
   1. Select "firebase-admin" from the dropdown.
   2. Type the version number into the input box.
   3. Click "Build".
7. Ping someone with OWNERS approval to publish the release notes to production.
8. [If needed] Update the reference documentation if the Admin Node.js externs have changed since
   the last release.
   1. See [Updating Reference Documentation](#Updating-Reference-Documentation) for details.
9. Perform some sanity checks.
   1. Make sure that the Jenkins build succeeded.
      1. You can view output from the build by clicking on the build in the "Build History" box on
         the left-hand side and then clicking "Console Output".
   2. Ensure that the release was actually published to npm.
      1. `$ npm show firebase-admin version`
   3. Ensure the [@FirebaseRelease](https://twitter.com/firebaserelease) release tweet went out.



## Updating Realtime Database Code

The code for the Realtime Database in [database/database.js](./database/database.js) of this repo
is imported as a minified file from the [firebase/firebase-client-js](https://github.com/firebase/firebase-client-js)
GitHub repo. To update that code, follow these instructions:

1. Make sure you have access to the [firebase/firebase-client-js](https://github.com/firebase/firebase-client-js)
GitHub repo. If you do not have access, the above link will 404 and you should send an email to
firebase-ops@google.com with your GitHub username requesting access.

2. Clone the GitHub repo.

3. Switch to the `firebase-v2` branch:

  ```
  $ git checkout firebase-v2
  ```

4. Configure the repo:

  ```
  $ source tools/use
  $ configure-project
  ```

5. Compile the Firebase JavaScript client artifacts:

  ```
  $ build-client
  ```

6. Copy `target/firebase-node.js` of the `firebase/firebase-client-js` repo into
[`src/database/database.js`](./src/database/database.js) of this repo.

7. Add a comment to the top of the file with the format:

   `/* Copied from firebase/firebase-client-js commit <commit_hash> */`

   where `<commit_hash>` is the commit hash from which you copied the file.

8. After ensuring all tests still pass, send a CL containing the updated file.


# Updating Reference Documentation

The [reference documentation for this SDK](https://firebase.google.com/docs/reference/admin/node/)
is generated from
[extern files](https://cs.corp.google.com/piper///depot/google3/firebase/jscore/api/admin/) located
in google3. These extern files are the source of truth and should be edited directly.

To turn these extern files into actual HTML files, run the following from the root `google3/`
directory of a CitC client:

```bash
$ cd firebase/jscore
$ source tools/use
$ regenerate-admin-reference
```

You can then stage the generated HTML files to
[staging Devsite](https://firebase-dot-devsite.googleplex.com/docs/reference/admin/node/):

```bash
$ devsite stage ../../googledata/devsite/site-firebase/en/docs/reference/admin/node/
```

If things look good on staging Devsite, create a new CL with the updates to the generated files
(e.g., [cl/141195439](https://critique.corp.google.com/#review/141195439)).
