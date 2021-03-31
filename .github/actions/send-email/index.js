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
const optionalFields = ['cc', 'text', 'html'];

function loadConfig() {
  return {
    apiKey: core.getInput('api-key'),
    domain: core.getInput('domain'),
    to: core.getInput('to'),
    from: core.getInput('from'),
    cc: core.getInput('cc'),
    subject: core.getInput('subject'),
    text: core.getInput('text'),
    html: core.getInput('html'),
  }
}

function validate(config) {
  for (param in config) {
    if (optionalFields.includes(param)) {
      continue;
    }
    validateRequiredParameter(config[param], `'${param}'`);
  }
}

function validateRequiredParameter(value, name) {
  if (!isNonEmptyString(value)) {
    throw new Error(`${name} must be a non-empty string.`);
  }
}

function sendEmail(config) {
  const mg = mailgun.client({
    username: 'api',
    key: config.apiKey,
  });

  return mg.messages
    .create(domain, config)
    .then((resp) => {
      core.setOutput('response', resp.message);
      return;
    })
    .catch((err) => {
      core.setFailed(err.message);
    });
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value !== '';
}

const config = loadConfig();
validate(config);
sendEmail(config);
