import { describe, it, expect } from 'vitest';
import { cleanFilenameToTitle } from './clean-audio-filename';

const context = (artists: string[], album: string) => ({ artists, album });

describe('cleanFilenameToTitle', () => {
  it('removes file extension', () => {
    expect(cleanFilenameToTitle('Song Title.mp3', context([], ''))).toBe('Song Title');
    expect(cleanFilenameToTitle('Track.wav', context([], ''))).toBe('Track');
  });

  it('removes leading track numbers', () => {
    expect(cleanFilenameToTitle('01 - Song Title.mp3', context([], ''))).toBe('Song Title');
    expect(cleanFilenameToTitle('1. Song Title.mp3', context([], ''))).toBe('Song Title');
    expect(cleanFilenameToTitle('02 Song Title.mp3', context([], ''))).toBe('Song Title');
    expect(cleanFilenameToTitle('01-02 - Song Title.mp3', context([], ''))).toBe('Song Title');
  });

  it('removes artist name from context when at start', () => {
    expect(
      cleanFilenameToTitle(
        '01 - Nirvana - Smells Like Teen Spirit.mp3',
        context(['Nirvana'], 'Nevermind'),
      ),
    ).toBe('Smells Like Teen Spirit');
  });

  it('removes artist name when at end', () => {
    expect(cleanFilenameToTitle('Song Title - Nirvana.mp3', context(['Nirvana'], ''))).toBe(
      'Song Title',
    );
  });

  it('removes album name from context', () => {
    expect(
      cleanFilenameToTitle(
        '01 - Nevermind - Smells Like Teen Spirit.mp3',
        context([], 'Nevermind'),
      ),
    ).toBe('Smells Like Teen Spirit');
  });

  it('removes features (feat., ft., featuring)', () => {
    expect(
      cleanFilenameToTitle(
        '02 - Kaz Bałagane feat. Diho - Dzwony.mp3',
        context(['Kaz Bałagane'], ''),
      ),
    ).toBe('Dzwony');
    expect(cleanFilenameToTitle('Song Title (feat. Artist).mp3', context([], ''))).toBe(
      'Song Title',
    );
    expect(cleanFilenameToTitle('Song Title ft. Artist.mp3', context([], ''))).toBe('Song Title');
  });

  it('removes metadata in brackets', () => {
    expect(cleanFilenameToTitle('Song Title [320kbps].mp3', context([], ''))).toBe('Song Title');
    expect(cleanFilenameToTitle('Song Title [HQ].wav', context([], ''))).toBe('Song Title');
  });

  it('removes metadata in parentheses', () => {
    expect(cleanFilenameToTitle('Song Title (Official Video).mp3', context([], ''))).toBe(
      'Song Title',
    );
  });

  it('replaces underscores and dashes with spaces', () => {
    expect(cleanFilenameToTitle('Song_Title.mp3', context([], ''))).toBe('Song Title');
    expect(cleanFilenameToTitle('Song-Title.mp3', context([], ''))).toBe('Song Title');
  });

  it('returns fallback when result would be empty', () => {
    expect(cleanFilenameToTitle('01 - Nirvana.mp3', context(['Nirvana'], 'Nirvana'))).toBe(
      '01 - Nirvana',
    );
  });

  it('handles empty context', () => {
    expect(cleanFilenameToTitle('01 - My Song.mp3', context([], ''))).toBe('My Song');
  });
});
