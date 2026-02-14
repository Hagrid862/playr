import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Reflector } from '@nestjs/core';
import { AlbumRepository } from '@/shared/repositories/album.repository';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AlbumsController } from './library-albums.controller';
import { GetLibraryAlbumsQuery } from './queries/impl/get-library-albums.query';
import { CreateLibraryAlbumCommand } from './commands/impl/create-library-album.command';
import { GetLibraryAlbumQuery } from './queries/impl/get-library-album.query';
import { UpdateLibraryAlbumCommand } from './commands/impl/update-library-album.command';
import { UploadLibraryAlbumCoverCommand } from './commands/impl/upload-library-album-cover.command';
import { DeleteLibraryAlbumCommand } from './commands/impl/delete-library-album.command';

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
    await controller.deleteAlbum(mockAlbumId, mockUserId);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteLibraryAlbumCommand));
  });
});
