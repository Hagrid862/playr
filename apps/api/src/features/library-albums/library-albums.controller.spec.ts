import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Reflector } from '@nestjs/core';
import { BadRequestException } from '@nestjs/common';
import { AlbumRepository } from '@/shared/repositories/album.repository';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumsController } from './library-albums.controller';
import { GetLibraryAlbumsQuery } from './queries/impl/get-library-albums.query';
import { CreateLibraryAlbumCommand } from './commands/impl/create-library-album.command';
import { GetLibraryAlbumQuery } from './queries/impl/get-library-album.query';
import { UpdateLibraryAlbumCommand } from './commands/impl/update-library-album.command';
import { UploadLibraryAlbumCoverCommand } from './commands/impl/upload-library-album-cover.command';
import { DeleteLibraryAlbumCommand } from './commands/impl/delete-library-album.command';
import { GetLibraryAlbumTracksQuery } from './queries/impl/get-library-album-tracks.query';
import { BulkCreateLibraryTracksCommand } from '../library-tracks/commands/impl/bulk-create-library-tracks.command';
import { BulkUploadTrackAudioCommand } from '../library-tracks/commands/impl/bulk-upload-track-audio.command';
import { DeleteLibraryAlbumCoverCommand } from './commands/impl/delete-library-album-cover.command';

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
    await controller.getAlbums(mockUserId, queryDto as any);
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetLibraryAlbumsQuery));
  });

  it('createAlbum should execute CreateLibraryAlbumCommand', async () => {
    const body = { name: 'New Album' };
    await controller.createAlbum(body as any, mockUserId);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateLibraryAlbumCommand));
  });

  it('getAlbum should execute GetLibraryAlbumQuery', async () => {
    await controller.getAlbum(mockAlbumId, mockUserId);
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetLibraryAlbumQuery));
  });

  it('updateAlbum should execute UpdateLibraryAlbumCommand', async () => {
    const body = { name: 'Updated name' };
    await controller.updateAlbum(mockAlbumId, body as any, mockUserId);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateLibraryAlbumCommand));
  });

  it('uploadCover should execute UploadLibraryAlbumCoverCommand', async () => {
    const mockFile = {
      buffer: Buffer.from('test'),
      mimetype: 'image/png',
    } as Express.Multer.File;
    await controller.uploadCover(mockAlbumId, mockFile, mockUserId);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UploadLibraryAlbumCoverCommand));
  });

  it('deleteAlbum should execute DeleteLibraryAlbumCommand', async () => {
    await controller.deleteAlbum(mockAlbumId, { keepTracks: false } as any, mockUserId);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteLibraryAlbumCommand));
    const cmd = vi.mocked(commandBus.execute).mock.calls[0][0] as DeleteLibraryAlbumCommand;
    expect(cmd.keepTracks).toBe(false);
  });

  it('getAlbumTracks should execute GetLibraryAlbumTracksQuery', async () => {
    await controller.getAlbumTracks(mockAlbumId, mockUserId);
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetLibraryAlbumTracksQuery));
  });

  it('bulkCreateTracks should execute BulkCreateLibraryTracksCommand', async () => {
    const body = { tracks: [{ title: 'Track 1' }] };

    await controller.bulkCreateTracks(mockAlbumId, body as any, mockUserId);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(BulkCreateLibraryTracksCommand));
  });

  it('bulkUploadTrackAudio should execute BulkUploadTrackAudioCommand with parsed trackIds', async () => {
    const trackIds = ['track-1', 'track-2'];
    const files = [
      {
        originalname: 'file1.mp3',
      } as Express.Multer.File,
    ];

    await controller.bulkUploadTrackAudio(mockAlbumId, JSON.stringify(trackIds), files, mockUserId);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(BulkUploadTrackAudioCommand));
  });

  it('bulkUploadTrackAudio should throw BadRequestException when trackIds is not valid JSON', async () => {
    const files = [] as Express.Multer.File[];

    await expect(
      controller.bulkUploadTrackAudio(mockAlbumId, 'not-json', files, mockUserId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('bulkUploadTrackAudio should throw BadRequestException when parsed trackIds is not an array', async () => {
    const files = [] as Express.Multer.File[];

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
    const files = [] as Express.Multer.File[];

    await controller.bulkUploadTrackAudio(
      mockAlbumId,
      undefined as unknown as string,
      files,
      mockUserId,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(BulkUploadTrackAudioCommand));
  });

  it('bulkUploadTrackAudio should use empty files array when files is undefined', async () => {
    await controller.bulkUploadTrackAudio(
      mockAlbumId,
      JSON.stringify(['track-1']),
      undefined as unknown as Express.Multer.File[],
      mockUserId,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(BulkUploadTrackAudioCommand));
  });

  it('deleteCover should execute DeleteLibraryAlbumCoverCommand', async () => {
    await controller.deleteCover(mockAlbumId, mockUserId);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteLibraryAlbumCoverCommand));
  });
});
