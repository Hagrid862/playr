import { Test, TestingModule } from '@nestjs/testing';
import { Gender } from '@repo/db';
import { userBuilder, emailAddressBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenService } from '../../services/token.service';
import { EmailAuthService } from '../../services/email-auth.service';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import { LoginCommand } from '../impl/login.command';
import { LoginHandler } from './login.handler';

describe('LoginHandler', () => {
  let handler: LoginHandler;
  let tokenService: DeepMocked<TokenService>;
  let emailAuthService: DeepMocked<EmailAuthService>;
  let emailAddressRepository: DeepMocked<EmailAddressRepository>;

  const mockUser = userBuilder({
    id: 'user-id-123',
    username: 'testuser',
    password: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '2000-01-01',
    gender: Gender.male,
  });

  const mockEmailAddress = emailAddressBuilder({
    id: 'email-id-123',
    email: 'test@example.com',
    userId: 'user-id-123',
  });

  beforeEach(async () => {
    tokenService = createMock<TokenService>();
    emailAuthService = createMock<EmailAuthService>();
    emailAddressRepository = createMock<EmailAddressRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginHandler,
        { provide: TokenService, useValue: tokenService },
        { provide: EmailAuthService, useValue: emailAuthService },
        { provide: EmailAddressRepository, useValue: emailAddressRepository },
      ],
    }).compile();

    handler = module.get<LoginHandler>(LoginHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return unauthenticated outcome when email is not verified', async () => {
      // Arrange
      emailAddressRepository.getPrimaryByUserId.mockResolvedValue(mockEmailAddress);
      emailAuthService.beginOtpVerificationViaEmail.mockResolvedValue(true);

      const command = new LoginCommand(mockUser, false);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(emailAddressRepository.getPrimaryByUserId).toHaveBeenCalledWith(mockUser.id);
      expect(emailAuthService.beginOtpVerificationViaEmail).toHaveBeenCalledWith(
        mockEmailAddress,
        'emailVerification',
      );
      expect(tokenService.generateAuthTokens).not.toHaveBeenCalled();
      expect(result).toEqual({
        outcome: 'unauthenticated',
        user: expect.any(Object),
        isEmailSent: true,
      });
    });

    it('should return authenticated outcome with tokens when email is verified', async () => {
      // Arrange
      emailAddressRepository.getPrimaryByUserId.mockResolvedValue(mockEmailAddress);
      tokenService.generateAuthTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const command = new LoginCommand(mockUser, true);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(emailAddressRepository.getPrimaryByUserId).toHaveBeenCalledWith(mockUser.id);
      expect(tokenService.generateAuthTokens).toHaveBeenCalledWith(mockUser.id, mockUser.username);
      expect(result).toEqual({
        outcome: 'authenticated',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: expect.any(Object),
      });
    });

    it('should throw error if token generation fails', async () => {
      // Arrange
      emailAddressRepository.getPrimaryByUserId.mockResolvedValue(mockEmailAddress);
      tokenService.generateAuthTokens.mockRejectedValue(new Error('Token generation error'));

      const command = new LoginCommand(mockUser, true);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Token generation error');
    });

    it('should handle user with minimal fields when email not verified', async () => {
      // Arrange
      const minimalUser = userBuilder({
        ...mockUser,
        lastName: null,
        birthDate: null,
        gender: null,
        description: null,
        avatarId: null,
      });

      emailAddressRepository.getPrimaryByUserId.mockResolvedValue(mockEmailAddress);
      emailAuthService.beginOtpVerificationViaEmail.mockResolvedValue(false);

      const command = new LoginCommand(minimalUser, false);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.user.lastName).toBeNull();
      expect(result.user.birthDate).toBeNull();
      expect(result.outcome).toBe('unauthenticated');
    });

    it('should throw error if primary email is not found', async () => {
      // Arrange
      emailAddressRepository.getPrimaryByUserId.mockResolvedValue(null);
      const command = new LoginCommand(mockUser, true);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('User has no primary email address');
    });
  });
});
