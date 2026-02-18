import { generateApiKey, verifyApiKey } from '../../src/helpers/api-helper';

describe('ApiHelper', () => {
  describe('generateApiKey', () => {
    it('should generate an API key with raw and hashed values', () => {
      const result = generateApiKey();
      expect(result).toHaveProperty('rawKey');
      expect(result).toHaveProperty('hashedKey');
      expect(result.rawKey).toHaveLength(64); // default 32 bytes * 2 hex chars = 64
      expect(result.hashedKey).toHaveLength(64); // sha256 hex = 64 chars
    });

    it('should allow custom size', () => {
      const result = generateApiKey(16);
      expect(result.rawKey).toHaveLength(32); // 16 bytes * 2 hex chars = 32
    });

    it('should generate different keys on subsequent calls', () => {
      const result1 = generateApiKey();
      const result2 = generateApiKey();
      expect(result1.rawKey).not.toBe(result2.rawKey);
    });
  });

  describe('verifyApiKey', () => {
    it('should return true for a valid key', () => {
      const { rawKey, hashedKey } = generateApiKey();
      expect(verifyApiKey(rawKey, hashedKey)).toBe(true);
    });

    it('should return false for an invalid key', () => {
      const { hashedKey } = generateApiKey();
      expect(verifyApiKey('invalid-key', hashedKey)).toBe(false);
    });

    it('should return false for mismatched hash', () => {
      const { rawKey } = generateApiKey();
      const { hashedKey } = generateApiKey(); // Different hash
      expect(verifyApiKey(rawKey, hashedKey)).toBe(false);
    });
  });
});
