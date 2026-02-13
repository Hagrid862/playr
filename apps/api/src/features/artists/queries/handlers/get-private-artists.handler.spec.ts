import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodArtist } from '@repo/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { GetPrivateArtistsQuery } from '../impl/get-private-artists.query';
import { GetPrivateArtistsHandler } from './get-private-artists.handler';

describe('GetPrivateArtistsHandler', () => {
  let handler: GetPrivateArtistsHandler;
  let artistRepository: DeepMocked<ArtistRepository>;

  const mockUserId = 'user-123';
  const mockArtists: ZodArtist[] = [
    {
      id: 'artist-1',
      name: 'Artist One',
      description: 'Desc One',
      isCommunity: false,
      verified: false,
      avatarId: null,
      bannerId: null,
      avatar: null,
      banner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: 'artist-2',
      name: 'Artist Two',
      description: 'Desc Two',
      isCommunity: false,
      verified: false,
      avatarId: null,
      bannerId: null,
      avatar: null,
      banner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  beforeEach(async () => {
    artistRepository = createMock<ArtistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPrivateArtistsHandler,
        { provide: ArtistRepository, useValue: artistRepository },
      ],
    }).compile();

    handler = module.get<GetPrivateArtistsHandler>(GetPrivateArtistsHandler);
  });

  it('should return private artists for the user', async () => {
    const query = new GetPrivateArtistsQuery(mockUserId);
    artistRepository.getPrivateByUserId.mockResolvedValue(mockArtists as any);

    const result = await handler.execute(query);

    expect(result).toEqual(mockArtists);
    expect(artistRepository.getPrivateByUserId).toHaveBeenCalledWith(mockUserId);
  });

  it('should return empty array if no artists found', async () => {
    const query = new GetPrivateArtistsQuery(mockUserId);
    artistRepository.getPrivateByUserId.mockResolvedValue([]);

    const result = await handler.execute(query);

    expect(result).toEqual([]);
    expect(artistRepository.getPrivateByUserId).toHaveBeenCalledWith(mockUserId);
  });
});
