import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { InternalServerErrorException, PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// @ts-expect-error - ignore type errors from testing package imports
import { buildAlbum, buildLibrary, buildTrack } from '@repo/testing';
import { CreateLibraryTrackCommand } from '../impl/create-library-track.command';
import { CreateLibraryTrackHandler } from './create-library-track.handler';

describe('CreateLibraryTrackHandler', () => {
  let handler: CreateLibraryTrackHandler;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let albumRepository: DeepMocked<AlbumRepository>;
  let trackRepository: DeepMocked<TrackRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;

  const userId = 'user-123';
  const command = new CreateLibraryTrackCommand(
    {
      title: 'Test Track',
      albumId: 'album-123',
      trackNumber: 1,
      diskNumber: 1,
      explicit: false,
      artistIds: ['artist-123'],
    },
    userId,
  );

  const mockLibrary = buildLibrary({ id: 'library-123', userId });
  const mockAlbum = buildAlbum({
    id: 'album-123',
    name: 'Test Album',
    description: 'Test Description',
    totalTracks: 10,
    totalDuration: 3000,
  });
  const mockTrack = buildTrack({
    id: 'track-123',
    title: 'Test Track',
    albumId: 'album-123',
  });

  beforeEach(async () => {
    unitOfWork = createMock<UnitOfWorkService>();
    libraryRepository = createMock<LibraryRepository>();
    albumRepository = createMock<AlbumRepository>();
    trackRepository = createMock<TrackRepository>();
    libraryTrackRepository = createMock<LibraryTrackRepository>();

    unitOfWork.runInTransaction.mockImplementation(async (cb) => cb());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLibraryTrackHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: AlbumRepository, useValue: albumRepository },
        { provide: TrackRepository, useValue: trackRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
      ],
    }).compile();

    handler = module.get<CreateLibraryTrackHandler>(CreateLibraryTrackHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a track and link to library', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.findOne.mockResolvedValue(mockAlbum);
    trackRepository.create.mockResolvedValue(mockTrack);

    const result = await handler.execute(command);

    expect(result).toEqual(mockTrack);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(albumRepository.findOne).toHaveBeenCalledWith({ id: command.body.albumId });
    expect(trackRepository.create).toHaveBeenCalled();
    expect(libraryTrackRepository.create).toHaveBeenCalledWith({
      track: { connect: { id: mockTrack.id } },
      library: { connect: { id: mockLibrary.id } },
    });
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw PreconditionFailedException if album not found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw InternalServerErrorException if Zod validation fails', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.findOne.mockResolvedValue(mockAlbum);
    trackRepository.create.mockResolvedValue(JSON.parse('{"id":"track-123","title":123}'));

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
