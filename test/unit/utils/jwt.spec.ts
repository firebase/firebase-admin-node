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

'use strict';

// Use untyped import syntax for Node built-ins
import https = require('https');

import * as _ from 'lodash';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';

import * as mocks from '../../resources/mocks';
import {
  ALGORITHM_RS256, DecodedToken, decodeJwt, EmulatorSignatureVerifier, JwksFetcher,
  JwtErrorCode, PublicKeySignatureVerifier, UrlKeyFetcher, verifyJwtSignature
} from '../../../src/utils/jwt';

const expect = chai.expect;

const ONE_HOUR_IN_SECONDS = 60 * 60;
const SIX_HOURS_IN_SECONDS = ONE_HOUR_IN_SECONDS * 6;
const publicCertPath = '/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const jwksPath = '/v1alpha/jwks';

/**
 * Returns a mocked out success response from the URL containing the public keys for the Google certs.
 *
 * @param {string=} path URL path to which the mock request should be made. If not specified, defaults
 *   to the URL path of ID token public key certificates.
 * @return {Object} A nock response object.
 */
function mockFetchPublicKeys(path: string = publicCertPath): nock.Scope {
  const mockedResponse: { [key: string]: string } = {};
  mockedResponse[mocks.certificateObject.private_key_id] = mocks.keyPairs[0].public;
  return nock('https://www.googleapis.com')
    .get(path)
    .reply(200, mockedResponse, {
      'cache-control': 'public, max-age=1, must-revalidate, no-transform',
    });
}

/**
 * Returns a mocked out error response from the URL containing the public keys for the Google certs.
 * The status code is 200 but the response itself will contain an 'error' key.
 *
 * @return {Object} A nock response object.
 */

function mockFetchPublicKeysWithErrorResponse(): nock.Scope {
  return nock('https://www.googleapis.com')
    .get('/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')
    .reply(200, {
      error: 'message',
      error_description: 'description', // eslint-disable-line @typescript-eslint/camelcase
    });
}

/**
 * Returns a mocked out failed response from the URL containing the public keys for the Google certs.
 * The status code is non-200 and the response itself will fail.
 *
 * @return {Object} A nock response object.
 */

function mockFailedFetchPublicKeys(): nock.Scope {
  return nock('https://www.googleapis.com')
    .get('/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')
    .replyWithError('message');
}

/**
 * Returns a mocked out success JWKS response.
 *
 * @return {Object} A nock response object.
 */
function mockFetchJsonWebKeys(path: string = jwksPath): nock.Scope {
  return nock('https://firebaseappcheck.googleapis.com')
    .get(path)
    .reply(200, mocks.jwksResponse);
}

/**
 * Returns a mocked out error response for JWKS.
 * The status code is 200 but the response itself will contain an 'error' key.
 *
 * @return {Object} A nock response object.
 */
function mockFetchJsonWebKeysWithErrorResponse(): nock.Scope {
  return nock('https://firebaseappcheck.googleapis.com')
    .get(jwksPath)
    .reply(200, {
      error: 'message',
      error_description: 'description', // eslint-disable-line @typescript-eslint/camelcase
    });
}

/**
 * Returns a mocked out failed JSON Web Keys response.
 * The status code is non-200 and the response itself will fail.
 *
 * @return {Object} A nock response object.
 */
function mockFailedFetchJsonWebKeys(): nock.Scope {
  return nock('https://firebaseappcheck.googleapis.com')
    .get(jwksPath)
    .replyWithError('message');
}

const TOKEN_PAYLOAD = {
  one: 'uno',
  two: 'dos',
  iat: 1,
  exp: ONE_HOUR_IN_SECONDS + 1,
  aud: mocks.projectId,
  iss: 'https://securetoken.google.com/' + mocks.projectId,
  sub: mocks.uid,
};

const DECODED_SIGNED_TOKEN: DecodedToken = {
  header: {
    alg: 'RS256',
    kid: 'aaaaaaaaaabbbbbbbbbbccccccccccdddddddddd',
    typ: 'JWT',
  },
  payload: TOKEN_PAYLOAD
};

const DECODED_UNSIGNED_TOKEN: DecodedToken = {
  header: {
    alg: 'none',
    typ: 'JWT',
  },
  payload: TOKEN_PAYLOAD
};

const VALID_PUBLIC_KEYS_RESPONSE: { [key: string]: string } = {};
VALID_PUBLIC_KEYS_RESPONSE[mocks.certificateObject.private_key_id] = mocks.keyPairs[0].public;

