/*!
 * @license
 * Copyright 2017 Google LLC
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

import {
  FirebaseError, FirebaseAuthError, FirebaseMessagingError, MessagingClientErrorCode,
} from '../../../src/utils/error';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('FirebaseError', () => {
  const code = 'code';
  const message = 'message';
  const errorInfo = { code, message };
  it('should initialize successfully with error info specified', () => {
    const error = new FirebaseError(errorInfo);
    expect(error.code).to.be.equal(code);
    expect(error.message).to.be.equal(message);
    expect(error instanceof FirebaseError).to.be.true;
    expect(error instanceof Error).to.be.true;
  });

  it('should initialize correctly with httpResponse and cause', () => {
    const errorInfoWithExtras = {
      code,
      message,
      httpResponse: { status: 500, headers: {} },
      cause: new Error('low-level error')
    };
    const error = new FirebaseError(errorInfoWithExtras);
    expect(error.code).to.be.equal(code);
    expect(error.message).to.be.equal(message);
    expect(error.httpResponse?.status).to.be.equal(500);
    expect(error.cause?.message).to.be.equal('low-level error');
  });


  it('should throw if no error info is specified', () => {
    expect(() => {
      const firebaseErrorAny: any = FirebaseError;
      return new firebaseErrorAny();
    }).to.throw();
  });

  it('toJSON() should resolve with the expected object', () => {
    const error = new FirebaseError(errorInfo);
    expect(error.toJSON()).to.deep.equal({ code, message });
  });

  it('toJSON() should not leak extra properties from RequestResponse', () => {
    const mockHttpResponse = {
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { foo: 'bar' },
      text: '{"foo":"bar"}', // Extra property from RequestResponse
      parsedData: { foo: 'bar' }, // Simulated private field
      parseError: undefined, // Simulated private field
      isJson: () => true, // Method from RequestResponse
    };
    const error = new FirebaseError({
      code: 'code',
      message: 'message',
      httpResponse: mockHttpResponse as any
    });
    
    const json = error.toJSON() as any;
    expect(json.httpResponse).to.deep.equal({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { foo: 'bar' }
    });
    expect(json.httpResponse.text).to.be.undefined;
    expect(json.httpResponse.parsedData).to.be.undefined;
    expect(json.httpResponse.isJson).to.be.undefined;
  });
});

describe('FirebaseAuthError', () => {
  it('should initialize successfully with no message specified', () => {
    const errorCodeInfo = {
      code: 'code',
      message: 'message',
    };
    const error = new FirebaseAuthError(errorCodeInfo);
    expect(error.code).to.be.equal('auth/code');
    expect(error.message).to.be.equal('message');
    expect(error instanceof FirebaseAuthError).to.be.true;
    expect(error instanceof FirebaseError).to.be.true;
  });

  it('should initialize successfully with a message specified', () => {
    const errorCodeInfo = {
      code: 'code',
      message: 'message',
    };
    const error = new FirebaseAuthError(errorCodeInfo, 'overrideMessage');
    expect(error.code).to.be.equal('auth/code');
    expect(error.message).to.be.equal('overrideMessage');
  });

  describe('fromServerError()', () => {
    describe('without message specified', () => {
      it('should initialize an error from an expected server code', () => {
        const error = FirebaseAuthError.fromServerError('USER_NOT_FOUND');
        expect(error.code).to.be.equal('auth/user-not-found');
        expect(error.message).to.be.equal(
          'There is no user record corresponding to the provided identifier.');
      });

      it('should initialize an error from an unexpected server code', () => {
        const error = FirebaseAuthError.fromServerError('UNEXPECTED_ERROR');
        expect(error.code).to.be.equal('auth/internal-error');
        expect(error.message).to.be.equal('An internal error has occurred.');
      });

      it('should initialize an error from an expected server with server detailed message', () => {
        // Error code should be separated from detailed message at first colon.
        const error = FirebaseAuthError.fromServerError('CONFIGURATION_NOT_FOUND : more details key: value');
        expect(error.code).to.be.equal('auth/configuration-not-found');
        expect(error.message).to.be.equal('more details key: value');
      });
    });

    describe('with message specified', () => {
      it('should initialize an error from an expected server code', () => {
        const error = FirebaseAuthError.fromServerError(
          'USER_NOT_FOUND', 'Invalid uid');
        expect(error.code).to.be.equal('auth/user-not-found');
        expect(error.message).to.be.equal('Invalid uid');
      });

      it('should initialize an error from an unexpected server code', () => {
        const error = FirebaseAuthError.fromServerError(
          'UNEXPECTED_ERROR', 'An unexpected error occurred.');
        expect(error.code).to.be.equal('auth/internal-error');
        expect(error.message).to.be.equal('An unexpected error occurred.');
      });

      it('should initialize an error from an expected server with server detailed message', () => {
        const error = FirebaseAuthError.fromServerError(
          'CONFIGURATION_NOT_FOUND : more details',
          'Ignored message');
        expect(error.code).to.be.equal('auth/configuration-not-found');
        expect(error.message).to.be.equal('more details');
      });
    });

    describe('with httpResponse specified', () => {
      const mockHttpResponse = {
        status: 400,
        headers: {},
        data: {
          error: {
            code: 'UNEXPECTED_ERROR',
            message: 'An unexpected error occurred.',
          },
        },
        isJson: () => true,
      };
      const mockError: any = { response: mockHttpResponse };

      it('should include httpResponse from an expected server code', () => {
        const error = FirebaseAuthError.fromServerError(
          'USER_NOT_FOUND', 'Invalid uid', mockError);
        expect(error.code).to.be.equal('auth/user-not-found');
        expect(error.message).to.be.equal('Invalid uid');
        expect(error.httpResponse).to.deep.equal({
          status: mockHttpResponse.status,
          headers: mockHttpResponse.headers,
          data: mockHttpResponse.data,
        });
      });

      it('should include httpResponse from an unexpected server code', () => {
        const error = FirebaseAuthError.fromServerError(
          'UNEXPECTED_ERROR', 'An unexpected error occurred.', mockError);
        expect(error.code).to.be.equal('auth/internal-error');
        expect(error.message).to.be.equal('An unexpected error occurred.');
        expect(error.httpResponse).to.deep.equal({
          status: mockHttpResponse.status,
          headers: mockHttpResponse.headers,
          data: mockHttpResponse.data,
        });
      });

      it('should include httpResponse from an expected server with server detailed message', () => {
        const error = FirebaseAuthError.fromServerError(
          'CONFIGURATION_NOT_FOUND : more details',
          'Ignored message', mockError);
        expect(error.code).to.be.equal('auth/configuration-not-found');
        expect(error.message).to.be.equal('more details');
        expect(error.httpResponse).to.deep.equal({
          status: mockHttpResponse.status,
          headers: mockHttpResponse.headers,
          data: mockHttpResponse.data,
        });
      });

      it('should not leak extra properties from RequestResponse in toJSON() via fromServerError', () => {
        const mockRequestResponse = {
          status: 400,
          headers: {},
          data: {
            error: {
              code: 'UNEXPECTED_ERROR',
              message: 'An unexpected error occurred.',
            },
          },
          text: '{"error":...}',
          isJson: () => true,
        };
        const mockError: any = { response: mockRequestResponse };
        const error = FirebaseAuthError.fromServerError(
          'USER_NOT_FOUND', 'Invalid uid', mockError);
        
        const json = error.toJSON() as any;
        expect(json.httpResponse).to.deep.equal({
          status: 400,
          headers: {},
          data: mockRequestResponse.data
        });
        expect(json.httpResponse.text).to.be.undefined;
        expect(json.httpResponse.isJson).to.be.undefined;
      });
    });
  });
});

describe('FirebaseMessagingError', () => {
  it('should initialize successfully with no message specified', () => {
    const errorCodeInfo = {
      code: 'code',
      message: 'message',
    };
    const error = new FirebaseMessagingError(errorCodeInfo);
    expect(error.code).to.be.equal('messaging/code');
    expect(error.message).to.be.equal('message');
    expect(error instanceof FirebaseMessagingError).to.be.true;
    expect(error instanceof FirebaseError).to.be.true;
  });

  it('should initialize successfully with a message specified', () => {
    const errorCodeInfo = {
      code: 'code',
      message: 'message',
    };
    const error = new FirebaseMessagingError(errorCodeInfo, 'Message override.');
    expect(error.code).to.be.equal('messaging/code');
    expect(error.message).to.be.equal('Message override.');
  });

  describe('fromServerError()', () => {
    describe('without message specified', () => {
      it('should initialize an error from an expected server code', () => {
        const error = FirebaseMessagingError.fromServerError('InvalidRegistration');
        const expectedError = MessagingClientErrorCode.INVALID_REGISTRATION_TOKEN;
        expect(error.code).to.equal('messaging/' + expectedError.code);
        expect(error.message).to.equal(expectedError.message);
      });

      it('should initialize an error from an unexpected server code', () => {
        const error = FirebaseMessagingError.fromServerError('UNEXPECTED_ERROR');
        const expectedError = MessagingClientErrorCode.UNKNOWN_ERROR;
        expect(error.code).to.equal('messaging/' + expectedError.code);
        expect(error.message).to.equal(expectedError.message);
      });
    });

    describe('with message specified', () => {
      it('should initialize an error from an expected server code', () => {
        const error = FirebaseMessagingError.fromServerError('InvalidRegistration', 'Message override.');
        const expectedError = MessagingClientErrorCode.INVALID_REGISTRATION_TOKEN;
        expect(error.code).to.equal('messaging/' + expectedError.code);
        expect(error.message).to.equal('Message override.');
      });

      it('should initialize an error from an unexpected server code', () => {
        const error = FirebaseMessagingError.fromServerError('UNEXPECTED_ERROR', 'Message override.');
        const expectedError = MessagingClientErrorCode.UNKNOWN_ERROR;
        expect(error.code).to.equal('messaging/' + expectedError.code);
        expect(error.message).to.equal('Message override.');
      });
    });

    describe('with server error specified', () => {
      const mockHttpResponse = {
        status: 400,
        headers: {},
        data: {
          error: {
            code: 'UNEXPECTED_ERROR',
            message: 'Message override.',
          },
        },
        isJson: () => true,
      };
      const mockError: any = { response: mockHttpResponse };

      it('should not include raw server response from an expected server code', () => {
        const error = FirebaseMessagingError.fromServerError(
          'InvalidRegistration', /* message */ undefined, mockError,
        );
        const expectedError = MessagingClientErrorCode.INVALID_REGISTRATION_TOKEN;
        expect(error.code).to.equal('messaging/' + expectedError.code);
        expect(error.message).to.equal(expectedError.message);
      });

      it('should include raw server response from an unexpected server code', () => {
        const error = FirebaseMessagingError.fromServerError(
          'UNEXPECTED_ERROR', /* message */ undefined, mockError,
        );
        const expectedError = MessagingClientErrorCode.UNKNOWN_ERROR;
        expect(error.code).to.equal('messaging/' + expectedError.code);
        expect(error.message).to.be.equal(
          `${ expectedError.message } Raw server response: "${ JSON.stringify(mockHttpResponse.data) }"`,
        );
      });
    });
  });
});
