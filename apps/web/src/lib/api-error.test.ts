import { describe, it, expect } from 'vitest';
import { ApiError } from './api-error';

describe('ApiError', () => {
  it('constructs with status, statusText, and data', () => {
    const error = new ApiError(404, 'Not Found', { message: 'Resource missing' });
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.data).toEqual({ message: 'Resource missing' });
  });

  it('extracts message from standard ApiFailureResponse structure', () => {
    const data = {
      error: {
        message: 'Validation failed',
      },
    };
    const error = new ApiError(400, 'Bad Request', data);
    expect(error.message).toBe('Validation failed');
  });

  it('extracts message from standard ApiFailureResponse structure when message is an object', () => {
    const data = {
      error: {
        message: { foo: 'bar' },
      },
    };
    const error = new ApiError(400, 'Bad Request', data);
    expect(error.message).toBe('{"foo":"bar"}');
  });

  it('extracts message from flat message property', () => {
    const data = { message: 'Something went wrong' };
    const error = new ApiError(500, 'Server Error', data);
    expect(error.message).toBe('Something went wrong');
  });

  it('fallbacks to statusText if no message in data', () => {
    const error = new ApiError(500, 'Internal Server Error', {});
    expect(error.message).toBe('Internal Server Error');
  });

  it('fallbacks to default message if no statusText and no message in data', () => {
    const error = new ApiError(500, undefined, {});
    expect(error.message).toBe('Unknown API Error');
  });
});
