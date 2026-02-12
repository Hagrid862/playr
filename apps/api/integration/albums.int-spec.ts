import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { vi } from 'vitest';
import { PrismaServiceMock } from './mocks/prisma.service.mock';
import { createIntegrationApp } from './test-utils';

describe('AlbumsController (Integration)', () => {
  let app: INestApplication;
  let prismaMock: PrismaServiceMock;
  let jwtService: JwtService;
  let config: ConfigService;

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prismaMock = setup.prismaMock;
    jwtService = app.get(JwtService);
    config = app.get(ConfigService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const getAuthHeader = async (userId: string = 'user-123') => {
    const token = await jwtService.signAsync(
      { sub: userId, username: 'testuser', sessionId: 'session-123' },
      {
        secret: config.get('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );
    return `Bearer ${token}`;
  };

  const mockAlbum = {
    id: 'album-123',
    name: 'Test Album',
    description: 'Test Description',
    type: 'album',
    totalTracks: 10,
    totalDuration: 3000,
    releaseDate: new Date(),
    coverId: null,
    visibility: 'PUBLIC',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    artists: [],
    genres: [],
    tracks: [],
    access: [
      {
        userId: 'user-123',
        role: 'OWNER',
      },
    ],
  };

  describe('DELETE /albums/:id', () => {
    it('should delete an album successfully (200)', async () => {
      const authHeader = await getAuthHeader();
      const albumId = 'album-123';

      // Mock finding the album (including access check)
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum as any);

      // Mock the delete (or update for soft delete)
      prismaMock.client.album.update.mockResolvedValue({
        ...mockAlbum,
        deletedAt: new Date(),
      } as any);

      // The repository method "delete" in DeleteAlbumHandler calls "update" (soft delete now)
      // Wait, let's verify DeleteAlbumHandler implementation again.
      // Yes, I implemented soft delete via albumRepository.update().

      const response = await request(app.getHttpServer())
        .delete(`/albums/${albumId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.id).toBe(albumId);
      expect(response.body.data.deletedAt).toBeDefined();
    });

    it('should return 404 if album not found', async () => {
      const authHeader = await getAuthHeader();
      const albumId = 'non-existent';

      prismaMock.client.album.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete(`/albums/${albumId}`)
        .set('Authorization', authHeader)
        .expect(404);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).delete('/albums/album-123').expect(401);
    });
  });
});
