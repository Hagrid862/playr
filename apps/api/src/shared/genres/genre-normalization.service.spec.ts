import { beforeEach, describe, expect, it } from 'vitest';
import { GenreNormalizationService } from './genre-normalization.service';

describe('GenreNormalizationService', () => {
  let service: GenreNormalizationService;

  beforeEach(() => {
    service = new GenreNormalizationService();
  });

  describe('normalizeToMatchKey', () => {
    it('collapses spacing and punctuation (Hip Hop / Hip-Hop)', () => {
      expect(service.normalizeToMatchKey('Hip Hop')).toBe('hiphop');
      expect(service.normalizeToMatchKey('Hip-Hop')).toBe('hiphop');
      expect(service.normalizeToMatchKey('hiphop')).toBe('hiphop');
    });

    it('matches seeded slug style (Alternative Rock)', () => {
      expect(service.normalizeToMatchKey('Alternative Rock')).toBe('alternativerock');
    });

    it('preserves Cyrillic letters in the match key', () => {
      expect(service.normalizeToMatchKey('Рок')).toBe('рок');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(service.normalizeToMatchKey('   ')).toBe('');
    });
  });

  describe('splitRawGenreSegments', () => {
    it('splits on semicolon, slash, pipe, and comma', () => {
      expect(service.splitRawGenreSegments('Rock; Pop')).toEqual(['Rock', 'Pop']);
      expect(service.splitRawGenreSegments('Rock/Pop')).toEqual(['Rock', 'Pop']);
      expect(service.splitRawGenreSegments('Rock|Pop')).toEqual(['Rock', 'Pop']);
      expect(service.splitRawGenreSegments('Rock,Pop')).toEqual(['Rock', 'Pop']);
    });
  });

  describe('flattenRawGenreInput', () => {
    it('flattens arrays and nested separators', () => {
      expect(service.flattenRawGenreInput(['Rock; Jazz', 'Blues'])).toEqual([
        'Rock',
        'Jazz',
        'Blues',
      ]);
    });

    it('skips non-string elements in arrays', () => {
      expect(service.flattenRawGenreInput(['Rock', 123 as any, 'Jazz'])).toEqual(['Rock', 'Jazz']);
    });

    it('splits a plain string on semicolons, slashes, pipes, and commas', () => {
      expect(service.flattenRawGenreInput('Rock; Jazz/Blues')).toEqual(['Rock', 'Jazz', 'Blues']);
    });
  });
});
