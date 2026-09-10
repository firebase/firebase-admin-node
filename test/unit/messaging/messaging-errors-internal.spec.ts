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
import { FirebaseMessagingError } from '../../../src/messaging/error';

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

    // The gateway text the backend returns for these. It describes the caller's own credential,
    // which is not what is at fault.
    const GATEWAY_MESSAGE = 'Request is missing required authentication credential. Expected ' +
      'OAuth 2 access token, login cookie or other valid authentication credential.';
    const APNS_GUIDANCE = 'The message could not be sent because the APNs certificate or auth ' +
      'key, or the web push auth key, configured for your Firebase project was invalid or ' +
      'missing. Check the APNs and web push credentials in your Firebase project settings.';

    /** Builds a JSON error response. `error` is spread in so cases can omit `message` entirely. */
    function jsonError(status: number, error: object): RequestResponseError {
      const mockResponse: Partial<RequestResponse> = {
        status,
        headers: {},
        isJson: () => true,
        data: { error }
      };
      return new RequestResponseError(mockResponse as RequestResponse);
    }

    /** An FcmError detail carrying the given code, as the v1 backend sends it. */
    function fcmDetail(errorCode: string): object[] {
      return [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode }];
    }

    // Every server code that names the provider credential outright. They must behave alike: the
    // backend picks between these aliases, and the guidance should not depend on which it sent.
    // The HTTP status varies so the behavior cannot be keyed on it.
    const providerAuthCases = [
      { name: 'THIRD_PARTY_AUTH_ERROR detail', status: 401,
        error: { status: 'UNAUTHENTICATED', details: fcmDetail('THIRD_PARTY_AUTH_ERROR') } },
      { name: 'APNS_AUTH_ERROR detail', status: 404,
        error: { status: 'INVALID_ARGUMENT', details: fcmDetail('APNS_AUTH_ERROR') } },
      { name: 'legacy InvalidApnsCredential', status: 400,
        error: { status: 'InvalidApnsCredential' } },
    ];

    providerAuthCases.forEach(({ name, status, error }) => {
      it(`should lead with the APNs guidance for ${name}`, () => {
        const err = createFirebaseError(jsonError(status, { ...error, message: GATEWAY_MESSAGE }));

        expect(err.code).to.equal('messaging/third-party-auth-error');
        // The whole message, so that weakening any part of the guidance fails here.
        expect(err.message).to.equal(`${APNS_GUIDANCE} Server message: "${GATEWAY_MESSAGE}"`);
      });

      it(`should not append an empty server message for ${name}`, () => {
        // No `message` key at all. Appending here would print `Server message: "undefined"`.
        expect(createFirebaseError(jsonError(status, error)).message).to.equal(APNS_GUIDANCE);
        // Present but empty, which the parser also treats as absent.
        expect(createFirebaseError(jsonError(status, { ...error, message: '' })).message)
          .to.equal(APNS_GUIDANCE);
      });
    });

    it('should not claim an APNs fault for UNAUTHENTICATED without an FcmError detail', () => {
      // Same client code, different cause: with no FcmError detail this is the plain gateway
      // rejection, which really can mean the SDK's own credential is bad. The server message has
      // to stand on its own here rather than being prefixed with APNs guidance.
      const err = createFirebaseError(
        jsonError(401, { status: 'UNAUTHENTICATED', message: GATEWAY_MESSAGE }));

      expect(err.code).to.equal('messaging/third-party-auth-error');
      expect(err.message).to.equal(GATEWAY_MESSAGE);
    });

    it('should still use the server message verbatim for other error codes', () => {
      // Guards the change above from widening: only THIRD_PARTY_AUTH_ERROR is special-cased.
      const mockResponse: Partial<RequestResponse> = {
        status: 404,
        headers: {},
        isJson: () => true,
        data: {
          error: {
            status: 'NOT_FOUND',
            message: 'Requested entity was not found.'
          }
        }
      };
      const mockError = new RequestResponseError(mockResponse as RequestResponse);

      const error = createFirebaseError(mockError);

      expect(error.code).to.equal('messaging/registration-token-not-registered');
      expect(error.message).to.equal('Requested entity was not found.');
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