describe('decodeJwt', () => {
  let clock: sinon.SinonFakeTimers | undefined;

  afterEach(() => {
    if (clock) {
      clock.restore();
      clock = undefined;
    }
  });

  it('should reject given no token', () => {
    return (decodeJwt as any)()
      .should.eventually.be.rejectedWith('The provided token must be a string.');
  });

  const invalidIdTokens = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
  invalidIdTokens.forEach((invalidIdToken) => {
    it('should reject given a non-string token: ' + JSON.stringify(invalidIdToken), () => {
      return decodeJwt(invalidIdToken as any)
        .should.eventually.be.rejectedWith('The provided token must be a string.');
    });
  });

  it('should reject given an empty string token', () => {
    return decodeJwt('')
      .should.eventually.be.rejectedWith('Decoding token failed.');
  });

  it('should reject given an invalid token', () => {
    return decodeJwt('invalid-token')
      .should.eventually.be.rejectedWith('Decoding token failed.');
  });

  it('should be fulfilled with decoded claims given a valid signed token', () => {
    clock = sinon.useFakeTimers(1000);

    const mockIdToken = mocks.generateIdToken();

    return decodeJwt(mockIdToken)
      .should.eventually.be.fulfilled.and.deep.equal(DECODED_SIGNED_TOKEN);
  });

  it('should be fulfilled with decoded claims given a valid unsigned token', () => {
    clock = sinon.useFakeTimers(1000);

    const mockIdToken = mocks.generateIdToken({
      algorithm: 'none',
      header: {}
    });

    return decodeJwt(mockIdToken)
      .should.eventually.be.fulfilled.and.deep.equal(DECODED_UNSIGNED_TOKEN);
  });
});


describe('verifyJwtSignature', () => {
  let clock: sinon.SinonFakeTimers | undefined;

  afterEach(() => {
    if (clock) {
      clock.restore();
      clock = undefined;
    }
  });

  it('should throw given no token', () => {
    return (verifyJwtSignature as any)()
      .should.eventually.be.rejectedWith('The provided token must be a string.');
  });

  const invalidIdTokens = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
  invalidIdTokens.forEach((invalidIdToken) => {
    it('should reject given a non-string token: ' + JSON.stringify(invalidIdToken), () => {
      return verifyJwtSignature(invalidIdToken as any, mocks.keyPairs[0].public)
        .should.eventually.be.rejectedWith('The provided token must be a string.');
    });
  });

  it('should reject given an empty string token', () => {
    return verifyJwtSignature('', mocks.keyPairs[0].public)
      .should.eventually.be.rejectedWith('jwt must be provided');
  });

  it('should be fulfilled given a valid signed token and public key', () => {
    const mockIdToken = mocks.generateIdToken();

    return verifyJwtSignature(mockIdToken, mocks.keyPairs[0].public,
      { algorithms: [ALGORITHM_RS256] })
      .should.eventually.be.fulfilled;
  });

  it('should be fulfilled given a valid unsigned (emulator) token and no public key', () => {
    const mockIdToken = mocks.generateIdToken({
      algorithm: 'none',
      header: {}
    });

    return verifyJwtSignature(mockIdToken, '')
      .should.eventually.be.fulfilled;
  });

  it('should be fulfilled given a valid signed token and a function to provide public keys', () => {
    const mockIdToken = mocks.generateIdToken();
    const getKeyCallback = (_: any, callback: any): void => callback(null, mocks.keyPairs[0].public);

    return verifyJwtSignature(mockIdToken, getKeyCallback,
      { algorithms: [ALGORITHM_RS256] })
      .should.eventually.be.fulfilled;
  });

  it('should be rejected when the given algorithm does not match the token', () => {
    const mockIdToken = mocks.generateIdToken();

    return verifyJwtSignature(mockIdToken, mocks.keyPairs[0].public,
      { algorithms: ['RS384'] })
      .should.eventually.be.rejectedWith('invalid algorithm')
      .with.property('code', JwtErrorCode.INVALID_SIGNATURE);
  });

  it('should be rejected given an expired token', () => {
    clock = sinon.useFakeTimers(1000);
    const mockIdToken = mocks.generateIdToken();
    clock.tick((ONE_HOUR_IN_SECONDS * 1000) - 1);

    // token should still be valid
    return verifyJwtSignature(mockIdToken, mocks.keyPairs[0].public,
      { algorithms: [ALGORITHM_RS256] })
      .then(() => {
        clock!.tick(1);

        // token should now be invalid
        return verifyJwtSignature(mockIdToken, mocks.keyPairs[0].public,
          { algorithms: [ALGORITHM_RS256] })
          .should.eventually.be.rejectedWith(
            'The provided token has expired. Get a fresh token from your client app and try again.'
          )
          .with.property('code', JwtErrorCode.TOKEN_EXPIRED);
      });
  });

  it('should be rejected with correct public key fetch error.', () => {
    const mockIdToken = mocks.generateIdToken();
    const getKeyCallback = (_: any, callback: any): void =>
      callback(new Error('key fetch failed.'));

    return verifyJwtSignature(mockIdToken, getKeyCallback,
      { algorithms: [ALGORITHM_RS256] })
      .should.eventually.be.rejectedWith('key fetch failed.')
      .with.property('code', JwtErrorCode.KEY_FETCH_ERROR);
  });

  it('should be rejected with correct no matching key id found error.', () => {
    const mockIdToken = mocks.generateIdToken();
    const getKeyCallback = (_: any, callback: any): void =>
      callback(new Error('no-matching-kid-error'));

    return verifyJwtSignature(mockIdToken, getKeyCallback,
      { algorithms: [ALGORITHM_RS256] })
      .should.eventually.be.rejectedWith('no-matching-kid-error')
      .with.property('code', JwtErrorCode.NO_MATCHING_KID);
  });

  it('should be rejected given a public key that does not match the token.', () => {
    const mockIdToken = mocks.generateIdToken();

    return verifyJwtSignature(mockIdToken, mocks.keyPairs[1].public,
      { algorithms: [ALGORITHM_RS256] })
      .should.eventually.be.rejectedWith('invalid signature')
      .with.property('code', JwtErrorCode.INVALID_SIGNATURE);
  });

  it('should be rejected given an invalid JWT.', () => {
    return verifyJwtSignature('invalid-token', mocks.keyPairs[0].public)
      .should.eventually.be.rejectedWith('jwt malformed')
      .with.property('code', JwtErrorCode.INVALID_SIGNATURE);
  });
});

