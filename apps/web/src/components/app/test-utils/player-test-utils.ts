import type { PlayerState, QueueItem } from '@/stores/player.store';
import type { ZodAlbum, ZodArtist } from '@repo/contracts';
import type { Album, Track } from '@repo/db';
import { albumBuilder, artistBuilder, imageBuilder, trackBuilder } from '@repo/testing';
import { vi } from 'vitest';

export function createPlayerStateMock(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    currentTrack: null,
    isPlaying: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    quality: 'auto',
    availableQualities: ['auto'],
    queue: [],
    originalQueue: [],
    history: [],
    repeatMode: 'off',
    isShuffled: false,
    playTrack: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    togglePlay: vi.fn(),
    setVolume: vi.fn(),
    setCurrentTime: vi.fn(),
    setDuration: vi.fn(),
    setQuality: vi.fn(),
    setAvailableQualities: vi.fn(),
    setQueue: vi.fn(),
    nextTrack: vi.fn(),
    previousTrack: vi.fn(),
    toggleRepeatMode: vi.fn(),
    toggleShuffle: vi.fn(),
    addToQueue: vi.fn(),
    playNext: vi.fn(),
    removeFromQueue: vi.fn(),
    reorderQueue: vi.fn(),
    addToHistory: vi.fn(),
    isQueueOpen: false,
    sidebarView: 'queue',
    toggleQueue: vi.fn(),
    setQueueOpen: vi.fn(),
    setSidebarView: vi.fn(),
    ...overrides,
  };
}

/** Scalar track fields + `uniqueId` only — attach `artists` / `album` via {@link testArtist}, {@link testAlbumWithCover}, etc. */
export type CreateQueueItemFixtureOptions = Partial<Track> & { uniqueId?: string };

export function createQueueItemFixture(options: CreateQueueItemFixtureOptions = {}): QueueItem {
  const { uniqueId = 'test-1', ...trackOverrides } = options;
  const base = trackBuilder({
    id: 'test-track-1',
    title: 'Test Title',
    ...trackOverrides,
  });
  return { ...base, uniqueId } as QueueItem;
}

export function testArtist(overrides?: Parameters<typeof artistBuilder>[0]): ZodArtist {
  return artistBuilder(overrides) as ZodArtist;
}

export function testAlbumWithCover(coverUrl: string, albumOverrides?: Partial<Album>): ZodAlbum {
  const cover = imageBuilder({ url: coverUrl });
  const album = albumBuilder({ coverId: cover.id, ...albumOverrides });
  return { ...album, cover } as ZodAlbum;
}

export function testAlbumNoCover(albumOverrides?: Partial<Album>): ZodAlbum {
  return { ...albumBuilder({ coverId: null, ...albumOverrides }), cover: null } as ZodAlbum;
}
