import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';

describe('ApiError', () => {
  describe('construction', () => {
    it('constructs with status, statusText, and data', () => {
      const error = new ApiError(404, 'Not Found', { message: 'Resource missing' });
      expect(error.status).toBe(404);
      expect(error.statusText).toBe('Not Found');
      expect(error.data).toEqual({ message: 'Resource missing' });
    });
  });

  describe('message from ApiFailureResponse', () => {
    it('extracts message from nested error.message string', () => {
      const data = {
        error: {
          message: 'Validation failed',
        },
      };
      const error = new ApiError(400, 'Bad Request', data);
      expect(error.message).toBe('Validation failed');
    });

    it('stringifies nested error.message when it is an object', () => {
      const data = {
        error: {
          message: { foo: 'bar' },
        },
      };
      const error = new ApiError(400, 'Bad Request', data);
      expect(error.message).toBe('{"foo":"bar"}');
    });
  });

  describe('flat message property', () => {
    it('extracts message from flat message string', () => {
      const data = { message: 'Something went wrong' };
      const error = new ApiError(500, 'Server Error', data);
      expect(error.message).toBe('Something went wrong');
    });

    it('falls back to statusText when flat message is not a string', () => {
      const data = { message: { complex: 'error' } };
      const error = new ApiError(500, 'Server Error', data);
      expect(error.message).toBe('Server Error');
    });
  });

  describe('fallbacks', () => {
    it('uses statusText if no message in data', () => {
      const error = new ApiError(500, 'Internal Server Error', {});
      expect(error.message).toBe('Internal Server Error');
    });

    it('uses default message if no statusText and no message in data', () => {
      const error = new ApiError(500, undefined, {});
      expect(error.message).toBe('Unknown API Error');
    });

    it('uses statusText when data has no message property', () => {
      const data = { other: 'stuff' };
      const error = new ApiError(500, 'Server Error', data);
      expect(error.message).toBe('Server Error');
    });
  });

  describe('non-object data', () => {
    it('handles non-object data gracefully', () => {
      const error = new ApiError(500, 'Error', 'plain text');
      expect(error.message).toBe('Error');

      const error2 = new ApiError(500, 'Error', null);
      expect(error2.message).toBe('Error');

      const error3 = new ApiError(500, 'Error', undefined);
      expect(error3.message).toBe('Error');

      const error4 = new ApiError(500, 'Error', 123);
      expect(error4.message).toBe('Error');
    });
  });
});
