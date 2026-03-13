import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailAddress, EmailStatus, EmailType, Gender, User } from '@repo/db';
// @ts-expect-error - ignore type errors from testing package imports
import { PrismaServiceMock } from '@repo/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { createIntegrationApp } from './test-utils';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let prismaMock: PrismaServiceMock;

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prismaMock = setup.prismaMock;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    const validRegistration = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      birthDate: '1990-01-01',
      gender: Gender.male,
    };

    it('should register a new user successfully (201)', async () => {
      // Mock repository checks (no existing user/email)
      prismaMock.client.user.findUnique.mockResolvedValue(null);
      prismaMock.client.emailAddress.findFirst.mockResolvedValue(null);

      // Mock successful creation
      prismaMock.client.user.create.mockResolvedValue({
        id: 'user-123',
        ...validRegistration,
        birthDate: '1990-01-01',
        description: null,
        avatarId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as User);

      prismaMock.client.emailAddress.create.mockResolvedValue({
        id: 'email-123',
        email: validRegistration.email,
        userId: 'user-123',
        type: EmailType.primary,
        status: EmailStatus.verified,
        createdAt: new Date(),
        updatedAt: new Date(),
        verifiedAt: new Date(),
        deletedAt: null,
      } as EmailAddress);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegistration)
        .expect(201);

      expect(response.body.data.username).toBe(validRegistration.username);
    });

    it('should return 409 if email already exists', async () => {
      // Mock repository check finding an existing email
      // Note: GetByEmail uses prisma.emailAddress.findFirst
      prismaMock.client.emailAddress.findFirst.mockResolvedValue({
        id: 'existing',
        email: validRegistration.email,
        userId: 'user-1',
        type: EmailType.primary,
        status: EmailStatus.verified,
        createdAt: new Date(),
        updatedAt: new Date(),
        verifiedAt: new Date(),
        deletedAt: null,
        user: { id: 'user-1' } as User,
      } as EmailAddress & { user: User });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegistration)
        .expect(409);

      expect(response.body.error.message).toBe('Email already exists');
    });

    it('should return 409 if username already exists', async () => {
      // Mock repository check (email ok, username taken)
      // Note: GetByUsername uses prisma.user.findUnique
      prismaMock.client.emailAddress.findFirst.mockResolvedValue(null);
      prismaMock.client.user.findUnique.mockResolvedValue({
        id: 'existing',
        username: validRegistration.username,
        password: 'hashed',
        firstName: 'Existing',
        lastName: 'User',
        birthDate: '1990-01-01',
        gender: Gender.male,
        description: null,
        avatarId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as User);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegistration)
        .expect(409);

      expect(response.body.error.message).toBe('Username already exists');
    });

    it('should return 400 if validation fails (e.g., weak password)', async () => {
      const invalidRegistration = {
        ...validRegistration,
        password: 'weak',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidRegistration)
        .expect(400);

      // nestjs-zod usually returns validation errors in a specific format
      // We check if the response has an error property
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 if email format is invalid', async () => {
      const invalidRegistration = {
        ...validRegistration,
        email: 'not-an-email',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidRegistration)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login successfully and return tokens (200)', async () => {
      const { ...userBase } = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        birthDate: '1990-01-01',
        gender: Gender.male,
        description: null,
        avatarId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const hashedPassword = await import('argon2').then((a) => a.hash(loginData.password));

      // Mock repository response
      prismaMock.client.emailAddress.findFirst.mockResolvedValue({
        id: 'email-123',
        email: loginData.email,
        userId: 'user-123',
        status: EmailStatus.verified,
        type: EmailType.primary,
        user: {
          ...userBase,
          password: hashedPassword,
        },
      } as any);

      // Mock session creation
      prismaMock.client.session.create.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        revokedAt: null,
      } as any);

      // Mock refresh token creation
      prismaMock.client.refreshToken.create.mockResolvedValue({} as any);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(201); // Controller login method actually returns 201 by default unless @HttpCode is used

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.username).toBe(userBase.username);

      // Check refresh token cookie
      const cookies = response.get('Set-Cookie');
      expect(cookies).toBeDefined();
      expect(cookies?.some((c) => c.includes('refreshToken'))).toBe(true);
    });

    it('should return 401 for invalid password', async () => {
      const hashedPassword = await import('argon2').then((a) => a.hash('different-password'));

      prismaMock.client.emailAddress.findFirst.mockResolvedValue({
        email: loginData.email,
        status: EmailStatus.verified,
        user: {
          password: hashedPassword,
        },
      } as any);

      await request(app.getHttpServer()).post('/auth/login').send(loginData).expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens successfully (200)', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';

      // Mock JWT verify for refresh token
      const jwtService = app.get(JwtService);
      const config = app.get(ConfigService);
      const signedToken = await jwtService.signAsync(
        { sub: userId, username: 'testuser', sessionId },
        {
          secret: config.get('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      );

      // Mock database checks
      prismaMock.client.refreshToken.findUnique.mockResolvedValue({
        token: signedToken,
        sessionId,
        revokedAt: null,
        deletedAt: null,
        session: {
          id: sessionId,
          userId,
          revokedAt: null,
          deletedAt: null,
        },
      } as any);

      prismaMock.client.session.findUnique.mockResolvedValue({
        id: sessionId,
        userId,
        revokedAt: null,
        deletedAt: null,
      } as any);

      prismaMock.client.user.findUnique.mockResolvedValue({
        id: userId,
        username: 'testuser',
      } as any);

      // Mock rotation (revoking old, creating new)
      prismaMock.client.refreshToken.update.mockResolvedValue({} as any);
      prismaMock.client.refreshToken.create.mockResolvedValue({} as any);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refreshToken=${signedToken}`)
        .expect(201);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeUndefined();

      const cookies = response.get('Set-Cookie');
      expect(cookies?.some((c) => c.includes('refreshToken'))).toBe(true);
    });

    it('should return 401 if refresh token is missing', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully (204)', async () => {
      const userId = 'user-123';
      const sessionId = 'session-123';

      // Need a valid Access Token to hit logout (it's guarded by JwtAuthGuard)
      const jwtService = app.get(JwtService);
      const config = app.get(ConfigService);
      const accessToken = await jwtService.signAsync(
        { sub: userId, username: 'testuser', sessionId },
        {
          secret: config.get('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        },
      );

      // Mock session revocation
      prismaMock.client.session.update.mockResolvedValue({} as any);

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Check cookie cleared
      const cookies = response.get('Set-Cookie');
      expect(cookies?.some((c) => c.includes('refreshToken=;'))).toBe(true);
    });
  });
});
