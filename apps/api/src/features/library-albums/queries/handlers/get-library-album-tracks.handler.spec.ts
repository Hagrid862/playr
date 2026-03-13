import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// @ts-expect-error - ignore type errors from testing package imports
import { buildLibrary, buildLibraryTrack, buildTrack } from '@repo/testing';
import { GetLibraryAlbumTracksQuery } from '../impl/get-library-album-tracks.query';
import { GetLibraryAlbumTracksHandler } from './get-library-album-tracks.handler';

describe('GetLibraryAlbumTracksHandler', () => {
  let handler: GetLibraryAlbumTracksHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;

  const userId = 'user-123';
  const albumId = 'album-123';
  const query = new GetLibraryAlbumTracksQuery(userId, albumId);

  const mockLibrary = buildLibrary({ id: 'library-123', userId });
  const mockTrack = buildTrack({
    id: 'track-123',
    title: 'Test Track',
    albumId,
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
  });
  const mockLibraryTrack = buildLibraryTrack({
    id: 'lib-track-123',
    libraryId: mockLibrary.id,
    trackId: mockTrack.id,
    track: mockTrack,
  });

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    libraryTrackRepository = createMock<LibraryTrackRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryAlbumTracksHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
      ],
    }).compile();

    handler = module.get<GetLibraryAlbumTracksHandler>(GetLibraryAlbumTracksHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return album tracks for a user library', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    libraryTrackRepository.findMany.mockResolvedValue([mockLibraryTrack]);
    libraryTrackRepository.count.mockResolvedValue(1);

    const result = await handler.execute(query);

    expect(result).toEqual([mockTrack]);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryTrackRepository.findMany).toHaveBeenCalledWith({
      where: {
        libraryId: mockLibrary.id,
        track: { albumId },
      },
      orderBy: [{ track: { diskNumber: 'asc' } }, { track: { trackNumber: 'asc' } }],
    });
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
  });
});
