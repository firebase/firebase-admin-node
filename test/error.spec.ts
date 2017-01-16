'use strict';

import {expect} from 'chai';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import {
  FirebaseError, FirebaseAuthError,
} from '../src/utils/error';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('FirebaseError', () => {
  const code = 'code';
  const message = 'message';
  const errorInfo = {code, message};
  it('should initialize successfully with error info specified', () => {
    let error = new FirebaseError(errorInfo);
    expect(error.code).to.be.equal(code);
    expect(error.message).to.be.equal(message);
  });

  it('should throw if no error info is specified', () => {
    expect(() => {
      let firebaseErrorAny: any = FirebaseError;
      return new firebaseErrorAny();
    }).to.throw();
  });

  it('toJSON() should resolve with the expected object', () => {
    let error = new FirebaseError(errorInfo);
    expect(error.toJSON()).to.deep.equal({code, message});
  });
});

describe('FirebaseAuthError', () => {
  it('should initialize successfully with no message specified', () => {
    let errorCodeInfo = {
      code: 'code',
      message: 'message',
    };
    let error = new FirebaseAuthError(errorCodeInfo);
    expect(error.code).to.be.equal('auth/code');
    expect(error.message).to.be.equal('message');
  });

  it('should initialize successfully with a message specified', () => {
    let errorCodeInfo = {
      code: 'code',
     message: 'message',
    };
    let error = new FirebaseAuthError(errorCodeInfo, 'overrideMessage');
    expect(error.code).to.be.equal('auth/code');
    expect(error.message).to.be.equal('overrideMessage');
  });

  describe('fromServerError()', () => {
    describe('without message specified', () => {
      it('should initialize an error from an expected server code', () => {
        let error = FirebaseAuthError.fromServerError('USER_NOT_FOUND');
        expect(error.code).to.be.equal('auth/user-not-found');
        expect(error.message).to.be.equal(
            'There is no user record corresponding to the provided identifier.');
      });

      it('should initialize an error from an unexpected server code', () => {
        let error = FirebaseAuthError.fromServerError('UNEXPECTED_ERROR');
        expect(error.code).to.be.equal('auth/internal-error');
        expect(error.message).to.be.equal('An internal error has occurred.');
      });
    });

    describe('with message specified', () => {
      it('should initialize an error from an expected server code', () => {
        let error = FirebaseAuthError.fromServerError(
            'USER_NOT_FOUND', 'Invalid uid');
        expect(error.code).to.be.equal('auth/user-not-found');
        expect(error.message).to.be.equal('Invalid uid');
      });

      it('should initialize an error from an unexpected server code', () => {
        let error = FirebaseAuthError.fromServerError(
            'UNEXPECTED_ERROR', 'An unexpected error occurred.');
        expect(error.code).to.be.equal('auth/internal-error');
        expect(error.message).to.be.equal('An unexpected error occurred.');
      });
    });

    describe('with raw server response specified', () => {
      const mockRawServerResponse = {
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'An unexpected error occurred.',
        },
      };

      it('should not include raw server response from an expected server code', () => {
        let error = FirebaseAuthError.fromServerError(
            'USER_NOT_FOUND', 'Invalid uid', mockRawServerResponse);
        expect(error.code).to.be.equal('auth/user-not-found');
        expect(error.message).to.be.equal('Invalid uid');
      });

      it('should include raw server response from an unexpected server code', () => {
        let error = FirebaseAuthError.fromServerError(
            'UNEXPECTED_ERROR', 'An unexpected error occurred.', mockRawServerResponse);
        expect(error.code).to.be.equal('auth/internal-error');
        expect(error.message).to.be.equal(
          'An unexpected error occurred. Raw server response: ' +
          `${ JSON.stringify(mockRawServerResponse) }`
        );
      });
    });
  });
});
