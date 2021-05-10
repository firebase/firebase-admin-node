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

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from '../../resources/mocks';
import { ServiceAccountSigner, IAMSigner, CryptoSignerError } from '../../../src/utils/crypto-signer';

import { ServiceAccountCredential } from '../../../src/credential/credential-internal';
import { AuthorizedHttpClient, HttpClient } from '../../../src/utils/api-request';
import { FirebaseApp } from '../../../src/firebase-app';
import * as utils from '../utils';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('CryptoSigner', () => {
  describe('ServiceAccountSigner', () => {
    it('should throw given no arguments', () => {
      expect(() => {
        const anyServiceAccountSigner: any = ServiceAccountSigner;
        return new anyServiceAccountSigner();
      }).to.throw('Must provide a service account credential to initialize ServiceAccountSigner');
    });

    it('should not throw given a valid certificate', () => {
      expect(() => {
        return new ServiceAccountSigner(new ServiceAccountCredential(mocks.certificateObject));
      }).not.to.throw();
    });

    it('should sign using the private_key in the certificate', () => {
      const payload = Buffer.from('test');
      const cert = new ServiceAccountCredential(mocks.certificateObject);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crypto = require('crypto');
      const rsa = crypto.createSign('RSA-SHA256');
      rsa.update(payload);
      const result = rsa.sign(cert.privateKey, 'base64');

      const signer = new ServiceAccountSigner(cert);
      return signer.sign(payload).then((signature) => {
        expect(signature.toString('base64')).to.equal(result);
      });
    });

    it('should return the client_email from the certificate', () => {
      const cert = new ServiceAccountCredential(mocks.certificateObject);
      const signer = new ServiceAccountSigner(cert);
      return signer.getAccountId().should.eventually.equal(cert.clientEmail);
    });
  });

  describe('IAMSigner', () => {
    let mockApp: FirebaseApp;
    let getTokenStub: sinon.SinonStub;
    const mockAccessToken: string = utils.generateRandomAccessToken();

    beforeEach(() => {
      mockApp = mocks.app();
      getTokenStub = utils.stubGetAccessToken(mockAccessToken, mockApp);
      return mockApp.INTERNAL.getToken();
    });

    afterEach(() => {
      getTokenStub.restore();
      return mockApp.delete();
    });

    it('should throw given no arguments', () => {
      expect(() => {
        const anyIAMSigner: any = IAMSigner;
        return new anyIAMSigner();
      }).to.throw('Must provide a HTTP client to initialize IAMSigner');
    });

    describe('explicit service account ID', () => {
      const response = { signedBlob: Buffer.from('testsignature').toString('base64') };
      const input = Buffer.from('input');
      const signRequest = {
        method: 'POST',
        url: 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/test-service-account:signBlob',
        headers: { Authorization: `Bearer ${mockAccessToken}` },
        data: { payload: input.toString('base64') },
      };
      let stub: sinon.SinonStub;

      afterEach(() => {
        stub.restore();
      });

      it('should sign using the IAM service', () => {
        const expectedResult = utils.responseFrom(response);
        stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
        const requestHandler = new AuthorizedHttpClient(mockApp);
        const signer = new IAMSigner(requestHandler, 'test-service-account');
        return signer.sign(input).then((signature) => {
          expect(signature.toString('base64')).to.equal(response.signedBlob);
          expect(stub).to.have.been.calledOnce.and.calledWith(signRequest);
        });
      });

      it('should fail if the IAM service responds with an error', () => {
        const expectedResult = utils.errorFrom({
          error: {
            status: 'PROJECT_NOT_FOUND',
            message: 'test reason',
          },
        });
        stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedResult);
        const requestHandler = new AuthorizedHttpClient(mockApp);
        const signer = new IAMSigner(requestHandler, 'test-service-account');
        return signer.sign(input).catch((err) => {
          expect(err).to.be.instanceOf(CryptoSignerError);
          expect(err.message).to.equal('Server responded with status 500.');
          expect(err.cause).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(signRequest);
        });
      });

      it('should return the explicitly specified service account', () => {
        const signer = new IAMSigner(new AuthorizedHttpClient(mockApp), 'test-service-account');
        return signer.getAccountId().should.eventually.equal('test-service-account');
      });
    });

    describe('auto discovered service account', () => {
      const input = Buffer.from('input');
      const response = { signedBlob: Buffer.from('testsignature').toString('base64') };
      const metadataRequest = {
        method: 'GET',
        url: 'http://metadata/computeMetadata/v1/instance/service-accounts/default/email',
        headers: { 'Metadata-Flavor': 'Google' },
      };
      const signRequest = {
        method: 'POST',
        url: 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/discovered-service-account:signBlob',
        headers: { Authorization: `Bearer ${mockAccessToken}` },
        data: { payload: input.toString('base64') },
      };
      let stub: sinon.SinonStub;

      afterEach(() => {
        stub.restore();
      });

      it('should sign using the IAM service', () => {
        stub = sinon.stub(HttpClient.prototype, 'send');
        stub.onCall(0).resolves(utils.responseFrom('discovered-service-account'));
        stub.onCall(1).resolves(utils.responseFrom(response));
        const requestHandler = new AuthorizedHttpClient(mockApp);
        const signer = new IAMSigner(requestHandler);
        return signer.sign(input).then((signature) => {
          expect(signature.toString('base64')).to.equal(response.signedBlob);
          expect(stub).to.have.been.calledTwice;
          expect(stub.getCall(0).args[0]).to.deep.equal(metadataRequest);
          expect(stub.getCall(1).args[0]).to.deep.equal(signRequest);
        });
      });

      it('should fail if the IAM service responds with an error', () => {
        const expectedResult = utils.errorFrom({
          error: {
            status: 'PROJECT_NOT_FOUND',
            message: 'test reason',
          },
        });
        stub = sinon.stub(HttpClient.prototype, 'send');
        stub.onCall(0).resolves(utils.responseFrom('discovered-service-account'));
        stub.onCall(1).rejects(expectedResult);
        const requestHandler = new AuthorizedHttpClient(mockApp);
        const signer = new IAMSigner(requestHandler);
        return signer.sign(input).catch((err) => {
          expect(err).to.be.instanceOf(CryptoSignerError);
          expect(err.message).to.equal('Server responded with status 500.');
          expect(err.cause).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledTwice;
          expect(stub.getCall(0).args[0]).to.deep.equal(metadataRequest);
          expect(stub.getCall(1).args[0]).to.deep.equal(signRequest);
        });
      });

      it('should return the discovered service account', () => {
        stub = sinon.stub(HttpClient.prototype, 'send');
        stub.onCall(0).resolves(utils.responseFrom('discovered-service-account'));
        const signer = new IAMSigner(new AuthorizedHttpClient(mockApp));
        return signer.getAccountId().should.eventually.equal('discovered-service-account');
      });

      it('should return the expected error when failed to contact the Metadata server', () => {
        stub = sinon.stub(HttpClient.prototype, 'send');
        stub.onCall(0).rejects(utils.errorFrom('test error'));
        const signer = new IAMSigner(new AuthorizedHttpClient(mockApp));
        const expected = 'Failed to determine service account. Make sure to initialize the SDK with ' +
          'a service account credential. Alternatively specify a service account with ' +
          'iam.serviceAccounts.signBlob permission.';
        return signer.getAccountId().should.eventually.be.rejectedWith(expected);
      });
    });
  });
});
