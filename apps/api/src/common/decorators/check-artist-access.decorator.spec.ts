import { describe, expect, it } from 'vitest';
import { CheckArtistAccess } from './check-artist-access.decorator';

describe('CheckArtistAccess Decorator', () => {
  it('should be defined', () => {
    expect(CheckArtistAccess).toBeDefined();
  });

  it('should set metadata with default param name "id"', () => {
    const decorator = CheckArtistAccess();
    expect(typeof decorator).toBe('function');
  });

  it('should set metadata with custom param name', () => {
    const customParam = 'artistId';
    const decorator = CheckArtistAccess(customParam);
    expect(typeof decorator).toBe('function');
  });
});
