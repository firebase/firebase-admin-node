/*!
 * Copyright 2022 Google Inc.
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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { getFunctions } from '../../lib/functions/index';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('getFunctions()', () => {

  describe('taskQueue()', () => {
    it('successfully returns a taskQueue', () => {
      const factorizeQueue = getFunctions().taskQueue('queue-name');
      expect(factorizeQueue).to.be.not.undefined;
      expect(typeof factorizeQueue.enqueue).to.equal('function');
    });
  });
});
