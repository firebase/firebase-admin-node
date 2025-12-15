/*!
 * @license
 * Copyright 2025 Google LLC
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
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from '../../resources/mocks';
import { App } from '../../../src/app/index';
import { getFirebasePnv, Fpnv } from '../../../src/fpnv/index';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Fpnv', () => {
  let mockApp: App;
  let mockCredentialApp: App;

  beforeEach(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
  });

  describe('getFirebasePnv()', () => {
    it('should throw when default app is not available', () => {
      expect(() => {
        return getFirebasePnv();
      }).to.throw('The default Firebase app does not exist.');
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return getFirebasePnv(mockApp);
      }).not.to.throw();
    });

    it('should return the same instance for app instance', () => {
      const fpnvFirst: Fpnv = getFirebasePnv(mockApp);
      const fpnvSecond: Fpnv = getFirebasePnv(mockApp);
      expect(fpnvFirst).to.equal(fpnvSecond);
    });

    it('should not return the same instance when different configs are provided', () => {
      const fpnvFirst: Fpnv = getFirebasePnv(mockApp);
      const fpnvSecond: Fpnv = getFirebasePnv(mockCredentialApp);
      expect(fpnvFirst).to.not.equal(fpnvSecond);
    });
  });
});
