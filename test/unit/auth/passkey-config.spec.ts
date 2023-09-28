/*!
 * This is passkey-config.spec.ts
 */
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { PasskeyConfig, PasskeyConfigServerResponse, UpdatePasskeyConfigRequest } from '../../../src/auth/passkey-config';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('PasskeyConfig', () => {
  const validResponse: PasskeyConfigServerResponse = {
    name: 'passkey-config-1',
    rpId: 'example.com',
    expectedOrigins: ['https://example.com', 'https://sub.example.com'],
  };

  describe('buildServerRequest()', () => {
    it('should build a valid server request with valid options', () => {
      const request: UpdatePasskeyConfigRequest = {
        rpId: 'example.com',
        expectedOrigins: ['https://example.com', 'https://sub.example.com'],
      };

      const serverRequest = PasskeyConfig.buildServerRequest(request);

      serverRequest.should.deep.equal(request);
    });

    it('should throw when an unsupported top-level attribute is provided', () => {
      const request: UpdatePasskeyConfigRequest = {
        invalidProperty: 'invalid', // This is not a valid property for the request.
      } as any;
      // We expect the buildServerRequest() to throw an error.
      expect(() => PasskeyConfig.buildServerRequest(request)).to.throw(
        '"invalidProperty" is not a valid UpdatePasskeyConfigRequest parameter.'
      );
    });

    it('should throw on invalid expectedOrigins attribute', () => {
      const request: UpdatePasskeyConfigRequest = {
        expectedOrigins: 'invalidOrigin', // Invalid type, should be an array.
      } as any;
      // Expect a specific error message.
      expect(() => PasskeyConfig.buildServerRequest(request)).to.throw('"expectedOrigins" must be a valid string array.');
    });
  });

  describe('constructor()', () => {
    it('should correctly initialize the PasskeyConfig instance from a valid server response', () => {
      const passkeyConfig = new PasskeyConfig(validResponse);
      passkeyConfig.name_?.should.equal(validResponse.name);
      passkeyConfig.rpId_?.should.equal(validResponse.rpId);
      passkeyConfig.expectedOrigins_?.should.deep.equal(validResponse.expectedOrigins);
    });

    it('should set undefined for missing properties in the server response', () => {
      const serverResponse: PasskeyConfigServerResponse = {
        // rpId and expectedOrigins properties are missing here.
      };

      const passkeyConfig = new PasskeyConfig(serverResponse);

      expect(passkeyConfig.name_).to.equal(undefined);
      expect(passkeyConfig.rpId_).to.equal(undefined);
      expect(passkeyConfig.expectedOrigins_).to.equal(undefined);
    });

    it('should handle undefined properties in the server response', () => {
      const responseWithUndefinedProperties: PasskeyConfigServerResponse = {
        rpId: 'example.com',
        expectedOrigins: undefined,
      };

      const passkeyConfig = new PasskeyConfig(responseWithUndefinedProperties);

      expect(passkeyConfig.name_).to.equal(undefined);
      expect(passkeyConfig.rpId_).to.equal('example.com');
      expect(passkeyConfig.expectedOrigins_).to.equal(undefined);
    });
  });

  describe('toJSON()', () => {
    it('should return a JSON-serializable representation of the PasskeyConfig instance', () => {
      const passkeyConfig = new PasskeyConfig(validResponse);

      const expectedJSON = {
        name: validResponse.name,
        rpId: validResponse.rpId,
        expectedOrigins: validResponse.expectedOrigins,
      };

      const actualJSON = passkeyConfig.toJSON();

      actualJSON.should.deep.equal(expectedJSON);
    });

    it('should not include properties that are undefined in the instance', () => {
      const passkeyConfig = new PasskeyConfig({
        rpId: 'example.com',
      });

      const expectedJSON = {
        rpId: 'example.com',
      };

      const actualJSON = passkeyConfig.toJSON();

      actualJSON.should.deep.equal(expectedJSON);
    });
  });
});