describe('PublicKeySignatureVerifier', () => {
  let stubs: sinon.SinonStub[] = [];
  let clock: sinon.SinonFakeTimers | undefined;
  const verifier = new PublicKeySignatureVerifier(
    new UrlKeyFetcher('https://www.example.com/publicKeys'));

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];

    if (clock) {
      clock.restore();
      clock = undefined;
    }
  });

  describe('Constructor', () => {
    it('should not throw when valid key fetcher is provided', () => {
      expect(() => {
        new PublicKeySignatureVerifier(
          new UrlKeyFetcher('https://www.example.com/publicKeys'));
      }).not.to.throw();
    });

    const invalidKeyFetchers = [null, NaN, 0, 1, true, false, [], ['a'], _.noop, '', 'a'];
    invalidKeyFetchers.forEach((invalidKeyFetcher) => {
      it('should throw given an invalid key fetcher: ' + JSON.stringify(invalidKeyFetcher), () => {
        expect(() => {
          new PublicKeySignatureVerifier(invalidKeyFetchers as any);
        }).to.throw('The provided key fetcher is not an object or null.');
      });
    });
  });

  describe('withCertificateUrl', () => {
    it('should return a PublicKeySignatureVerifier instance with a UrlKeyFetcher when a ' +
      'valid cert url is provided', () => {
      const verifier = PublicKeySignatureVerifier.withCertificateUrl('https://www.example.com/publicKeys');
      expect(verifier).to.be.an.instanceOf(PublicKeySignatureVerifier);
      expect((verifier as any).keyFetcher).to.be.an.instanceOf(UrlKeyFetcher);
    });
  });

  describe('withJwksUrl', () => {
    it('should return a PublicKeySignatureVerifier instance with a JwksFetcher when a ' +
      'valid jwks url is provided', () => {
      const verifier = PublicKeySignatureVerifier.withJwksUrl('https://www.example.com/publicKeys');
      expect(verifier).to.be.an.instanceOf(PublicKeySignatureVerifier);
      expect((verifier as any).keyFetcher).to.be.an.instanceOf(JwksFetcher);
    });
  });

  describe('verify', () => {
    it('should throw given no token', () => {
      return (verifier.verify as any)()
        .should.eventually.be.rejectedWith('The provided token must be a string.');
    });

    const invalidIdTokens = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
    invalidIdTokens.forEach((invalidIdToken) => {
      it('should reject given a non-string token: ' + JSON.stringify(invalidIdToken), () => {
        return verifier.verify(invalidIdToken as any)
          .should.eventually.be.rejectedWith('The provided token must be a string.');
      });
    });

    it('should reject given an empty string token', () => {
      return verifier.verify('')
        .should.eventually.be.rejectedWith('jwt must be provided');
    });

    it('should be fullfilled given a valid token', () => {
      const keyFetcherStub = sinon.stub(UrlKeyFetcher.prototype, 'fetchPublicKeys')
        .resolves(VALID_PUBLIC_KEYS_RESPONSE);
      stubs.push(keyFetcherStub);
      const mockIdToken = mocks.generateIdToken();

      return verifier.verify(mockIdToken).should.eventually.be.fulfilled;
    });

    it('should be fullfilled given a valid token without a kid (should check against all the keys)', () => {
      const keyFetcherStub = sinon.stub(UrlKeyFetcher.prototype, 'fetchPublicKeys')
        .resolves({ 'kid-other': 'key-other', ...VALID_PUBLIC_KEYS_RESPONSE });
      stubs.push(keyFetcherStub);
      const mockIdToken = mocks.generateIdToken({
        header: {}
      });

      return verifier.verify(mockIdToken).should.eventually.be.fulfilled;
    });

    it('should be rejected given an expired token without a kid (should check against all the keys)', () => {
      const keyFetcherStub = sinon.stub(UrlKeyFetcher.prototype, 'fetchPublicKeys')
        .resolves({ 'kid-other': 'key-other', ...VALID_PUBLIC_KEYS_RESPONSE });
      stubs.push(keyFetcherStub);
      clock = sinon.useFakeTimers(1000);
      const mockIdToken = mocks.generateIdToken({
        header: {}
      });
      clock.tick((ONE_HOUR_IN_SECONDS * 1000) - 1);

      // token should still be valid
      return verifier.verify(mockIdToken)
        .then(() => {
          clock!.tick(1);

          // token should now be invalid
          return verifier.verify(mockIdToken).should.eventually.be.rejectedWith(
            'The provided token has expired. Get a fresh token from your client app and try again.')
            .with.property('code', JwtErrorCode.TOKEN_EXPIRED);
        });
    });

    it('should be rejected given a token with an incorrect algorithm', () => {
      const keyFetcherStub = sinon.stub(UrlKeyFetcher.prototype, 'fetchPublicKeys')
        .resolves(VALID_PUBLIC_KEYS_RESPONSE);
      stubs.push(keyFetcherStub);
      const mockIdToken = mocks.generateIdToken({
        algorithm: 'HS256',
      });

      return verifier.verify(mockIdToken).should.eventually.be
        .rejectedWith('invalid algorithm')
        .with.property('code', JwtErrorCode.INVALID_SIGNATURE);
    });

    // tests to cover the private getKeyCallback function.
    it('should reject when no matching kid found', () => {
      const keyFetcherStub = sinon.stub(UrlKeyFetcher.prototype, 'fetchPublicKeys')
        .resolves({ 'not-a-matching-key': 'public-key' });
      stubs.push(keyFetcherStub);
      const mockIdToken = mocks.generateIdToken();

      return verifier.verify(mockIdToken).should.eventually.be
        .rejectedWith('no-matching-kid-error')
        .with.property('code', JwtErrorCode.NO_MATCHING_KID);
    });

    it('should reject when an error occurs while fetching the keys', () => {
      const keyFetcherStub = sinon.stub(UrlKeyFetcher.prototype, 'fetchPublicKeys')
        .rejects(new Error('Error fetching public keys.'));
      stubs.push(keyFetcherStub);
      const mockIdToken = mocks.generateIdToken();

      return verifier.verify(mockIdToken).should.eventually.be
        .rejectedWith('Error fetching public keys.')
        .with.property('code', JwtErrorCode.KEY_FETCH_ERROR);
    });
  });
});

