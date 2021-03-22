/*!
 * Copyright 2021 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const core = require('@actions/core');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

const apiKey = core.getInput('api-key');
const domain = core.getInput('domain');
const to = core.getInput('to');

function sendEmail() {
  validate();

  const mg = mailgun.client({
    username: 'api',
    key: apiKey,
  });

  let from = core.getInput('from');
  const cc = core.getInput('cc');
  const subject = core.getInput('subject');
  const text = core.getInput('text');
  const html = core.getInput('html');

  if (!isNonEmptyString(from)) {
    from = `user@${domain}`;
  }

  return mg.messages
    .create(domain, {
      from,
      to,
      cc,
      subject,
      text,
      html,
    })
    .then((resp) => {
      core.setOutput('response', resp.message);
      return;
    })
    .catch((err) => {
      core.setFailed(err.message);
    });
}

function validate() {
  if (!isNonEmptyString(apiKey)) {
    throw new Error('Mailgun API key must be a non-empty string.');
  }
  if (!isNonEmptyString(domain)) {
    throw new Error('Mailgun domain name must be a non-empty string.');
  }
  if (!isNonEmptyString(to)) {
    throw new Error(
      "Recipient's email addresses must be a non-empty string."
    );
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value !== '';
}

sendEmail();
