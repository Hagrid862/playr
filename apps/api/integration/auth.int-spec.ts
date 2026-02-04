import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createIntegrationApp } from './test-utils';
import { PrismaServiceMock } from './mocks/prisma.service.mock';
import { Gender, User, EmailAddress, EmailType, EmailStatus } from '@repo/db';
import { vi } from 'vitest';

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
});
