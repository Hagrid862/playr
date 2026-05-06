import { it, expect } from 'vitest';

it('checks DataTransfer', () => {
  const dt = new DataTransfer();
  expect(dt).toBeDefined();
  expect(dt.files).toBeDefined();
});
