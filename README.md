# firebase-admin - Node.js

The Firebase admin SDK for Node.js, found on npm at `firebase-admin`.

## Local Setup

Follow the [setup instructions for Git-on-Borg](https://gerrit-internal.git.corp.google.com/docs/+/master/users/from-gmac.md#Setup)
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

In order to run the tests, you need to [download the gcloud CLI](https://cloud.google.com/sdk/downloads#interactive)
and run the following command:

```bash
gcloud beta auth application-default login
```

Finally, simply run `gulp` to lint, build, and test the code:

```bash
$ gulp   # Lint, build, and test
```

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

6. Copy `target/firebase-node.js` in the `firebase/firebase-client-js` repo into
[`database/database.js`](./database/database.js) of this repo.

7. Add a comment to the top of the file with the format:

   `/* Copied from firebase/firebase-client-js commit <commit_hash> */`

   where `<commit_hash>` is the commit hash from which you copied the file.

8. After ensuring all tests still pass, send a CL containing the updated file.
