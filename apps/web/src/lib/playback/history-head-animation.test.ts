import { describe, expect, it } from 'vitest';
import { detectNewHistoryHeadId } from './history-head-animation';

describe('detectNewHistoryHeadId', () => {
  it('returns null on first hydrate before list has been seen', () => {
    expect(detectNewHistoryHeadId('head-a', { hasSeenList: false, prevHeadId: null })).toBeNull();
  });

  it('returns null when prev head is not yet recorded', () => {
    expect(detectNewHistoryHeadId('head-a', { hasSeenList: true, prevHeadId: null })).toBeNull();
  });

  it('returns null when head id is unchanged', () => {
    expect(
      detectNewHistoryHeadId('head-a', { hasSeenList: true, prevHeadId: 'head-a' }),
    ).toBeNull();
  });

  it('returns null when head id is missing', () => {
    expect(
      detectNewHistoryHeadId(undefined, { hasSeenList: true, prevHeadId: 'head-a' }),
    ).toBeNull();
  });

  it('returns new head id when head changes after hydrate', () => {
    expect(detectNewHistoryHeadId('head-b', { hasSeenList: true, prevHeadId: 'head-a' })).toBe(
      'head-b',
    );
  });
});
