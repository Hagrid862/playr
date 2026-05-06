import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailAddress, EmailStatus, EmailType, Gender, Session, User } from '@repo/db';
import {
  emailAddressBuilder,
  refreshTokenBuilder,
  sessionBuilder,
  userBuilder,
} from '@repo/testing/builders';
import { PrismaServiceMock } from '@repo/testing/nestjs';
import request from 'supertest';
import { vi } from 'vitest';
import { createIntegrationApp } from './test-utils';

vi.mock('argon2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('argon2')>();
  return {
    ...actual,
    hash: vi.fn().mockResolvedValue('hashed-password'),
    verify: vi.fn().mockResolvedValue(true),
  };
});

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
      const user = userBuilder({
        ...validRegistration,
        id: 'user-123',
        username: validRegistration.username,
      });
      const email = emailAddressBuilder({
        userId: 'user-123',
        email: validRegistration.email,
        type: EmailType.primary,
        status: EmailStatus.created,
      });

      prismaMock.client.user.create.mockResolvedValue({
        ...user,
        emailAddresses: [email],
      } as User & { emailAddresses: EmailAddress[] });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegistration)
        .expect(201);

      expect(response.body.data.user.username).toBe(validRegistration.username);
      expect(response.body.data.isEmailSent).toBeDefined();
    });

    it('should return 409 if email already exists', async () => {
      const existingEmail = emailAddressBuilder({
        id: 'existing',
        email: validRegistration.email,
        userId: 'user-1',
        type: EmailType.primary,
        status: EmailStatus.verified,
        verifiedAt: new Date(),
      });
      prismaMock.client.emailAddress.findFirst.mockResolvedValue({
        ...existingEmail,
        user: userBuilder({ id: 'user-1' }),
      } as EmailAddress & { user: User });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegistration)
        .expect(409);

      expect(response.body.error.message).toBe('Email already exists');
    });

    it('should return 409 if username already exists', async () => {
      prismaMock.client.emailAddress.findFirst.mockResolvedValue(null);
      prismaMock.client.user.findUnique.mockResolvedValue(
        userBuilder({ id: 'existing', username: validRegistration.username }),
      );

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

      // nestjs-zod usually returns validation errors in a specific format.
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

  describe('POST /auth/verify-email', () => {
    const verifyData = {
      email: 'test@example.com',
      otpCode: '12345678',
    };

    it('should verify email successfully and return tokens (200)', async () => {
      const emailObj = emailAddressBuilder({
        email: verifyData.email,
        status: EmailStatus.pending,
      });
      const userObj = userBuilder({ id: emailObj.userId });

      // Mock getting email
      prismaMock.client.emailAddress.findFirst.mockResolvedValueOnce(emailObj);

      // Mock OTP verification (Redis mock)
      const redis = app.get('REDIS_CLIENT');
      redis.set.mockResolvedValueOnce('OK'); // claim lock
      redis.get.mockResolvedValueOnce('hashed-otp'); // get otp
      redis.del.mockResolvedValueOnce(1); // delete otp
      redis.eval.mockResolvedValueOnce(1); // release lock

      // Mock update
      prismaMock.client.emailAddress.update.mockResolvedValue({
        ...emailObj,
        status: EmailStatus.verified,
      });

      // Mock getting user (twice: once in repo, once in repo again but handled by Mock)
      prismaMock.client.emailAddress.findFirst.mockResolvedValueOnce({
        ...emailObj,
        user: userObj,
      } as any);

      // Mock session and refresh token creation for generateAuthTokens
      prismaMock.client.session.create.mockResolvedValue(sessionBuilder({ userId: userObj.id }));
      prismaMock.client.refreshToken.create.mockResolvedValue(refreshTokenBuilder());

      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send(verifyData)
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.id).toBe(userObj.id);
    });

    it('should return 401 for invalid OTP code', async () => {
      const emailObj = emailAddressBuilder({ email: verifyData.email });
      prismaMock.client.emailAddress.findFirst.mockResolvedValue(emailObj);

      // Mock OTP verification failure
      const redis = app.get('REDIS_CLIENT');
      redis.set.mockResolvedValueOnce('OK');
      redis.get.mockResolvedValueOnce('hashed-otp');
      redis.eval.mockResolvedValueOnce(1);

      // Argon2 verify returns false
      const argon2 = await import('argon2');
      vi.mocked(argon2.verify).mockResolvedValueOnce(false);

      await request(app.getHttpServer()).post('/auth/verify-email').send(verifyData).expect(401);
    });

    it('should return 400 if email not found', async () => {
      prismaMock.client.emailAddress.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer()).post('/auth/verify-email').send(verifyData).expect(400);
    });
  });

  describe('POST /auth/resend-email-verification-code', () => {
    const resendData = { email: 'test@example.com' };

    it('should resend verification code successfully (200)', async () => {
      const emailObj = emailAddressBuilder({
        email: resendData.email,
        status: EmailStatus.created,
      });

      prismaMock.client.emailAddress.findFirst.mockResolvedValue(emailObj);

      const response = await request(app.getHttpServer())
        .post('/auth/resend-email-verification-code')
        .send(resendData)
        .expect(200);

      expect(response.body.data.isEmailSent).toBe(true);
    });

    it('should return 400 if email is already verified', async () => {
      const emailObj = emailAddressBuilder({
        email: resendData.email,
        status: EmailStatus.verified,
      });

      prismaMock.client.emailAddress.findFirst.mockResolvedValue(emailObj);

      await request(app.getHttpServer())
        .post('/auth/resend-email-verification-code')
        .send(resendData)
        .expect(400);
    });

    it('should return 400 if email not found', async () => {
      prismaMock.client.emailAddress.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/resend-email-verification-code')
        .send(resendData)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login successfully and return tokens (200)', async () => {
      const hashedPassword = await import('argon2').then((a) => a.hash(loginData.password));
      const userBase = userBuilder({
        id: 'user-123',
        username: 'testuser',
        password: hashedPassword,
      });
      const email = emailAddressBuilder({
        id: 'email-123',
        email: loginData.email,
        userId: userBase.id,
        status: EmailStatus.verified,
        type: EmailType.primary,
        verifiedAt: new Date(),
      });

      // Mock repository response
      prismaMock.client.emailAddress.findFirst.mockResolvedValue({
        ...email,
        user: userBase,
      } as EmailAddress & { user: User });

      // Mock session creation
      prismaMock.client.session.create.mockResolvedValue({
        ...sessionBuilder({ id: 'session-123', userId: userBase.id }),
      } as Session);

      // Mock refresh token creation
      prismaMock.client.refreshToken.create.mockResolvedValue(
        refreshTokenBuilder({
          sessionId: 'session-123',
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.username).toBe(userBase.username);

      // Check refresh token cookie
      const cookies = response.get('Set-Cookie');
      expect(cookies).toBeDefined();
      expect(cookies?.some((c) => c.includes('refreshToken'))).toBe(true);
    });

    it('should return 401 for invalid password', async () => {
      prismaMock.client.emailAddress.findFirst.mockResolvedValue({
        ...emailAddressBuilder({
          email: loginData.email,
          status: EmailStatus.verified,
          userId: 'user-123',
        }),
        user: userBuilder({
          id: 'user-123',
          username: 'testuser',
        }),
      } as any);

      const argon2 = await import('argon2');
      vi.mocked(argon2.verify).mockResolvedValueOnce(false);

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
      prismaMock.client.refreshToken.findUnique.mockResolvedValue(
        refreshTokenBuilder({
          token: signedToken,
          sessionId,
        }),
      );

      prismaMock.client.session.findUnique.mockResolvedValue(
        sessionBuilder({
          id: sessionId,
          userId,
        }),
      );

      prismaMock.client.user.findUnique.mockResolvedValue(
        userBuilder({
          id: userId,
          username: 'testuser',
        }),
      );

      // Mock rotation (revoking old, creating new)
      prismaMock.client.refreshToken.update.mockResolvedValue(
        refreshTokenBuilder({
          token: signedToken,
          sessionId,
        }),
      );
      prismaMock.client.refreshToken.create.mockResolvedValue(
        refreshTokenBuilder({
          token: signedToken,
          sessionId,
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refreshToken=${signedToken}`)
        .expect(200);

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
      prismaMock.client.session.update.mockResolvedValue(
        sessionBuilder({
          id: sessionId,
          userId,
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Check cookie cleared
      const cookies = response.get('Set-Cookie');
      expect(cookies?.some((c) => c.includes('refreshToken=;'))).toBe(true);
    });
  });

  describe('POST /auth/forgot-password', () => {
    const forgotPasswordData = {
      email: 'test@example.com',
    };

    it('should send password reset email successfully (200)', async () => {
      const emailObj = emailAddressBuilder({
        email: forgotPasswordData.email,
        status: EmailStatus.verified,
      });

      prismaMock.client.emailAddress.findFirst.mockResolvedValue(emailObj);

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(forgotPasswordData)
        .expect(200);

      expect(response.body.data.isEmailSent).toBe(true);
    });

    it('should return 400 if email not found', async () => {
      prismaMock.client.emailAddress.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(forgotPasswordData)
        .expect(400);

      expect(response.body.error.message).toBe('Email not found');
    });

    it('should return 400 if email format is invalid', async () => {
      const invalidData = {
        email: 'not-an-email',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 if email is empty', async () => {
      const invalidData = {
        email: '',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /auth/recover-password', () => {
    const recoverPasswordData = {
      email: 'test@example.com',
      otpCode: '12345678',
      newPassword: 'NewPassword123!',
    };

    it('should reset password successfully (200)', async () => {
      const emailObj = emailAddressBuilder({
        email: recoverPasswordData.email,
        status: EmailStatus.verified,
      });
      const userObj = userBuilder({ id: emailObj.userId });

      // Mock getting email (first call in handler for email lookup)
      prismaMock.client.emailAddress.findFirst.mockResolvedValueOnce(emailObj);

      // Mock getting user via email (second call in handler via userRepository.getByEmail)
      prismaMock.client.emailAddress.findFirst.mockResolvedValueOnce({
        ...emailObj,
        user: userObj,
      } as any);

      // Mock OTP verification (Redis mock)
      const redis = app.get('REDIS_CLIENT');
      redis.set.mockResolvedValueOnce('OK'); // claim lock
      redis.get.mockResolvedValueOnce('hashed-otp'); // get otp
      redis.del.mockResolvedValueOnce(1); // delete otp
      redis.eval.mockResolvedValueOnce(1); // release lock

      // Mock user password update
      prismaMock.client.user.update.mockResolvedValue({
        ...userObj,
        password: 'hashed-password',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/recover-password')
        .send(recoverPasswordData)
        .expect(200);

      expect(response.body.data.success).toBe(true);
    });

    it('should return 400 if email not found', async () => {
      prismaMock.client.emailAddress.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/recover-password')
        .send(recoverPasswordData)
        .expect(400);

      expect(response.body.error.message).toBe('Email not found');
    });

    it('should return 400 for invalid OTP code', async () => {
      const emailObj = emailAddressBuilder({
        email: recoverPasswordData.email,
        status: EmailStatus.verified,
      });
      const userObj = userBuilder({ id: emailObj.userId });

      prismaMock.client.emailAddress.findFirst.mockResolvedValue({
        ...emailObj,
        user: userObj,
      } as any);

      // Mock OTP verification failure
      const redis = app.get('REDIS_CLIENT');
      redis.set.mockResolvedValueOnce('OK');
      redis.get.mockResolvedValueOnce('hashed-otp');
      redis.eval.mockResolvedValueOnce(1);

      // Argon2 verify returns false
      const argon2 = await import('argon2');
      vi.mocked(argon2.verify).mockResolvedValueOnce(false);

      const response = await request(app.getHttpServer())
        .post('/auth/recover-password')
        .send(recoverPasswordData)
        .expect(400);

      expect(response.body.error.message).toBe('Invalid or expired OTP code');
    });

    it('should return 400 if new password is too weak', async () => {
      const weakPasswordData = {
        ...recoverPasswordData,
        newPassword: 'weak',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/recover-password')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 if OTP code is missing', async () => {
      const invalidData = {
        email: recoverPasswordData.email,
        newPassword: recoverPasswordData.newPassword,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/recover-password')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
