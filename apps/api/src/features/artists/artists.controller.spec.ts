import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodArtist, ZodImage } from '@repo/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { ArtistsController } from './artists.controller';
import { CreateArtistCommand } from './commands/impl/create-artist.command';
import { DeleteArtistCommand } from './commands/impl/delete-artist.command';
import { UpdateArtistCommand } from './commands/impl/update-artist.command';
import { UploadArtistAvatarCommand } from './commands/impl/upload-artist-avatar.command';
import { UploadArtistBannerCommand } from './commands/impl/upload-artist-banner.command';
import { CreateArtistRequestDto } from './dto/create-artist.request.dto';
import { UpdateArtistRequestDto } from './dto/update-artist.request.dto';
import { GetPrivateArtistsQuery } from './queries/impl/get-private-artists.query';

describe('ArtistsController', () => {
  let controller: ArtistsController;
  let commandBus: DeepMocked<CommandBus>;
  let queryBus: DeepMocked<QueryBus>;

  const mockUserId = 'user-123';
  const mockArtist: ZodArtist = {
    id: 'artist-123',
    name: 'Test Artist',
    description: 'Test Description',
    isCommunity: false,
    verified: false,
    avatarId: null,
    bannerId: null,
    avatar: null,
    banner: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockImage: ZodImage = {
    id: 'image-123',
    url: 'https://example.com/image.jpg',
    alt: 'image-alt',
    key: 'image-key',
    bucket: 'public',
    mimeType: 'image/jpeg',
    blurhash: null,
    reportId: null,
    uploadStatus: 'uploaded',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    commandBus = createMock<CommandBus>();
    queryBus = createMock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtistsController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    controller = module.get<ArtistsController>(ArtistsController);
  });

  describe('createArtist', () => {
    it('should execute CreateArtistCommand', async () => {
      const dto: CreateArtistRequestDto = {
        name: 'New Artist',
        description: 'New Description',
      };
      commandBus.execute.mockResolvedValue(mockArtist);

      const result = await controller.createArtist(dto, mockUserId);

      expect(commandBus.execute).toHaveBeenCalledWith(new CreateArtistCommand(dto, mockUserId));
      expect(result).toBe(mockArtist);
    });
  });

  describe('getPrivateArtists', () => {
    it('should execute GetPrivateArtistsQuery', async () => {
      const expectedResult = [mockArtist];
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getPrivateArtists(mockUserId);

      expect(queryBus.execute).toHaveBeenCalledWith(new GetPrivateArtistsQuery(mockUserId));
      expect(result).toBe(expectedResult);
    });
  });

  describe('updateArtist', () => {
    it('should execute UpdateArtistCommand', async () => {
      const artistId = 'artist-123';
      const dto: UpdateArtistRequestDto = {
        name: 'Updated Artist',
      };
      commandBus.execute.mockResolvedValue(mockArtist);

      const result = await controller.updateArtist(artistId, dto, mockUserId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateArtistCommand(artistId, dto, mockUserId),
      );
      expect(result).toBe(mockArtist);
    });
  });

  describe('deleteArtist', () => {
    it('should execute DeleteArtistCommand', async () => {
      const artistId = 'artist-123';
      commandBus.execute.mockResolvedValue(undefined);

      await controller.deleteArtist(artistId, mockUserId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new DeleteArtistCommand(artistId, mockUserId),
      );
    });
  });

  describe('uploadArtistAvatar', () => {
    it('should execute UploadArtistAvatarCommand', async () => {
      const artistId = 'artist-123';
      const file = {
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      };
      commandBus.execute.mockResolvedValue(mockImage);

      const result = await controller.uploadArtistAvatar(artistId, file as any, mockUserId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UploadArtistAvatarCommand(artistId, file.buffer, file.mimetype, mockUserId),
      );
      expect(result).toBe(mockImage);
    });
  });

  describe('uploadArtistBanner', () => {
    it('should execute UploadArtistBannerCommand', async () => {
      const artistId = 'artist-123';
      const file = {
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      };
      commandBus.execute.mockResolvedValue(mockImage);

      const result = await controller.uploadArtistBanner(artistId, file as any, mockUserId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UploadArtistBannerCommand(artistId, file.buffer, file.mimetype, mockUserId),
      );
      expect(result).toBe(mockImage);
    });
  });
});
