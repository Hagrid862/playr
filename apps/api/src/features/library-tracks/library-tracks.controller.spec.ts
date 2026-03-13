import { TrackRepository } from '@/shared/repositories/track.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { StreamAudioQuality } from '@repo/contracts';
import type { Response } from 'express';
// @ts-expect-error - ignore type errors from testing package imports
import { createMockMulterFile } from '@repo/testing';
import { CreateLibraryTrackCommand } from './commands/impl/create-library-track.command';
import { DeleteLibraryTrackCommand } from './commands/impl/delete-library-track.command';
import { UpdateLibraryTrackCommand } from './commands/impl/update-library-track.command';
import { UploadTrackAudioCommand } from './commands/impl/upload-track-audio.command';
import { LibraryTracksController } from './library-tracks.controller';
import { GetLibraryTrackQuery } from './queries/impl/get-library-track.query';
import { GetLibraryTracksQuery } from './queries/impl/get-library-tracks.query';
import { GetTrackStreamQualitiesQuery } from './queries/impl/get-track-stream-qualities.query';
import { GetTrackStreamQuery } from './queries/impl/get-track-stream.query';

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
      const body = {
        title: 'New Track',
        albumId: 'album-123',
        artistIds: ['artist-123'],
        trackNumber: 1,
        diskNumber: 1,
        explicit: false,
      };
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

  describe('getTrackQualities', () => {
    it('should query track qualities', async () => {
      queryBus.execute.mockResolvedValue(['high']);
      const result = await controller.getTrackQualities(trackId);
      expect(queryBus.execute).toHaveBeenCalledWith(new GetTrackStreamQualitiesQuery(trackId));
      expect(result).toEqual(['high']);
    });
  });

  describe('uploadAudio', () => {
    it('should dispatch upload audio command', async () => {
      const file = createMockMulterFile({ originalname: 'test.mp3' });
      commandBus.execute.mockResolvedValue('success');
      const result = await controller.uploadAudio(trackId, userId, file);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new UploadTrackAudioCommand(trackId, userId, file),
      );
      expect(result).toBe('success');
    });
  });

  describe('getTrackStream', () => {
    it('should stream track with partial content', async () => {
      const mockRes = createMock<Response>({
        status: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        end: vi.fn(),
      });
      const mockStream = { pipe: vi.fn() };

      queryBus.execute.mockResolvedValue({
        stream: mockStream,
        metadata: {
          start: 0,
          end: 100,
          totalSize: 1000,
          mimeType: 'audio/mpeg',
          quality: 'standard',
          format: 'mp3',
          isPartial: true,
        },
      });

      await controller.getTrackStream(trackId, 'bytes=0-100', StreamAudioQuality.standard, mockRes);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetTrackStreamQuery(trackId, StreamAudioQuality.standard, 'bytes=0-100'),
      );
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.PARTIAL_CONTENT);
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Range': 'bytes 0-100/1000' }),
      );
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
    });

    it('should stream track with OK status if not partial', async () => {
      const mockRes = createMock<Response>({
        status: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        end: vi.fn(),
      });
      const mockStream = { pipe: vi.fn() };

      queryBus.execute.mockResolvedValue({
        stream: mockStream,
        metadata: {
          start: 0,
          end: 999,
          totalSize: 1000,
          mimeType: 'audio/mpeg',
          quality: 'standard',
          format: 'mp3',
          isPartial: false,
        },
      });

      await controller.getTrackStream(trackId, '', StreamAudioQuality.standard, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
    });

    it('should handle Requested range not satisfiable', async () => {
      const mockRes = createMock<Response>({
        status: vi.fn().mockReturnThis(),
        header: vi.fn().mockReturnThis(),
        end: vi.fn(),
      });

      queryBus.execute.mockRejectedValue(new Error('Requested range not satisfiable'));

      await controller.getTrackStream(trackId, 'bytes=1000-', StreamAudioQuality.standard, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
      expect(mockRes.header).toHaveBeenCalledWith({ 'Content-Range': 'bytes */*' });
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should throw other errors', async () => {
      const mockRes = createMock<Response>();
      queryBus.execute.mockRejectedValue(new Error('Other error'));

      await expect(
        controller.getTrackStream(trackId, '', StreamAudioQuality.standard, mockRes),
      ).rejects.toThrow('Other error');
    });
  });
});
