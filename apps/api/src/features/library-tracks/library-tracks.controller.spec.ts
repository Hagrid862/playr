import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Reflector } from '@nestjs/core';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryTracksController } from './library-tracks.controller';
import { CreateLibraryTrackCommand } from './commands/impl/create-library-track.command';
import { DeleteLibraryTrackCommand } from './commands/impl/delete-library-track.command';
import { UpdateLibraryTrackCommand } from './commands/impl/update-library-track.command';
import { GetLibraryTrackQuery } from './queries/impl/get-library-track.query';
import { GetLibraryTracksQuery } from './queries/impl/get-library-tracks.query';

describe('LibraryTracksController', () => {
  let controller: LibraryTracksController;
  let commandBus: DeepMocked<CommandBus>;
  let queryBus: DeepMocked<QueryBus>;

  const userId = 'user-123';
  const trackId = 'track-123';

  beforeEach(async () => {
    commandBus = createMock<CommandBus>();
    queryBus = createMock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryTracksController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: Reflector, useValue: createMock<Reflector>() },
        { provide: TrackRepository, useValue: createMock<TrackRepository>() },
      ],
    }).compile();

    controller = module.get<LibraryTracksController>(LibraryTracksController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getTracks', () => {
    it('should return list of tracks', async () => {
      const query = { page: 1, limit: 10 };
      const expectedResult = { items: [], total: 0 };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getTracks(userId, query);

      expect(result).toBe(expectedResult);
      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetLibraryTracksQuery(userId, query.page, query.limit, undefined),
      );
    });

    it('should pass albumId if provided', async () => {
      const query = { page: 1, limit: 10, albumId: 'album-123' };

      await controller.getTracks(userId, query);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetLibraryTracksQuery(userId, query.page, query.limit, 'album-123'),
      );
    });
  });

  describe('createTrack', () => {
    it('should create a track', async () => {
      const body = { title: 'New Track', albumId: 'album-123', artistIds: ['artist-123'] } as any;
      const expectedResult = { id: trackId, title: 'New Track' };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.createTrack(body, userId);

      expect(result).toBe(expectedResult);
      expect(commandBus.execute).toHaveBeenCalledWith(new CreateLibraryTrackCommand(body, userId));
    });
  });

  describe('getTrack', () => {
    it('should return a track', async () => {
      const expectedResult = { id: trackId };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getTrack(trackId, userId);

      expect(result).toBe(expectedResult);
      expect(queryBus.execute).toHaveBeenCalledWith(new GetLibraryTrackQuery(trackId, userId));
    });
  });

  describe('updateTrack', () => {
    it('should update a track', async () => {
      const body = { title: 'Updated' };
      const expectedResult = { id: trackId, title: 'Updated' };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.updateTrack(trackId, body, userId);

      expect(result).toBe(expectedResult);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateLibraryTrackCommand(trackId, body, userId),
      );
    });
  });

  describe('deleteTrack', () => {
    it('should delete a track', async () => {
      const expectedResult = { success: true };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.deleteTrack(trackId, userId);

      expect(result).toBe(expectedResult);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new DeleteLibraryTrackCommand(trackId, userId),
      );
    });
  });
});
