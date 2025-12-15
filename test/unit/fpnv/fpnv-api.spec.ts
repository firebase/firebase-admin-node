import { expect } from 'chai';
import { FpnvToken } from '../../../src/fpnv/fpnv-api';

describe('FpnvToken Interface Compliance', () => {

  // A helper to create a valid Mock implementation of the FpnvToken interface.
  // In a real scenario, this object would be returned by the SDK's verify method.
  const createMockToken = (overrides: Partial<FpnvToken> = {}): FpnvToken => {
    const defaultToken: FpnvToken = {
      iss: 'https://fpnv.googleapis.com/projects/1234567890',
      aud: ['1234567890', 'my-project-id'],
      exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
      iat: Math.floor(Date.now() / 1000),        // Issued now
      sub: '+15555550100',                       // Phone number
      jti: 'unique-token-id-123',
      nonce: 'random-nonce-string',

      // Implementation of the convenience method per JSDoc
      getPhoneNumber() {
        return this.sub;
      },

      // Arbitrary claims
      custom_claim: true
    };

    return { ...defaultToken, ...overrides };
  };

  describe('Structure and Claims', () => {
    it('should have a valid issuer (iss) URL format', () => {
      const token = createMockToken({ iss: 'https://fpnv.googleapis.com/1234567890' });
      expect(token.iss).to.match(/^https:\/\/fpnv\.googleapis\.com\/\d+$/);
    });

    it('should have an audience (aud) containing project number and project ID', () => {
      const projectNumber = '1234567890';
      const projectId = 'my-project-id';
      const token = createMockToken({ aud: [projectNumber, projectId] });

      expect(token.aud).to.be.an('array').that.has.lengthOf(2);
      expect(token.aud).to.include(projectNumber);
      expect(token.aud).to.include(projectId);
    });

    it('should have an expiration time (exp) after the issued-at time (iat)', () => {
      const token = createMockToken();
      expect(token.exp).to.be.greaterThan(token.iat);
    });
  });

  describe('getPhoneNumber()', () => {
    it('should be a function', () => {
      const token = createMockToken();
      expect(token.getPhoneNumber).to.be.a('function');
    });

    it('should return the value of the "sub" property', () => {
      const phoneNumber = '+15550009999';
      const token = createMockToken({ sub: phoneNumber });

      const result = token.getPhoneNumber();

      expect(result).to.equal(phoneNumber);
      expect(result).to.equal(token.sub);
    });

    it('should handle cases where sub is empty string (if valid in your context)', () => {
      const token = createMockToken({ sub: '' });
      expect(token.getPhoneNumber()).to.equal('');
    });
  });

  describe('Arbitrary Claims', () => {
    it('should allow accessing custom claims via index signature', () => {
      const token = createMockToken({ isAdmin: true, tier: 'gold' });

      expect(token['isAdmin']).to.be.true;
      expect(token['tier']).to.equal('gold');
    });
  });
});
