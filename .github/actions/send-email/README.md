# Send Email GitHub Action

This is a minimalistic GitHub Action for sending emails using the Mailgun API.
Specify the Mailgun API key along with the Mailgun domain and message to
be sent.

## Inputs

### `api-key`

**Required** Mailgun API key.

### `domain`

**Required** Mailgun domain name.

### `from`

**Required** Sender's email address. Ex: 'Hello User <hello@example.com>' (defaults to 'user@{domain}`).

### `to`

**Required** Recipient's email address. You can use commas to separate multiple recipients.

### `cc`

Email addresses to Cc.

### `subject`

**Required** Message subject.

### `text`

Text body of the message.

### `html`

HTML body of the message.

## Example usage

```
- name: Send Email
  uses: firebase/firebase-admin-node/.github/actions/send-email
  with:
    api-key: ${{ secrets.MAILGUN_API_KEY }}
    domain: ${{ secrets.MAILGUN_DOMAIN }}
    from: 'User <you@yourdomain.com>'
    html: '<h1>Testing some Mailgun awesomness!</h1>'
    to: 'foo@example.com'
```

## Implementation

This Action uses the `mailgun.js` NPM package to send Emails.

When making a code change remember to run `npm run pack` to rebuild the
`dist/index.js` file which is the executable of this Action.
