/*!
 * Copyright 2018 Google Inc.
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

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import { deepCopy } from '../../../src/utils/deep-copy';
import {
  OIDCConfig, SAMLConfig, SAMLConfigServerRequest,
  SAMLConfigServerResponse, OIDCConfigServerRequest,
  OIDCConfigServerResponse,
  EmailSignInConfig, MultiFactorAuthConfig, validateTestPhoneNumbers,
  MAXIMUM_TEST_PHONE_NUMBERS,
} from '../../../src/auth/auth-config';
import { auth } from '../../../src/auth/index';

import SAMLUpdateAuthProviderRequest = auth.SAMLUpdateAuthProviderRequest;
import OIDCUpdateAuthProviderRequest = auth.OIDCUpdateAuthProviderRequest;
import SAMLAuthProviderConfig = auth.SAMLAuthProviderConfig;
import OIDCAuthProviderConfig = auth.OIDCAuthProviderConfig;

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('EmailSignInConfig', () => {
  describe('constructor', () => {
    const validConfig = new EmailSignInConfig({
      allowPasswordSignup: true,
      enableEmailLinkSignin: true,
    });

    it('should throw on missing allowPasswordSignup', () => {
      expect(() => new EmailSignInConfig({
        enableEmailLinkSignin: false,
      })).to.throw('INTERNAL ASSERT FAILED: Invalid email sign-in configuration response');
    });

    it('should set readonly property "enabled" to true on allowPasswordSignup enabled', () => {
      expect(validConfig.enabled).to.be.true;
    });

    it('should set readonly property "enabled" to false on allowPasswordSignup disabled', () => {
      const passwordSignupDisabledConfig = new EmailSignInConfig({
        allowPasswordSignup: false,
        enableEmailLinkSignin: false,
      });
      expect(passwordSignupDisabledConfig.enabled).to.be.false;
    });

    it('should set readonly property "passwordRequired" to false on email link sign in enabled', () => {
      expect(validConfig.passwordRequired).to.be.false;
    });

    it('should set readonly property "passwordRequired" to true on email link sign in disabled', () => {
      const passwordSignupEnabledConfig = new EmailSignInConfig({
        allowPasswordSignup: true,
        enableEmailLinkSignin: false,
      });
      expect(passwordSignupEnabledConfig.passwordRequired).to.be.true;
    });
  });

  describe('toJSON()', () => {
    it('should return expected JSON representation', () => {
      const config = new EmailSignInConfig({
        allowPasswordSignup: true,
        enableEmailLinkSignin: true,
      });
      expect(config.toJSON()).to.deep.equal({
        enabled: true,
        passwordRequired: false,
      });
    });
  });

  describe('buildServerRequest()', () => {
    it('should return expected server request on valid input with email link sign-in', () => {
      expect(EmailSignInConfig.buildServerRequest({
        enabled: true,
        passwordRequired: false,
      })).to.deep.equal({
        allowPasswordSignup: true,
        enableEmailLinkSignin: true,
      });
    });

    it('should return expected server request on valid input without email link sign-in', () => {
      expect(EmailSignInConfig.buildServerRequest({
        enabled: true,
        passwordRequired: true,
      })).to.deep.equal({
        allowPasswordSignup: true,
        enableEmailLinkSignin: false,
      });
    });

    const invalidOptions = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
    invalidOptions.forEach((options) => {
      it('should throw on invalid EmailSignInConfig:' + JSON.stringify(options), () => {
        expect(() => {
          EmailSignInConfig.buildServerRequest(options as any);
        }).to.throw('"EmailSignInConfig" must be a non-null object.');
      });
    });

    it('should throw on EmailSignInConfig with unsupported attribute', () => {
      expect(() => {
        EmailSignInConfig.buildServerRequest({
          unsupported: true,
          enabled: true,
          passwordRequired: false,
        } as any);
      }).to.throw('"unsupported" is not a valid EmailSignInConfig parameter.');
    });

    const invalidEnabled = [null, NaN, 0, 1, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidEnabled.forEach((enabled) => {
      it('should throw on invalid EmailSignInConfig.enabled:' + JSON.stringify(enabled), () => {
        expect(() => {
          EmailSignInConfig.buildServerRequest({
            enabled,
            passwordRequired: false,
          } as any);
        }).to.throw('"EmailSignInConfig.enabled" must be a boolean.');
      });
    });

    const invalidPasswordRequired = invalidEnabled;
    invalidPasswordRequired.forEach((passwordRequired) => {
      it('should throw on invalid EmailSignInConfig.passwordRequired:' + JSON.stringify(passwordRequired), () => {
        expect(() => {
          EmailSignInConfig.buildServerRequest({
            enabled: true,
            passwordRequired,
          } as any);
        }).to.throw('"EmailSignInConfig.passwordRequired" must be a boolean.');
      });
    });
  });
});

describe('MultiFactorAuthConfig', () => {
  describe('constructor', () => {
    const validConfig = new MultiFactorAuthConfig({
      state: 'ENABLED',
      enabledProviders: ['PHONE_SMS'],
    });

    it('should throw on missing state', () => {
      expect(() => new MultiFactorAuthConfig({
        enabledProviders: ['PHONE_SMS'],
      } as any)).to.throw('INTERNAL ASSERT FAILED: Invalid multi-factor configuration response');
    });

    it('should set readonly property "state" to ENABLED on state enabled', () => {
      expect(validConfig.state).to.equals('ENABLED');
    });

    it('should set readonly property "state" to DISABLED on state disabled', () => {
      const disabledState = new MultiFactorAuthConfig({
        state: 'DISABLED',
        enabledProviders: ['PHONE_SMS'],
      });
      expect(disabledState.state).to.equals('DISABLED');
    });

    it('should set readonly property "factorIds"', () => {
      expect(validConfig.factorIds).to.deep.equal(['phone']);
    });

    it('should ignore unsupported backend types if found', () => {
      const unsupportedType = new MultiFactorAuthConfig({
        state: 'ENABLED',
        enabledProviders: ['UNSUPPORTED_TYPE', 'PHONE_SMS'],
      } as any);
      expect(unsupportedType.factorIds).to.deep.equal(['phone']);
    });

    it('should return empty factorIds array if no supported types are found', () => {
      const unsupportedType = new MultiFactorAuthConfig({
        state: 'ENABLED',
        enabledProviders: ['UNSUPPORTED_TYPE'],
      } as any);
      expect(unsupportedType.factorIds).to.deep.equal([]);
    });
  });

  describe('toJSON()', () => {
    it('should return expected JSON representation', () => {
      const config = new MultiFactorAuthConfig({
        state: 'ENABLED',
        enabledProviders: ['PHONE_SMS'],
      });
      expect(config.toJSON()).to.deep.equal({
        state: 'ENABLED',
        factorIds: ['phone'],
      });
    });
  });

  describe('buildServerRequest()', () => {
    it('should return expected server request on valid state and factorIds', () => {
      expect(MultiFactorAuthConfig.buildServerRequest({
        state: 'ENABLED',
        factorIds: ['phone'],
      })).to.deep.equal({
        state: 'ENABLED',
        enabledProviders: ['PHONE_SMS'],
      });
    });

    it('should return expected server request on valid state without factorIds', () => {
      expect(MultiFactorAuthConfig.buildServerRequest({
        state: 'DISABLED',
      })).to.deep.equal({
        state: 'DISABLED',
      });
    });

    it('should return empty enabledProviders when an empty "options.factorIds" is provided', () => {
      expect(MultiFactorAuthConfig.buildServerRequest({
        state: 'DISABLED',
        factorIds: [],
      })).to.deep.equal({
        state: 'DISABLED',
        enabledProviders: [],
      });
    });

    const invalidOptions = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
    invalidOptions.forEach((options) => {
      it('should throw on invalid MultiFactorAuthConfig:' + JSON.stringify(options), () => {
        expect(() => {
          MultiFactorAuthConfig.buildServerRequest(options as any);
        }).to.throw('"MultiFactorConfig" must be a non-null object.');
      });
    });

    it('should throw on MultiFactorAuthConfig with unsupported attribute', () => {
      expect(() => {
        MultiFactorAuthConfig.buildServerRequest({
          unsupported: true,
          state: 'ENABLED',
          factorIds: ['phone'],
        } as any);
      }).to.throw('"unsupported" is not a valid MultiFactorConfig parameter.');
    });

    const invalidState = [
      null, NaN, 0, 1, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop, true, false,
    ];
    invalidState.forEach((state) => {
      it('should throw on invalid MultiFactorConfig.state:' + JSON.stringify(state), () => {
        expect(() => {
          MultiFactorAuthConfig.buildServerRequest({
            state,
            factorIds: ['phone'],
          } as any);
        }).to.throw('"MultiFactorConfig.state" must be either "ENABLED" or "DISABLED".');
      });
    });

    it('should throw on non-array MultiFactorAuthConfig.factorIds', () => {
      expect(() => {
        MultiFactorAuthConfig.buildServerRequest({
          state: 'ENABLED',
          factorIds: 'phone',
        } as any);
      }).to.throw('"MultiFactorConfig.factorIds" must be an array of valid "AuthFactorTypes".');
    });

    const invalidFactorIds = invalidState;
    invalidFactorIds.forEach((factorId) => {
      it('should throw on invalid MultiFactorConfig.factorIds:' + JSON.stringify(factorId), () => {
        expect(() => {
          MultiFactorAuthConfig.buildServerRequest({
            state: 'ENABLED',
            factorIds: [factorId],
          } as any);
        }).to.throw(`"${factorId}" is not a valid "AuthFactorType".`);
      });
    });
  });
});

describe('validateTestPhoneNumbers', () => {
  it('should not throw an error on empty object', () => {
    expect(() => validateTestPhoneNumbers({})).not.to.throw();
  });

  it('should not throw an error on valid phone number / code pairs', () => {
    const pairs = {
      '+16505551234': '019287',
      '+16505550676': '985235',
      '+1 (123) 456-7890': '098765',
      '+1 800 FLOwerS': '000000',
    };

    expect(() => validateTestPhoneNumbers(pairs)).not.to.throw();
  });

  it(`should not throw when ${MAXIMUM_TEST_PHONE_NUMBERS} pairs are provided`, () => {
    const pairs: {[key: string]: string} = {};
    for (let i = 0; i < MAXIMUM_TEST_PHONE_NUMBERS; i++) {
      pairs[`+1650555${'0'.repeat(4 - i.toString().length)}${i}`] = '012938';
    }

    expect(() => validateTestPhoneNumbers(pairs)).not.to.throw();
  });

  it(`should throw when >${MAXIMUM_TEST_PHONE_NUMBERS} pairs are provided`, () => {
    const pairs: {[key: string]: string} = {};
    for (let i = 0; i < MAXIMUM_TEST_PHONE_NUMBERS + 1; i++) {
      pairs[`+1650555${'0'.repeat(4 - i.toString().length)}${i}`] = '012938';
    }

    expect(() => validateTestPhoneNumbers(pairs)).to.throw();
  });

  const nonObjects = [NaN, 0, 1, true, false, '', 'a', _.noop];
  nonObjects.forEach((nonObject) => {
    it(`should throw when non-object ${JSON.stringify(nonObject)} is provided`, () => {
      expect(() => validateTestPhoneNumbers(nonObject as any)).to.throw();
    });
  });

  const invalidPhoneNumbers = [
    null, NaN, 0, 1, true, false, [], ['a'], {}, { a: 1 }, _.noop, '+', '+ ()-',
  ];
  invalidPhoneNumbers.forEach((invalidPhoneNumber) => {
    it(`should throw when "${JSON.stringify(invalidPhoneNumber)}" is used as phone number`, () => {
      const pairs = {
        [invalidPhoneNumber as any]: '123456',
      };
      expect(() => validateTestPhoneNumbers(pairs)).to.throw();
    });
  });

  const invalidCodes = [
    NaN, 0, 1, true, false, '', 'a', _.noop, '12345', '1234567', '123a56', '12 345', 123456,
  ];
  invalidCodes.forEach((invalidCode) => {
    it(`should throw when an invalid code ${JSON.stringify(invalidCode)} is provided`, () => {
      const pairs = {
        '+16505551234': invalidCode,
      };
      expect(() => validateTestPhoneNumbers(pairs as any)).to.throw();
    });
  });
});

describe('SAMLConfig', () => {
  const serverRequest: SAMLConfigServerRequest = {
    idpConfig: {
      idpEntityId: 'IDP_ENTITY_ID',
      ssoUrl: 'https://example.com/login',
      signRequest: true,
      idpCertificates: [
        { x509Certificate: 'CERT1' },
        { x509Certificate: 'CERT2' },
      ],
    },
    spConfig: {
      spEntityId: 'RP_ENTITY_ID',
      callbackUri: 'https://projectId.firebaseapp.com/__/auth/handler',
    },
    displayName: 'samlProviderName',
    enabled: true,
  };
  const serverResponse: SAMLConfigServerResponse = {
    name: 'projects/project_id/inboundSamlConfigs/saml.provider',
    idpConfig: {
      idpEntityId: 'IDP_ENTITY_ID',
      ssoUrl: 'https://example.com/login',
      signRequest: true,
      idpCertificates: [
        { x509Certificate: 'CERT1' },
        { x509Certificate: 'CERT2' },
      ],
    },
    spConfig: {
      spEntityId: 'RP_ENTITY_ID',
      callbackUri: 'https://projectId.firebaseapp.com/__/auth/handler',
    },
    displayName: 'samlProviderName',
    enabled: true,
  };
  const clientRequest: SAMLAuthProviderConfig = {
    providerId: 'saml.provider',
    idpEntityId: 'IDP_ENTITY_ID',
    ssoURL: 'https://example.com/login',
    x509Certificates: ['CERT1', 'CERT2'],
    rpEntityId: 'RP_ENTITY_ID',
    callbackURL: 'https://projectId.firebaseapp.com/__/auth/handler',
    enabled: true,
    displayName: 'samlProviderName',
  };
  const config = new SAMLConfig(serverResponse);

  describe('constructor', () => {
    it('should not throw on valid response', () => {
      expect(() => new SAMLConfig(serverResponse)).not.to.throw();
    });

    it('should set readonly property providerId', () => {
      expect(config.providerId).to.equal('saml.provider');
    });

    it('should set readonly property rpEntityId', () => {
      expect(config.rpEntityId).to.equal('RP_ENTITY_ID');
    });

    it('should set readonly property callbackURL', () => {
      expect(config.callbackURL).to.equal('https://projectId.firebaseapp.com/__/auth/handler');
    });

    it('should set readonly property idpEntityId', () => {
      expect(config.idpEntityId).to.equal('IDP_ENTITY_ID');
    });

    it('should set readonly property ssoURL', () => {
      expect(config.ssoURL).to.equal('https://example.com/login');
    });

    it('should set readonly property enableRequestSigning', () => {
      expect(config.enableRequestSigning).to.be.true;
    });

    it('should set readonly property x509Certificates', () => {
      expect(config.x509Certificates).to.deep.equal(['CERT1', 'CERT2']);
    });

    it('should set readonly property displayName', () => {
      expect(config.displayName).to.equal('samlProviderName');
    });

    it('should set readonly property enabled', () => {
      expect(config.enabled).to.be.true;
    });

    it('should throw on missing idpConfig', () => {
      const invalidResponse = deepCopy(serverResponse);
      delete invalidResponse.idpConfig;
      expect(() => new SAMLConfig(invalidResponse))
        .to.throw('INTERNAL ASSERT FAILED: Invalid SAML configuration response');
    });

    it('should throw on missing rpConfig', () => {
      const invalidResponse = deepCopy(serverResponse);
      delete invalidResponse.spConfig;
      expect(() => new SAMLConfig(invalidResponse))
        .to.throw('INTERNAL ASSERT FAILED: Invalid SAML configuration response');
    });

    it('should throw on invalid provider ID', () => {
      const invalidResponse = deepCopy(serverResponse);
      invalidResponse.name = 'projects/project_id/inboundSamlConfigs/oidc.provider';
      expect(() => new SAMLConfig(invalidResponse))
        .to.throw('INTERNAL ASSERT FAILED: Invalid SAML configuration response');
    });
  });

  describe('getProviderIdFromResourceName()', () => {
    it('should return the expected provider ID for valid resource', () => {
      expect(SAMLConfig.getProviderIdFromResourceName('projects/project1/inboundSamlConfigs/saml.provider'))
        .to.be.equal('saml.provider');
    });

    const invalidResourceNames: string[] = [
      '', 'incorrectsaml.', 'saml.provider', 'saml', 'oidc.provider',
      'projects/project1/prefixinboundSamlConfigs/saml.provider',
      'projects/project1/oauthIdpConfigs/saml.provider'];
    invalidResourceNames.forEach((invalidResourceName) => {
      it(`should return null for invalid resource name "${invalidResourceName}"`, () => {
        expect(SAMLConfig.getProviderIdFromResourceName(invalidResourceName)).to.be.null;
      });
    });
  });

  describe('isProviderId()', () => {
    it('should return true on valid SAML provider ID', () => {
      expect(SAMLConfig.isProviderId('saml.provider')).to.be.true;
    });

    const invalidProviderIds = [
      null, NaN, 0, 1, true, false, '', 'incorrectsaml.', 'saml', 'oidc.provider', 'other', [], [1, 'a'],
      {}, { a: 1 }, _.noop];
    invalidProviderIds.forEach((invalidProviderId) => {
      it(`should return false on invalid SAML provider ID "${JSON.stringify(invalidProviderId)}"`, () => {
        expect(SAMLConfig.isProviderId(invalidProviderId)).to.be.false;
      });
    });
  });

  describe('toJSON()', () => {
    it('should return expected JSON', () => {
      expect(config.toJSON()).to.deep.equal({
        enabled: true,
        displayName: 'samlProviderName',
        providerId: 'saml.provider',
        idpEntityId: 'IDP_ENTITY_ID',
        ssoURL: 'https://example.com/login',
        x509Certificates: ['CERT1', 'CERT2'],
        rpEntityId: 'RP_ENTITY_ID',
        callbackURL: 'https://projectId.firebaseapp.com/__/auth/handler',
        enableRequestSigning: true,
      });
    });
  });

  describe('buildServerRequest()', () => {
    it('should return expected server request on valid input', () => {
      const request = deepCopy(clientRequest);
      (request as any).enableRequestSigning = true;
      expect(SAMLConfig.buildServerRequest(request)).to.deep.equal(serverRequest);
    });

    it('should ignore missing fields if not required', () => {
      const updateRequest: SAMLUpdateAuthProviderRequest = {
        idpEntityId: 'IDP_ENTITY_ID',
        callbackURL: 'https://projectId.firebaseapp.com/__/auth/handler',
        enabled: false,
      };
      const updateServerRequest: SAMLConfigServerRequest = {
        idpConfig: {
          idpEntityId: 'IDP_ENTITY_ID',
          ssoUrl: undefined,
          idpCertificates: undefined,
          signRequest: undefined,
        },
        spConfig: {
          spEntityId: undefined,
          callbackUri: 'https://projectId.firebaseapp.com/__/auth/handler',
        },
        displayName: undefined,
        enabled: false,
      };
      expect(SAMLConfig.buildServerRequest(updateRequest, true)).to.deep.equal(updateServerRequest);
    });

    it('should throw on invalid input', () => {
      const invalidClientRequest = deepCopy(clientRequest);
      invalidClientRequest.providerId = 'oidc.provider';
      expect(() => SAMLConfig.buildServerRequest(invalidClientRequest))
        .to.throw('"SAMLAuthProviderConfig.providerId" must be a valid non-empty string prefixed with "saml.".');
    });

    const nonAuthConfigOptions = [null, undefined, {}, { other: 'value' }];
    nonAuthConfigOptions.forEach((nonAuthConfig) => {
      it('should return null when no AuthConfig is provided: ' + JSON.stringify(nonAuthConfig), () => {
        expect(SAMLConfig.buildServerRequest(nonAuthConfig as any))
          .to.be.null;
      });
    });
  });

  describe('validate()', () => {
    it('should not throw on valid client request object', () => {
      expect(() => SAMLConfig.validate(clientRequest)).not.to.throw();
    });

    it('should not throw when providerId is missing and not required', () => {
      const partialRequest = deepCopy(clientRequest) as any;
      delete partialRequest.providerId;
      expect(() => SAMLConfig.validate(partialRequest, true)).not.to.throw();
    });

    it('should not throw when idpEntityId is missing and not required', () => {
      const partialRequest = deepCopy(clientRequest) as any;
      delete partialRequest.idpEntityId;
      expect(() => SAMLConfig.validate(partialRequest, true)).not.to.throw();
    });

    it('should not throw when ssoURL is missing and not required', () => {
      const partialRequest = deepCopy(clientRequest) as any;
      delete partialRequest.ssoURL;
      expect(() => SAMLConfig.validate(partialRequest, true)).not.to.throw();
    });

    it('should not throw when rpEntityId is missing and not required', () => {
      const partialRequest = deepCopy(clientRequest) as any;
      delete partialRequest.rpEntityId;
      expect(() => SAMLConfig.validate(partialRequest, true)).not.to.throw();
    });

    it('should not throw when callbackURL is missing and not required', () => {
      const partialRequest = deepCopy(clientRequest) as any;
      delete partialRequest.callbackURL;
      expect(() => SAMLConfig.validate(partialRequest, true)).not.to.throw();
    });

    it('should not throw when x509Certificates is missing and not required', () => {
      const partialRequest = deepCopy(clientRequest) as any;
      delete partialRequest.x509Certificates;
      expect(() => SAMLConfig.validate(partialRequest, true)).not.to.throw();
    });

    const nonObjects = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
    nonObjects.forEach((request) => {
      it('should throw on non-null SAMLAuthProviderConfig object:' + JSON.stringify(request), () => {
        expect(() => SAMLConfig.validate(request as any))
          .to.throw('"SAMLAuthProviderConfig" must be a valid non-null object.');
      });
    });

    it('should throw on unsupported attribute', () => {
      const invalidClientRequest = deepCopy(clientRequest) as any;
      invalidClientRequest.unsupported = 'value';
      expect(() => SAMLConfig.validate(invalidClientRequest))
        .to.throw('"unsupported" is not a valid SAML config parameter.');
    });

    const invalidProviderIds = [
      null, NaN, 0, 1, true, false, '', 'oidc.provider', 'other', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidProviderIds.forEach((providerId) => {
      it('should throw on invalid providerId:' + JSON.stringify(providerId), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.providerId = providerId;
        expect(() => SAMLConfig.validate(invalidClientRequest))
          .to.throw('"SAMLAuthProviderConfig.providerId" must be a valid non-empty string prefixed with "saml.".');
      });
    });

    const invalidIdpEntityIds = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidIdpEntityIds.forEach((idpEntityId) => {
      it('should throw on invalid idpEntityId:' + JSON.stringify(idpEntityId), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.idpEntityId = idpEntityId;
        expect(() => SAMLConfig.validate(invalidClientRequest))
          .to.throw('"SAMLAuthProviderConfig.idpEntityId" must be a valid non-empty string.');
      });
    });

    const ssoURLs = [null, NaN, 0, 1, true, false, '', 'invalid', [], [1, 'a'], {}, { a: 1 }, _.noop];
    ssoURLs.forEach((ssoURL) => {
      it('should throw on invalid ssoURL:' + JSON.stringify(ssoURL), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.ssoURL = ssoURL;
        expect(() => SAMLConfig.validate(invalidClientRequest))
          .to.throw('"SAMLAuthProviderConfig.ssoURL" must be a valid URL string.');
      });
    });

    const invalidRpEntityIds = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidRpEntityIds.forEach((rpEntityId) => {
      it('should throw on invalid rpEntityId:' + JSON.stringify(rpEntityId), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.rpEntityId = rpEntityId;
        expect(() => SAMLConfig.validate(invalidClientRequest))
          .to.throw('"SAMLAuthProviderConfig.rpEntityId" must be a valid non-empty string.');
      });
    });

    const callbackURLs = [null, NaN, 0, 1, true, false, '', 'invalid', [], [1, 'a'], {}, { a: 1 }, _.noop];
    callbackURLs.forEach((callbackURL) => {
      it('should throw on invalid callbackURL:' + JSON.stringify(callbackURL), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.callbackURL = callbackURL;
        expect(() => SAMLConfig.validate(invalidClientRequest))
          .to.throw('"SAMLAuthProviderConfig.callbackURL" must be a valid URL string.');
      });
    });

    const x509Certs = [null, NaN, 0, 1, true, false, '', [1, 'a'], [''], 'CERT', {}, { a: 1 }, _.noop];
    x509Certs.forEach((x509Cert) => {
      it('should throw on invalid x509Certificates:' + JSON.stringify(x509Cert), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.x509Certificates = x509Cert;
        expect(() => SAMLConfig.validate(invalidClientRequest))
          .to.throw('"SAMLAuthProviderConfig.x509Certificates" must be a valid array of X509 certificate strings.');
      });
    });

    const invalidRequestSigning = [null, NaN, 0, 1, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidRequestSigning.forEach((enableRequestSigning) => {
      it('should throw on invalid enableRequestSigning:' + JSON.stringify(enableRequestSigning), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.enableRequestSigning = enableRequestSigning;
        expect(() => SAMLConfig.validate(invalidClientRequest))
          .to.throw('"SAMLAuthProviderConfig.enableRequestSigning" must be a boolean.');
      });
    });

    const invalidEnabledOptions = [null, NaN, 0, 1, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidEnabledOptions.forEach((invalidEnabled) => {
      it('should throw on invalid enabled:' + JSON.stringify(invalidEnabled), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.enabled = invalidEnabled;
        expect(() => SAMLConfig.validate(invalidClientRequest))
          .to.throw('"SAMLAuthProviderConfig.enabled" must be a boolean.');
      });
    });

    const invalidDisplayNames = [null, NaN, 0, 1, true, false, [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidDisplayNames.forEach((invalidDisplayName) => {
      it('should throw on invalid displayName:' + JSON.stringify(invalidDisplayName), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.displayName = invalidDisplayName;
        expect(() => SAMLConfig.validate(invalidClientRequest))
          .to.throw('"SAMLAuthProviderConfig.displayName" must be a valid string.');
      });
    });
  });
});

describe('OIDCConfig', () => {
  const serverRequest: OIDCConfigServerRequest = {
    clientId: 'CLIENT_ID',
    issuer: 'https://oidc.com/issuer',
    displayName: 'oidcProviderName',
    enabled: true,
  };
  const serverResponse: OIDCConfigServerResponse = {
    name: 'projects/project_id/oauthIdpConfigs/oidc.provider',
    clientId: 'CLIENT_ID',
    issuer: 'https://oidc.com/issuer',
    displayName: 'oidcProviderName',
    enabled: true,
  };
  const clientRequest: OIDCAuthProviderConfig = {
    providerId: 'oidc.provider',
    clientId: 'CLIENT_ID',
    issuer: 'https://oidc.com/issuer',
    displayName: 'oidcProviderName',
    enabled: true,
  };
  const config = new OIDCConfig(serverResponse);

  describe('constructor', () => {
    it('should not throw on valid response', () => {
      expect(() => new OIDCConfig(serverResponse)).not.to.throw();
    });

    it('should set readonly property providerId', () => {
      expect(config.providerId).to.equal('oidc.provider');
    });

    it('should set readonly property clientId', () => {
      expect(config.clientId).to.equal('CLIENT_ID');
    });

    it('should set readonly property issuer', () => {
      expect(config.issuer).to.equal('https://oidc.com/issuer');
    });

    it('should set readonly property displayName', () => {
      expect(config.displayName).to.equal('oidcProviderName');
    });

    it('should set readonly property enabled', () => {
      expect(config.enabled).to.be.true;
    });

    it('should throw on missing issuer', () => {
      const invalidResponse = deepCopy(serverResponse);
      delete invalidResponse.issuer;
      expect(() => new OIDCConfig(invalidResponse))
        .to.throw('INTERNAL ASSERT FAILED: Invalid OIDC configuration response');
    });

    it('should throw on missing clientId', () => {
      const invalidResponse = deepCopy(serverResponse);
      delete invalidResponse.clientId;
      expect(() => new OIDCConfig(invalidResponse))
        .to.throw('INTERNAL ASSERT FAILED: Invalid OIDC configuration response');
    });

    it('should throw on invalid provider ID', () => {
      const invalidResponse = deepCopy(serverResponse);
      invalidResponse.name = 'projects/project_id/oauthIdpConfigs/saml.provider';
      expect(() => new OIDCConfig(invalidResponse))
        .to.throw('INTERNAL ASSERT FAILED: Invalid OIDC configuration response');
    });
  });

  describe('getProviderIdFromResourceName()', () => {
    it('should return the expected provider ID for valid resource', () => {
      expect(OIDCConfig.getProviderIdFromResourceName('projects/project1/oauthIdpConfigs/oidc.provider'))
        .to.be.equal('oidc.provider');
    });

    const invalidResourceNames: string[] = [
      '', 'incorrectsaml.', 'oidc.provider', 'oidc', 'saml.provider',
      'projects/project1/prefixoauthIdpConfigs/oidc.provider',
      'projects/project1/inboundSamlConfigs/oidc.provider'];
    invalidResourceNames.forEach((invalidResourceName) => {
      it(`should return null for invalid resource name "${invalidResourceName}"`, () => {
        expect(OIDCConfig.getProviderIdFromResourceName(invalidResourceName)).to.be.null;
      });
    });
  });

  describe('isProviderId()', () => {
    it('should return true on valid OIDC provider ID', () => {
      expect(OIDCConfig.isProviderId('oidc.provider')).to.be.true;
    });

    const invalidProviderIds = [
      null, NaN, 0, 1, true, false, '', 'incorrectoidc.', 'oidc', 'saml.provider', 'other', [], [1, 'a'],
      {}, { a: 1 }, _.noop];
    invalidProviderIds.forEach((invalidProviderId) => {
      it(`should return false on invalid OIDC provider ID "${JSON.stringify(invalidProviderId)}"`, () => {
        expect(OIDCConfig.isProviderId(invalidProviderId)).to.be.false;
      });
    });
  });

  describe('toJSON()', () => {
    it('should return expected JSON', () => {
      expect(config.toJSON()).to.deep.equal({
        enabled: true,
        displayName: 'oidcProviderName',
        providerId: 'oidc.provider',
        issuer: 'https://oidc.com/issuer',
        clientId: 'CLIENT_ID',
      });
    });
  });

  describe('buildServerRequest()', () => {
    it('should return expected server request on valid input', () => {
      expect(OIDCConfig.buildServerRequest(clientRequest)).to.deep.equal(serverRequest);
    });

    it('should ignore missing fields if not required', () => {
      const updateRequest: OIDCUpdateAuthProviderRequest = {
        clientId: 'CLIENT_ID',
        displayName: 'OIDC_PROVIDER_DISPLAY_NAME',
      };
      const updateServerRequest: OIDCConfigServerRequest = {
        clientId: 'CLIENT_ID',
        displayName: 'OIDC_PROVIDER_DISPLAY_NAME',
        issuer: undefined,
        enabled: undefined,
      };
      expect(OIDCConfig.buildServerRequest(updateRequest, true)).to.deep.equal(updateServerRequest);
    });

    it('should throw on invalid input', () => {
      const invalidClientRequest = deepCopy(clientRequest);
      invalidClientRequest.providerId = 'saml.provider';
      expect(() => OIDCConfig.buildServerRequest(invalidClientRequest))
        .to.throw('"OIDCAuthProviderConfig.providerId" must be a valid non-empty string prefixed with "oidc.".');
    });

    const nonAuthConfigOptions = [null, undefined, {}, { other: 'value' }];
    nonAuthConfigOptions.forEach((nonAuthConfig) => {
      it('should return null when no AuthConfig is provided: ' + JSON.stringify(nonAuthConfig), () => {
        expect(OIDCConfig.buildServerRequest(nonAuthConfig as any)).to.be.null;
      });
    });
  });

  describe('validate()', () => {
    it('should not throw on valid client request object', () => {
      expect(() => OIDCConfig.validate(clientRequest)).not.to.throw();
    });

    it('should not throw when providerId is missing and not required', () => {
      const partialRequest = deepCopy(clientRequest) as any;
      delete partialRequest.providerId;
      expect(() => OIDCConfig.validate(partialRequest, true)).not.to.throw();
    });

    it('should not throw when clientId is missing and not required', () => {
      const partialRequest = deepCopy(clientRequest) as any;
      delete partialRequest.clientId;
      expect(() => OIDCConfig.validate(partialRequest, true)).not.to.throw();
    });

    it('should not throw when issuer is missing and not required', () => {
      const partialRequest = deepCopy(clientRequest) as any;
      delete partialRequest.issuer;
      expect(() => OIDCConfig.validate(partialRequest, true)).not.to.throw();
    });

    const nonObjects = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
    nonObjects.forEach((request) => {
      it('should throw on non-null OIDCAuthProviderConfig object:' + JSON.stringify(request), () => {
        expect(() => OIDCConfig.validate(request as any))
          .to.throw('"OIDCAuthProviderConfig" must be a valid non-null object.');
      });
    });

    it('should throw on unsupported attribute', () => {
      const invalidClientRequest = deepCopy(clientRequest) as any;
      invalidClientRequest.unsupported = 'value';
      expect(() => OIDCConfig.validate(invalidClientRequest))
        .to.throw('"unsupported" is not a valid OIDC config parameter.');
    });

    const invalidProviderIds = [
      null, NaN, 0, 1, true, false, '', 'other', 'saml.provider', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidProviderIds.forEach((providerId) => {
      it('should throw on invalid providerId:' + JSON.stringify(providerId), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.providerId = providerId;
        expect(() => OIDCConfig.validate(invalidClientRequest))
          .to.throw('"OIDCAuthProviderConfig.providerId" must be a valid non-empty string prefixed with "oidc.".');
      });
    });

    const invalicClientIds = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalicClientIds.forEach((invalicClientId) => {
      it('should throw on invalid clientId:' + JSON.stringify(invalicClientId), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.clientId = invalicClientId;
        expect(() => OIDCConfig.validate(invalidClientRequest))
          .to.throw('"OIDCAuthProviderConfig.clientId" must be a valid non-empty string.');
      });
    });

    const invalidIssuers = [null, NaN, 0, 1, true, false, '', 'invalid', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidIssuers.forEach((invalidIssuer) => {
      it('should throw on invalid issuer:' + JSON.stringify(invalidIssuer), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.issuer = invalidIssuer;
        expect(() => OIDCConfig.validate(invalidClientRequest))
          .to.throw('"OIDCAuthProviderConfig.issuer" must be a valid URL string.');
      });
    });

    const invalidEnabledOptions = [null, NaN, 0, 1, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidEnabledOptions.forEach((invalidEnabled) => {
      it('should throw on invalid enabled:' + JSON.stringify(invalidEnabled), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.enabled = invalidEnabled;
        expect(() => OIDCConfig.validate(invalidClientRequest))
          .to.throw('"OIDCAuthProviderConfig.enabled" must be a boolean.');
      });
    });

    const invalidDisplayNames = [null, NaN, 0, 1, true, false, [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidDisplayNames.forEach((invalidDisplayName) => {
      it('should throw on invalid displayName:' + JSON.stringify(invalidDisplayName), () => {
        const invalidClientRequest = deepCopy(clientRequest) as any;
        invalidClientRequest.displayName = invalidDisplayName;
        expect(() => OIDCConfig.validate(invalidClientRequest))
          .to.throw('"OIDCAuthProviderConfig.displayName" must be a valid string.');
      });
    });
  });
});
