import { HashingService } from './hashing.service';

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(() => {
    service = new HashingService();
  });

  describe('hash', () => {
    it('should return a valid Argon2 hash', async () => {
      const password = 'securePassword123!';
      const hash = await service.hash(password);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it('should produce different hashes for the same password (salt verification)', async () => {
      const password = 'securePassword123!';
      const hash1 = await service.hash(password);
      const hash2 = await service.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compare', () => {
    it('should return true for correct password', async () => {
      const password = 'securePassword123!';
      const hash = await service.hash(password);

      const result = await service.compare(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'securePassword123!';
      const wrongPassword = 'wrongPassword456!';
      const hash = await service.hash(password);

      const result = await service.compare(wrongPassword, hash);

      expect(result).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const password = 'securePassword123!';
      const invalidHash = 'not-a-valid-hash';

      const result = await service.compare(password, invalidHash);

      expect(result).toBe(false);
    });
  });

  describe('needsRehash', () => {
    it('should return false for hash with current parameters', async () => {
      const password = 'securePassword123!';
      const hash = await service.hash(password);

      const result = await service.needsRehash(hash);

      expect(result).toBe(false);
    });
  });
});
