---
name: Firestore issue
about: Bug reports and feature requests related to Cloud Firestore
title: "[Firestore]"
labels: 'api: firestore'
assignees: schmidt-sebastian

---

### [READ] Step 1: Are you in the right place?

**Cloud Firestore support is provided by the [`@google-cloud/firestore`](https://npmjs.com/package/@google-cloud/firestore) library. Therefore the easiest and most efficient way to get Firestore issues resolved is by directly reporting them at the [nodejs-firestore](https://github.com/googleapis/nodejs-firestore) GitHub repo.**

If you still think the problem is related to the code in this repository, then read on.

  * For issues or feature requests related to __the code in this repository__
    file a Github issue.
  * For general technical questions, post a question on [StackOverflow](http://stackoverflow.com/)
    with the firebase tag.
  * For general Firebase discussion, use the [firebase-talk](https://groups.google.com/forum/#!forum/firebase-talk)
    google group.
  * For help troubleshooting your application that does not fall under one
    of the above categories, reach out to the personalized
    [Firebase support channel](https://firebase.google.com/support/).

### [REQUIRED] Step 2: Describe your environment

  * Operating System version: _____
  * Firebase SDK version: _____
  * Firebase Product: Firestore
  * Node.js version: _____
  * NPM version: _____

### [REQUIRED] Step 3: Describe the problem

#### Steps to reproduce:

What happened? How can we make the problem occur?
This could be a description, log/console output, etc.

You can enable logging for Firestore by including the following line in your code:

```
admin.firestore.setLogFunction(console.log);
```

This will print Firestore logs to the console.

#### Relevant Code:

```
// TODO(you): code here to reproduce the problem
```
