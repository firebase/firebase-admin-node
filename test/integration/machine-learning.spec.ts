/*!
 * Copyright 2020 Google Inc.
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

import * as admin from '../../lib/index';

describe('admin.machineLearning', () => {
  describe('getModel()', () => {
    it('rejects with not-found when the Model does not exist', () => {
      const nonExistingName = '00000000';
      return admin.machineLearning().getModel(nonExistingName)
        .should.eventually.be.rejected.and.have.property(
          'code', 'machine-learning/not-found');
    });

    it('rejects with invalid-argument when the ModelId is invalid', () => {
      return admin.machineLearning().getModel('invalid-model-id')
        .should.eventually.be.rejected.and.have.property(
          'code', 'machine-learning/invalid-argument');
    });
  });
});
