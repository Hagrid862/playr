import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
// @ts-expect-error - ignore type errors from testing package imports
import { createMockMulterFile } from '@repo/testing';
import { CreateLibraryArtistCommand } from './commands/impl/create-library-artist.command';
import { DeleteLibraryArtistCommand } from './commands/impl/delete-library-artist.command';
import { UpdateLibraryArtistCommand } from './commands/impl/update-library-artist.command';
import { UploadLibraryArtistAvatarCommand } from './commands/impl/upload-library-artist-avatar.command';
import { UploadLibraryArtistBannerCommand } from './commands/impl/upload-library-artist-banner.command';
import { LibraryArtistsController } from './library-artists.controller';
import { GetLibraryArtistAlbumsQuery } from './queries/impl/get-library-artist-albums.query';
import { GetLibraryArtistQuery } from './queries/impl/get-library-artist.query';
import { GetLibraryArtistsQuery } from './queries/impl/get-library-artists.query';

describe('LibraryArtistsController', () => {
  let controller: LibraryArtistsController;
  let commandBus: DeepMocked<CommandBus>;
  let queryBus: DeepMocked<QueryBus>;

  beforeEach(async () => {
    commandBus = createMock<CommandBus>();
    queryBus = createMock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryArtistsController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    controller = module.get<LibraryArtistsController>(LibraryArtistsController);
  });

  describe('createArtist', () => {
    it('should execute CreateArtistCommand with correct parameters', async () => {
      const userId = 'user-123';
      const request = { name: 'New Artist' };
      const expectedResult = { id: 'artist-123', ...request };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.createArtist(request, userId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateLibraryArtistCommand(request, userId),
      );
      expect(result).toBe(expectedResult);
    });
  });

  describe('getLibraryArtists', () => {
    it('should execute GetLibraryArtistsQuery with correct parameters', async () => {
      const userId = 'user-123';
      const query = { page: 1, limit: 10 };
      const expectedResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getLibraryArtists(userId, query);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetLibraryArtistsQuery(userId, query.page, query.limit),
      );
      expect(result).toBe(expectedResult);
    });
  });

  describe('getLibraryArtist', () => {
    it('should execute GetLibraryArtistQuery with correct parameters', async () => {
      const userId = 'user-123';
      const artistId = 'artist-123';
      const expectedResult = { id: artistId, name: 'Test Artist' };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getLibraryArtist(userId, artistId);

      expect(queryBus.execute).toHaveBeenCalledWith(new GetLibraryArtistQuery(userId, artistId));
      expect(result).toBe(expectedResult);
    });
  });

  describe('updateArtist', () => {
    it('should execute UpdateArtistCommand with correct parameters', async () => {
      const userId = 'user-123';
      const artistId = 'artist-123';
      const request = { name: 'Updated Artist' };
      const expectedResult = { id: artistId, ...request };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.updateArtist(artistId, request, userId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateLibraryArtistCommand(artistId, request, userId),
      );
      expect(result).toBe(expectedResult);
    });
  });

  describe('deleteArtist', () => {
    it('should execute DeleteArtistCommand with correct parameters', async () => {
      const userId = 'user-123';
      const artistId = 'artist-123';
      commandBus.execute.mockResolvedValue(undefined);

      await controller.deleteArtist(artistId, userId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new DeleteLibraryArtistCommand(artistId, userId),
      );
    });
  });

  describe('getLibraryArtistAlbums', () => {
    it('should execute GetLibraryArtistAlbumsQuery with correct parameters', async () => {
      const userId = 'user-123';
      const artistId = 'artist-123';
      const query = { page: 1, limit: 10, type: 'album' as const };
      const expectedResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getLibraryArtistAlbums(userId, artistId, query);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetLibraryArtistAlbumsQuery(userId, artistId, query.page, query.limit, query.type),
      );
      expect(result).toBe(expectedResult);
    });
  });

  describe('uploadArtistAvatar', () => {
    it('should execute UploadLibraryArtistAvatarCommand with correct parameters', async () => {
      const userId = 'user-123';
      const artistId = 'artist-123';
      const file = createMockMulterFile({ buffer: Buffer.from('test'), mimetype: 'image/jpeg' });
      const expectedResult = { id: 'image-123', url: 'http://test.com/avatar.jpg' };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.uploadArtistAvatar(artistId, file, userId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UploadLibraryArtistAvatarCommand(artistId, file.buffer, file.mimetype, userId),
      );
      expect(result).toBe(expectedResult);
    });
  });

  describe('uploadArtistBanner', () => {
    it('should execute UploadLibraryArtistBannerCommand with correct parameters', async () => {
      const userId = 'user-123';
      const artistId = 'artist-123';
      const file = createMockMulterFile({ buffer: Buffer.from('test'), mimetype: 'image/jpeg' });
      const expectedResult = { id: 'image-123', url: 'http://test.com/banner.jpg' };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.uploadArtistBanner(artistId, file, userId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UploadLibraryArtistBannerCommand(artistId, file.buffer, file.mimetype, userId),
      );
      expect(result).toBe(expectedResult);
    });
  });
});
