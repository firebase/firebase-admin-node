/*!
 * @license
 * Copyright 2017 Google Inc.
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

'use strict';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import { messaging } from '../../src/messaging/index';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Typescript', () => {
  // This test was added as part of https://github.com/firebase/firebase-admin-node/issues/1146
  it('should export all types of Messages so it can be used by lib users', () => {
    const tokenMessage: messaging.TokenMessage = { token: '' };
    const topicMessage: messaging.TopicMessage = { topic: '' };
    const conditionMessage: messaging.ConditionMessage = { condition: '' };
    const allMessages: messaging.Message[] = [tokenMessage, topicMessage, conditionMessage]
    
    allMessages.forEach((m) => expect(m).to.not.be.undefined);
  });
});
