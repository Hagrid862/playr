import { AlbumRepository } from '@/shared/repositories/album.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
// @ts-expect-error - ignore type errors from testing package imports
import { createMockMulterFile } from '@repo/testing';
import { BulkCreateLibraryTracksCommand } from '../library-tracks/commands/impl/bulk-create-library-tracks.command';
import { BulkUploadTrackAudioCommand } from '../library-tracks/commands/impl/bulk-upload-track-audio.command';
import { CreateLibraryAlbumCommand } from './commands/impl/create-library-album.command';
import { DeleteLibraryAlbumCoverCommand } from './commands/impl/delete-library-album-cover.command';
import { DeleteLibraryAlbumCommand } from './commands/impl/delete-library-album.command';
import { UpdateLibraryAlbumCommand } from './commands/impl/update-library-album.command';
import { UploadLibraryAlbumCoverCommand } from './commands/impl/upload-library-album-cover.command';
import { AlbumsController } from './library-albums.controller';
import { GetLibraryAlbumTracksQuery } from './queries/impl/get-library-album-tracks.query';
import { GetLibraryAlbumQuery } from './queries/impl/get-library-album.query';
import { GetLibraryAlbumsQuery } from './queries/impl/get-library-albums.query';

describe('AlbumsController', () => {
  let controller: AlbumsController;
  let commandBus: DeepMocked<CommandBus>;
  let queryBus: DeepMocked<QueryBus>;

  const mockUserId = 'user-123';
  const mockAlbumId = 'album-123';

  beforeEach(async () => {
    commandBus = createMock<CommandBus>();
    queryBus = createMock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlbumsController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: AlbumRepository, useValue: createMock<AlbumRepository>() },
        { provide: Reflector, useValue: createMock<Reflector>() },
      ],
    }).compile();

    controller = module.get<AlbumsController>(AlbumsController);
  });

  it('getAlbums should execute GetLibraryAlbumsQuery', async () => {
    const queryDto = { page: 1, limit: 10 };
    await controller.getAlbums(mockUserId, queryDto);
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetLibraryAlbumsQuery));
  });

  it('createAlbum should execute CreateLibraryAlbumCommand', async () => {
    const body = {
      name: 'New Album',
      type: 'album' as const,
      artistId: 'artist-123',
      releaseDate: new Date(),
    };
    await controller.createAlbum(body, mockUserId);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateLibraryAlbumCommand));
  });

  it('getAlbum should execute GetLibraryAlbumQuery', async () => {
    await controller.getAlbum(mockAlbumId, mockUserId);
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetLibraryAlbumQuery));
  });

  it('updateAlbum should execute UpdateLibraryAlbumCommand', async () => {
    const body = { name: 'Updated name' };
    await controller.updateAlbum(mockAlbumId, body, mockUserId);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateLibraryAlbumCommand));
  });

  it('uploadCover should execute UploadLibraryAlbumCoverCommand', async () => {
    const mockFile = createMockMulterFile({ buffer: Buffer.from('test'), mimetype: 'image/png' });
    await controller.uploadCover(mockAlbumId, mockFile, mockUserId);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UploadLibraryAlbumCoverCommand));
  });

  it('deleteAlbum should execute DeleteLibraryAlbumCommand', async () => {
    await controller.deleteAlbum(mockAlbumId, mockUserId);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteLibraryAlbumCommand));
  });

  it('getAlbumTracks should execute GetLibraryAlbumTracksQuery', async () => {
    await controller.getAlbumTracks(mockAlbumId, mockUserId);
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetLibraryAlbumTracksQuery));
  });

  it('bulkCreateTracks should execute BulkCreateLibraryTracksCommand', async () => {
    const body = {
      tracks: [
        {
          title: 'Track 1',
          trackNumber: 1,
          diskNumber: 1,
          explicit: false,
          artistIds: ['artist-123'],
        },
      ],
    };

    await controller.bulkCreateTracks(mockAlbumId, body, mockUserId);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(BulkCreateLibraryTracksCommand));
  });

  it('bulkUploadTrackAudio should execute BulkUploadTrackAudioCommand with parsed trackIds', async () => {
    const trackIds = ['track-1', 'track-2'];
    const files = [createMockMulterFile({ originalname: 'file1.mp3' })];

    await controller.bulkUploadTrackAudio(mockAlbumId, JSON.stringify(trackIds), files, mockUserId);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(BulkUploadTrackAudioCommand));
  });

  it('bulkUploadTrackAudio should throw BadRequestException when trackIds is not valid JSON', async () => {
    const files: Express.Multer.File[] = [];

    await expect(
      controller.bulkUploadTrackAudio(mockAlbumId, 'not-json', files, mockUserId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('bulkUploadTrackAudio should throw BadRequestException when parsed trackIds is not an array', async () => {
    const files: Express.Multer.File[] = [];

    await expect(
      controller.bulkUploadTrackAudio(
        mockAlbumId,
        JSON.stringify({ foo: 'bar' }),
        files,
        mockUserId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('bulkUploadTrackAudio should use empty array when trackIdsRaw is undefined', async () => {
    const files: Express.Multer.File[] = [];

    // Simulates @Body('trackIds') when field is missing - NestJS passes undefined
    // @ts-expect-error - intentionally testing runtime behavior with undefined
    await controller.bulkUploadTrackAudio(mockAlbumId, undefined, files, mockUserId);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(BulkUploadTrackAudioCommand));
  });

  it('bulkUploadTrackAudio should use empty files array when files is undefined', async () => {
    // Simulates @UploadedFiles() when no files - NestJS may pass undefined
    await controller.bulkUploadTrackAudio(
      mockAlbumId,
      JSON.stringify(['track-1']),
      // @ts-expect-error - intentionally testing runtime behavior with undefined
      undefined,
      mockUserId,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(BulkUploadTrackAudioCommand));
  });

  it('deleteCover should execute DeleteLibraryAlbumCoverCommand', async () => {
    await controller.deleteCover(mockAlbumId, mockUserId);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteLibraryAlbumCoverCommand));
  });
});