describe('EmulatorSignatureVerifier', () => {
  const emulatorVerifier = new EmulatorSignatureVerifier();

  describe('verify', () => {
    it('should be fullfilled given a valid unsigned (emulator) token', () => {
      const mockIdToken = mocks.generateIdToken({
        algorithm: 'none',
        header: {}
      });

      return emulatorVerifier.verify(mockIdToken).should.eventually.be.fulfilled;
    });

    it('should be rejected given a valid signed (non-emulator) token', () => {
      const mockIdToken = mocks.generateIdToken();

      return emulatorVerifier.verify(mockIdToken).should.eventually.be.rejected;
    });
  });
});

describe('UrlKeyFetcher', () => {
  const agent = new https.Agent();
  let keyFetcher: UrlKeyFetcher;
  let clock: sinon.SinonFakeTimers | undefined;
  let httpsSpy: sinon.SinonSpy;

  beforeEach(() => {
    keyFetcher = new UrlKeyFetcher(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      agent);
    httpsSpy = sinon.spy(https, 'request');
  });

  afterEach(() => {
    if (clock) {
      clock.restore();
      clock = undefined;
    }
    httpsSpy.restore();
  });

  after(() => {
    nock.cleanAll();
  });

  describe('Constructor', () => {
    it('should not throw when valid key parameters are provided', () => {
      expect(() => {
        new UrlKeyFetcher('https://www.example.com/publicKeys', agent);
      }).not.to.throw();
    });

    const invalidCertURLs = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop, 'file://invalid'];
    invalidCertURLs.forEach((invalidCertUrl) => {
      it('should throw given a non-URL public cert: ' + JSON.stringify(invalidCertUrl), () => {
        expect(() => {
          new UrlKeyFetcher(invalidCertUrl as any, agent);
        }).to.throw('The provided public client certificate URL is not a valid URL.');
      });
    });
  });

  describe('fetchPublicKeys', () => {
    let mockedRequests: nock.Scope[] = [];

    afterEach(() => {
      _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
      mockedRequests = [];
    });

    it('should use the given HTTP Agent', () => {
      const agent = new https.Agent();
      const urlKeyFetcher = new UrlKeyFetcher('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', agent);
      mockedRequests.push(mockFetchPublicKeys());

      return urlKeyFetcher.fetchPublicKeys()
        .then(() => {
          expect(https.request).to.have.been.calledOnce;
          expect(httpsSpy.args[0][0].agent).to.equal(agent);
        });
    });

    it('should not fetch the public keys until the first time fetchPublicKeys() is called', () => {
      mockedRequests.push(mockFetchPublicKeys());

      const urlKeyFetcher = new UrlKeyFetcher('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', agent);
      expect(https.request).not.to.have.been.called;

      return urlKeyFetcher.fetchPublicKeys()
        .then(() => expect(https.request).to.have.been.calledOnce);
    });

    it('should not re-fetch the public keys every time fetchPublicKeys() is called', () => {
      mockedRequests.push(mockFetchPublicKeys());

      return keyFetcher.fetchPublicKeys().then(() => {
        expect(https.request).to.have.been.calledOnce;
        return keyFetcher.fetchPublicKeys();
      }).then(() => expect(https.request).to.have.been.calledOnce);
    });

    it('should refresh the public keys after the "max-age" on the request expires', () => {
      mockedRequests.push(mockFetchPublicKeys());
      mockedRequests.push(mockFetchPublicKeys());
      mockedRequests.push(mockFetchPublicKeys());

      clock = sinon.useFakeTimers(1000);

      return keyFetcher.fetchPublicKeys().then(() => {
        expect(https.request).to.have.been.calledOnce;
        clock!.tick(999);
        return keyFetcher.fetchPublicKeys();
      }).then(() => {
        expect(https.request).to.have.been.calledOnce;
        clock!.tick(1);
        return keyFetcher.fetchPublicKeys();
      }).then(() => {
        // One second has passed
        expect(https.request).to.have.been.calledTwice;
        clock!.tick(999);
        return keyFetcher.fetchPublicKeys();
      }).then(() => {
        expect(https.request).to.have.been.calledTwice;
        clock!.tick(1);
        return keyFetcher.fetchPublicKeys();
      }).then(() => {
        // Two seconds have passed
        expect(https.request).to.have.been.calledThrice;
      });
    });

    it('should be rejected if fetching the public keys fails', () => {
      mockedRequests.push(mockFailedFetchPublicKeys());

      return keyFetcher.fetchPublicKeys()
        .should.eventually.be.rejectedWith('message');
    });

    it('should be rejected if fetching the public keys returns a response with an error message', () => {
      mockedRequests.push(mockFetchPublicKeysWithErrorResponse());

      return keyFetcher.fetchPublicKeys()
        .should.eventually.be.rejectedWith('Error fetching public keys for Google certs: message (description)');
    });
  });
});

