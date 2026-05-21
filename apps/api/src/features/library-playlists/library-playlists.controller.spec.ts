import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AddPlaylistAlbumCommand } from './commands/impl/add-playlist-album.command';
import { AddPlaylistTrackCommand } from './commands/impl/add-playlist-track.command';
import { CreateLibraryPlaylistCommand } from './commands/impl/create-library-playlist.command';
import { DeleteLibraryPlaylistCoverCommand } from './commands/impl/delete-library-playlist-cover.command';
import { DeleteLibraryPlaylistCommand } from './commands/impl/delete-library-playlist.command';
import { RemovePlaylistTrackCommand } from './commands/impl/remove-playlist-track.command';
import { ReorderPlaylistTracksCommand } from './commands/impl/reorder-playlist-tracks.command';
import { SortPlaylistTracksCommand } from './commands/impl/sort-playlist-tracks.command';
import { UpdateLibraryPlaylistCommand } from './commands/impl/update-library-playlist.command';
import { UploadLibraryPlaylistCoverCommand } from './commands/impl/upload-library-playlist-cover.command';
import { LibraryPlaylistsController } from './library-playlists.controller';
import { GetLibraryPlaylistDetailQuery } from './queries/impl/get-library-playlist-detail.query';
import { GetLibraryPlaylistsQuery } from './queries/impl/get-library-playlists.query';

describe('LibraryPlaylistsController', () => {
  let controller: LibraryPlaylistsController;
  let commandBus: DeepMocked<CommandBus>;
  let queryBus: DeepMocked<QueryBus>;

  const mockUserId = 'user-123';
  const mockPlaylistId = 'playlist-123';

  beforeEach(async () => {
    commandBus = createMock<CommandBus>();
    queryBus = createMock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryPlaylistsController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    controller = module.get<LibraryPlaylistsController>(LibraryPlaylistsController);
  });

  describe('list', () => {
    it('should execute GetLibraryPlaylistsQuery and return the result', async () => {
      const mockResult = [{ id: 'playlist-1' }] as any;
      queryBus.execute.mockResolvedValue(mockResult);

      const result = await controller.list(mockUserId);

      expect(queryBus.execute).toHaveBeenCalledWith(new GetLibraryPlaylistsQuery(mockUserId));
      expect(result).toBe(mockResult);
    });
  });

  describe('create', () => {
    it('should execute CreateLibraryPlaylistCommand and return the result', async () => {
      const body = { name: 'New Playlist' };
      const mockResult = { id: 'playlist-1' } as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.create(mockUserId, body);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateLibraryPlaylistCommand(body, mockUserId),
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('uploadCover', () => {
    it('should execute UploadLibraryPlaylistCoverCommand and return the result', async () => {
      const file = {
        fieldname: 'file',
        originalname: 'cover.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test-buffer'),
        size: 11,
      } as Express.Multer.File;

      const mockResult = { id: 'image-1', url: 'http://bucket/cover.jpg' } as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.uploadCover(mockPlaylistId, file, mockUserId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UploadLibraryPlaylistCoverCommand(
          mockPlaylistId,
          file.buffer,
          file.mimetype,
          mockUserId,
        ),
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('removeCover', () => {
    it('should execute DeleteLibraryPlaylistCoverCommand and return the result', async () => {
      const mockResult = { id: mockPlaylistId } as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.removeCover(mockUserId, mockPlaylistId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new DeleteLibraryPlaylistCoverCommand(mockPlaylistId, mockUserId),
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('detail', () => {
    it('should execute GetLibraryPlaylistDetailQuery and return the result', async () => {
      const query = { page: 1, limit: 10, sort: 'name' } as any;
      const mockResult = { id: mockPlaylistId, tracks: [] } as any;
      queryBus.execute.mockResolvedValue(mockResult);

      const result = await controller.detail(mockUserId, mockPlaylistId, query);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetLibraryPlaylistDetailQuery(
          mockUserId,
          mockPlaylistId,
          query.page,
          query.limit,
          query.sort,
        ),
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('update', () => {
    it('should execute UpdateLibraryPlaylistCommand and return the result', async () => {
      const body = { name: 'Updated Name' };
      const mockResult = { id: mockPlaylistId, name: 'Updated Name' } as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.update(mockUserId, mockPlaylistId, body);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateLibraryPlaylistCommand(mockPlaylistId, body, mockUserId),
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('remove', () => {
    it('should execute DeleteLibraryPlaylistCommand and return the result', async () => {
      const mockResult = { id: mockPlaylistId } as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.remove(mockUserId, mockPlaylistId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new DeleteLibraryPlaylistCommand(mockPlaylistId, mockUserId),
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('addAlbum', () => {
    it('should execute AddPlaylistAlbumCommand and return the result', async () => {
      const body = { albumId: 'album-123' };
      const mockResult = { ok: true } as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.addAlbum(mockUserId, mockPlaylistId, body);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new AddPlaylistAlbumCommand(mockPlaylistId, body, mockUserId),
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('addTrack', () => {
    it('should execute AddPlaylistTrackCommand and return the result', async () => {
      const body = { trackId: 'track-123' };
      const mockResult = { id: 'playlist-track-123' } as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.addTrack(mockUserId, mockPlaylistId, body);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new AddPlaylistTrackCommand(mockPlaylistId, body, mockUserId),
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('sortTracks', () => {
    it('should execute SortPlaylistTracksCommand and return the result', async () => {
      const body = { direction: 'asc' } as any;
      const mockResult = { ok: true } as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.sortTracks(mockUserId, mockPlaylistId, body);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new SortPlaylistTracksCommand(mockPlaylistId, body, mockUserId),
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('reorderTracks', () => {
    it('should execute ReorderPlaylistTracksCommand and return the result', async () => {
      const body = { orderedTrackIds: ['track-2', 'track-1'] };
      const mockResult = [{ id: 'track-2', order: 0 }] as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.reorderTracks(mockUserId, mockPlaylistId, body);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new ReorderPlaylistTracksCommand(mockPlaylistId, body, mockUserId),
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('removeTrack', () => {
    it('should execute RemovePlaylistTrackCommand and return the result', async () => {
      const trackId = 'track-123';
      const mockResult = { ok: true } as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.removeTrack(mockUserId, mockPlaylistId, trackId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new RemovePlaylistTrackCommand(mockPlaylistId, trackId, mockUserId),
      );
      expect(result).toBe(mockResult);
    });
  });
});
