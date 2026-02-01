import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * OWASP recommended parameters for Argon2id
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2, // 2 iterations
  parallelism: 1,
};

@Injectable()
export class HashingService {
  /**
   * Hash a plain text password using Argon2id
   * @param plain - The plain text password to hash
   * @returns The hashed password
   */
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2_OPTIONS);
  }

  /**
   * Compare a plain text password against a hash
   * @param plain - The plain text password to verify
   * @param hash - The hash to compare against
   * @returns True if the password matches, false otherwise
   */
  async compare(plain: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /**
   * Check if a hash needs to be rehashed due to outdated parameters
   * Useful for upgrading security parameters without forcing password resets
   * @param hash - The hash to check
   * @returns True if the hash should be regenerated with current parameters
   */
  async needsRehash(hash: string): Promise<boolean> {
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
  }
}