describe('JwksFetcher', () => {
  let keyFetcher: JwksFetcher;
  let clock: sinon.SinonFakeTimers | undefined;
  let httpsSpy: sinon.SinonSpy;

  beforeEach(() => {
    keyFetcher = new JwksFetcher(
      'https://firebaseappcheck.googleapis.com/v1alpha/jwks'
    );
    httpsSpy = sinon.spy(https, 'request');
  });

  afterEach(() => {
    if (clock) {
      clock.restore();
      clock = undefined;
    }
    httpsSpy.restore();
  });

  after(() => {
    nock.cleanAll();
  });

  describe('Constructor', () => {
    it('should not throw when valid url is provided', () => {
      expect(() => {
        new JwksFetcher('https://www.example.com/publicKeys');
      }).not.to.throw();
    });

    const invalidJwksURLs = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop, 'file://invalid'];
    invalidJwksURLs.forEach((invalidJwksURL) => {
      it('should throw given a non-URL jwks endpoint: ' + JSON.stringify(invalidJwksURL), () => {
        expect(() => {
          new JwksFetcher(invalidJwksURL as any);
        }).to.throw('The provided JWKS URL is not a valid URL.');
      });
    });
  });

  describe('fetchPublicKeys', () => {
    let mockedRequests: nock.Scope[] = [];

    afterEach(() => {
      _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
      mockedRequests = [];
    });

    it('should not fetch the public keys until the first time fetchPublicKeys() is called', () => {
      mockedRequests.push(mockFetchJsonWebKeys());

      const jwksFetcher = new JwksFetcher('https://firebaseappcheck.googleapis.com/v1alpha/jwks');
      expect(https.request).not.to.have.been.called;

      return jwksFetcher.fetchPublicKeys()
        .then((result) => {
          expect(https.request).to.have.been.calledOnce;
          expect(result).to.have.key(mocks.jwksResponse.keys[0].kid);
        });
    });

    it('should not re-fetch the public keys every time fetchPublicKeys() is called', () => {
      mockedRequests.push(mockFetchJsonWebKeys());

      return keyFetcher.fetchPublicKeys().then(() => {
        expect(https.request).to.have.been.calledOnce;
        return keyFetcher.fetchPublicKeys();
      }).then(() => expect(https.request).to.have.been.calledOnce);
    });

    it('should refresh the public keys after the previous set of keys expire', () => {
      mockedRequests.push(mockFetchJsonWebKeys());
      mockedRequests.push(mockFetchJsonWebKeys());
      mockedRequests.push(mockFetchJsonWebKeys());

      clock = sinon.useFakeTimers(1000);

      return keyFetcher.fetchPublicKeys().then(() => {
        expect(https.request).to.have.been.calledOnce;
        clock!.tick((SIX_HOURS_IN_SECONDS - 1) * 1000);
        return keyFetcher.fetchPublicKeys();
      }).then(() => {
        expect(https.request).to.have.been.calledOnce;
        clock!.tick(SIX_HOURS_IN_SECONDS * 1000); // 6 hours in milliseconds
        return keyFetcher.fetchPublicKeys();
      }).then(() => {
        // App check keys do not contain cache headers so we cache the keys for 6 hours.
        // 6 hours has passed
        expect(https.request).to.have.been.calledTwice;
        clock!.tick((SIX_HOURS_IN_SECONDS - 1) * 1000);
        return keyFetcher.fetchPublicKeys();
      }).then(() => {
        expect(https.request).to.have.been.calledTwice;
        clock!.tick(SIX_HOURS_IN_SECONDS * 1000);
        return keyFetcher.fetchPublicKeys();
      }).then(() => {
        // 12 hours have passed
        expect(https.request).to.have.been.calledThrice;
      });
    });

    it('should be rejected if fetching the public keys fails', () => {
      mockedRequests.push(mockFailedFetchJsonWebKeys());

      return keyFetcher.fetchPublicKeys()
        .should.eventually.be.rejectedWith('message');
    });

    it('should be rejected if fetching the public keys returns a response with an error message', () => {
      mockedRequests.push(mockFetchJsonWebKeysWithErrorResponse());

      return keyFetcher.fetchPublicKeys()
        .should.eventually.be.rejectedWith('Error fetching Json Web Keys');
    });
  });
});
