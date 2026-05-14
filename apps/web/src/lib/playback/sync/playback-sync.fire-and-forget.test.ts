import { afterEach, describe, expect, it, vi } from 'vitest';
import { firePlaybackCommand } from './playback-sync.fire-and-forget';

describe('firePlaybackCommand', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches catch that logs rejection with label', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = new Error('list failed');
    firePlaybackCommand(Promise.reject(err), 'listPlaybackDevices');

    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('[playback-sync] listPlaybackDevices', err);
    });
  });
});
