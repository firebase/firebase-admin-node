/*!
 * @license
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

'use strict';

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as mocks from '../../resources/mocks';
import * as nock from 'nock';

import { AppCheckTokenVerifier } from '../../../src/app-check/token-verifier';
import { JwtError, JwtErrorCode, PublicKeySignatureVerifier } from '../../../src/utils/jwt';

const expect = chai.expect;

const ONE_HOUR_IN_SECONDS = 60 * 60;

describe('AppCheckTokenVerifier', () => {

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];
  let tokenVerifier: AppCheckTokenVerifier;
  let clock: sinon.SinonFakeTimers | undefined;

  before(() => {
    tokenVerifier = new AppCheckTokenVerifier(mocks.app());
  });

  after(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];

    if (clock) {
      clock.restore();
      clock = undefined;
    }
  });

  describe('verifyJWT()', () => {
    let mockedRequests: nock.Scope[] = [];
    let stubs: sinon.SinonStub[] = [];

    afterEach(() => {
      _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
      mockedRequests = [];

      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should throw given no App Check token', () => {
      expect(() => {
        (tokenVerifier as any).verifyToken();
      }).to.throw('App check token must be a non-null string');
    });

    const invalidTokens = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
    invalidTokens.forEach((invalidToken) => {
      it('should throw given a non-string App Check token: ' + JSON.stringify(invalidToken), () => {
        expect(() => {
          tokenVerifier.verifyToken(invalidToken as any);
        }).to.throw('App check token must be a non-null string');
      });
    });

    it('should throw given an empty string App Check token', () => {
      return tokenVerifier.verifyToken('')
        .should.eventually.be.rejectedWith('Decoding App Check token failed');
    });

    it('should be rejected given an invalid App Check token', () => {
      return tokenVerifier.verifyToken('invalid-token')
        .should.eventually.be.rejectedWith('Decoding App Check token failed');
    });

    it('should throw if the token verifier was initialized with no "project_id"', () => {
      const tokenVerifierWithNoProjectId = new AppCheckTokenVerifier(mocks.mockCredentialApp());
      const expected = 'Must initialize app with a cert credential or set your Firebase project ID as ' +
        'the GOOGLE_CLOUD_PROJECT environment variable to verify an App Check token.';
      return tokenVerifierWithNoProjectId.verifyToken('app.check.token')
        .should.eventually.be.rejectedWith(expected);
    });

    it('should be rejected given an App Check token with an incorrect algorithm', () => {
      const mockAppCheckToken = mocks.generateAppCheckToken({
        algorithm: 'HS256',
      });
      return tokenVerifier.verifyToken(mockAppCheckToken)
        .should.eventually.be.rejectedWith('The provided App Check token has incorrect algorithm');
    });

    const invalidAudiences = [
      'incorrectAudience', [], [mocks.projectNumber, mocks.projectId],
      ['projects/' + mocks.projectNumber, mocks.projectId]
    ];
    invalidAudiences.forEach((invalidAudience) => {
      it('should be rejected given an App Check token with an incorrect audience:' +
        JSON.stringify(invalidAudience), () => {
        const mockAppCheckToken = mocks.generateAppCheckToken({
          audience: invalidAudience,
        });

        return tokenVerifier.verifyToken(mockAppCheckToken)
          .should.eventually.be.rejectedWith('The provided App Check token has incorrect "aud" (audience) claim');
      });
    });

    it('should be rejected given an App Check token with an incorrect issuer', () => {
      const mockAppCheckToken = mocks.generateAppCheckToken({
        issuer: 'incorrectIssuer',
      });

      return tokenVerifier.verifyToken(mockAppCheckToken)
        .should.eventually.be.rejectedWith('The provided App Check token has incorrect "iss" (issuer) claim');
    });

    it('should be rejected given an App Check token with an empty subject', () => {
      const mockAppCheckToken = mocks.generateAppCheckToken({
        subject: '',
      });

      return tokenVerifier.verifyToken(mockAppCheckToken)
        .should.eventually.be.rejectedWith('The provided App Check token has an empty string "sub" (subject) claim');
    });

    it('should be rejected when the verifier throws no maching kid error', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .rejects(new JwtError(JwtErrorCode.NO_MATCHING_KID, 'No matching key ID.'));
      stubs.push(verifierStub);

      const mockAppCheckToken = mocks.generateAppCheckToken({
        header: {
          kid: 'wrongkid',
        },
      });

      return tokenVerifier.verifyToken(mockAppCheckToken)
        .should.eventually.be.rejectedWith('The provided App Check token has "kid" claim which does not ' +
            'correspond to a known public key');
    });

    it('should be rejected when the verifier throws expired token error', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .rejects(new JwtError(JwtErrorCode.TOKEN_EXPIRED, 'Expired token.'));
      stubs.push(verifierStub);

      const mockAppCheckToken = mocks.generateAppCheckToken();

      return tokenVerifier.verifyToken(mockAppCheckToken)
        .should.eventually.be.rejectedWith('The provided App Check token has expired. ' +
          'Get a fresh App Check token from your client app and try again.')
        .and.have.property('code', 'app-check/app-check-token-expired');
    });

    it('should be rejected when the verifier throws invalid signature error.', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .rejects(new JwtError(JwtErrorCode.INVALID_SIGNATURE, 'invalid signature.'));
      stubs.push(verifierStub);

      const mockAppCheckToken = mocks.generateAppCheckToken();

      return tokenVerifier.verifyToken(mockAppCheckToken)
        .should.eventually.be.rejectedWith('The provided App Check token has invalid signature');
    });

    it('should be rejected when the verifier throws key fetch error.', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .rejects(new JwtError(JwtErrorCode.KEY_FETCH_ERROR, 'Error fetching Json Web Keys.'));
      stubs.push(verifierStub);

      const mockAppCheckToken = mocks.generateAppCheckToken();

      return tokenVerifier.verifyToken(mockAppCheckToken)
        .should.eventually.be.rejectedWith('Error fetching Json Web Keys.');
    });

    it('should be fulfilled when the kid is not present in the header (should try all the keys)', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .resolves();
      stubs.push(verifierStub);

      clock = sinon.useFakeTimers(1000);

      const mockAppCheckToken = mocks.generateAppCheckToken({
        header: {},
      });

      return tokenVerifier.verifyToken(mockAppCheckToken)
        .should.eventually.be.fulfilled.and.deep.equal({
          one: 'uno',
          two: 'dos',
          iat: 1,
          exp: ONE_HOUR_IN_SECONDS + 1,
          aud: ['projects/' + mocks.projectNumber, 'projects/' + mocks.projectId],
          iss: 'https://firebaseappcheck.googleapis.com/' + mocks.projectNumber,
          sub: mocks.appId,
          // eslint-disable-next-line @typescript-eslint/camelcase
          app_id: mocks.appId,
        });
    });

    it('should be fulfilled with decoded claims given a valid App Check token', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .resolves();
      stubs.push(verifierStub);

      clock = sinon.useFakeTimers(1000);

      const mockAppCheckToken = mocks.generateAppCheckToken();

      return tokenVerifier.verifyToken(mockAppCheckToken)
        .should.eventually.be.fulfilled.and.deep.equal({
          one: 'uno',
          two: 'dos',
          iat: 1,
          exp: ONE_HOUR_IN_SECONDS + 1,
          aud: ['projects/' + mocks.projectNumber, 'projects/' + mocks.projectId],
          iss: 'https://firebaseappcheck.googleapis.com/' + mocks.projectNumber,
          sub: mocks.appId,
          // eslint-disable-next-line @typescript-eslint/camelcase
          app_id: mocks.appId,
        });
    });

  });
});
