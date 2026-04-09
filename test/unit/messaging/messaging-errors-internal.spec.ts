/*!
 * Copyright 2026 Google LLC
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

import { createFirebaseError } from '../../../src/messaging/messaging-errors-internal';
import { RequestResponseError, RequestResponse } from '../../../src/utils/api-request';
import { FirebaseMessagingError } from '../../../src/utils/error';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('messaging-errors-internal', () => {
  describe('createFirebaseError', () => {
    it('should create FirebaseMessagingError for JSON response with error code', () => {
      const mockResponse: Partial<RequestResponse> = {
        status: 400,
        headers: {},
        isJson: () => true,
        data: {
          error: {
            status: 'INVALID_ARGUMENT',
            message: 'Specific error message'
          }
        }
      };
      const mockError = new RequestResponseError(mockResponse as RequestResponse);
      
      const error = createFirebaseError(mockError);
      
      expect(error).to.be.instanceOf(FirebaseMessagingError);
      expect(error.code).to.equal('messaging/invalid-argument');
      expect(error.message).to.equal('Specific error message');
      expect(error.httpResponse).to.deep.equal({
        status: 400,
        headers: {},
        data: mockResponse.data
      });
    });

    it('should create FirebaseMessagingError for non-JSON response (400)', () => {
      const mockResponse: Partial<RequestResponse> = {
        status: 400,
        headers: {},
        isJson: () => false,
        text: 'Raw error text'
      };
      const mockError = new RequestResponseError(mockResponse as RequestResponse);
      
      const error = createFirebaseError(mockError);
      
      expect(error).to.be.instanceOf(FirebaseMessagingError);
      expect(error.code).to.equal('messaging/invalid-argument');
      expect(error.message).to.contain('Raw server response: "Raw error text"');
      expect(error.httpResponse).to.deep.equal({
        status: 400,
        headers: {},
        data: 'Raw error text'
      });
    });

    it('should create FirebaseMessagingError for non-JSON response (500)', () => {
      const mockResponse: Partial<RequestResponse> = {
        status: 500,
        headers: {},
        isJson: () => false,
        text: 'Internal error text'
      };
      const mockError = new RequestResponseError(mockResponse as RequestResponse);
      
      const error = createFirebaseError(mockError);
      
      expect(error).to.be.instanceOf(FirebaseMessagingError);
      expect(error.code).to.equal('messaging/internal-error');
      expect(error.message).to.contain('Raw server response: "Internal error text"');
    });

    it('should not leak extra properties from RequestResponse in toJSON()', () => {
      const mockResponse = {
        status: 400,
        headers: {},
        isJson: () => false,
        text: 'Raw error text',
        extraProp: 'should not be here'
      };
      const mockError = new RequestResponseError(mockResponse as any);
      
      const error = createFirebaseError(mockError);
      const json = error.toJSON() as any;
      
      expect(json.httpResponse).to.deep.equal({
        status: 400,
        headers: {},
        data: 'Raw error text'
      });
      expect(json.httpResponse.text).to.be.undefined;
      expect(json.httpResponse.extraProp).to.be.undefined;
    });
  });
});
