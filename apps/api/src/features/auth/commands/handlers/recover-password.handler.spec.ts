import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { emailAddressBuilder, userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OtpCodeService } from '@/features/auth/services/otp-code.service';
import { UserRepository } from '@/shared/repositories/user.repository';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import { HashingService } from '@/shared/services/hashing.service';
import { RecoverPasswordCommand } from '../impl/recover-password.command';
import { RecoverPasswordHandler } from './recover-password.handler';

describe('RecoverPasswordHandler', () => {
  let handler: RecoverPasswordHandler;
  let otpCodeService: DeepMocked<OtpCodeService>;
  let userRepository: DeepMocked<UserRepository>;
  let emailAddressRepository: DeepMocked<EmailAddressRepository>;
  let hashingService: DeepMocked<HashingService>;

  beforeEach(async () => {
    otpCodeService = createMock<OtpCodeService>();
    userRepository = createMock<UserRepository>();
    emailAddressRepository = createMock<EmailAddressRepository>();
    hashingService = createMock<HashingService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecoverPasswordHandler,
        { provide: OtpCodeService, useValue: otpCodeService },
        { provide: UserRepository, useValue: userRepository },
        { provide: EmailAddressRepository, useValue: emailAddressRepository },
        { provide: HashingService, useValue: hashingService },
      ],
    }).compile();

    handler = module.get<RecoverPasswordHandler>(RecoverPasswordHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const mockPayload = {
      email: 'test@example.com',
      otpCode: '12345678',
      newPassword: 'NewPassword123!',
    };
    const command = new RecoverPasswordCommand(mockPayload);

    it('should successfully recover password and return success', async () => {
      // Arrange
      const mockEmailObject = emailAddressBuilder({
        email: 'test@example.com',
      });
      const mockUserObject = userBuilder({
        id: 'user-id-123',
      });
      const hashedPassword = 'hashed-password';

      emailAddressRepository.getByEmail.mockResolvedValue(mockEmailObject as any);
      userRepository.getByEmail.mockResolvedValue(mockUserObject as any);
      otpCodeService.verifyOTPCode.mockResolvedValue(true);
      hashingService.hash.mockResolvedValue(hashedPassword);
      userRepository.update.mockResolvedValue(mockUserObject as any);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(emailAddressRepository.getByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(userRepository.getByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(otpCodeService.verifyOTPCode).toHaveBeenCalledWith(
        mockEmailObject,
        mockPayload.otpCode,
        'passwordReset',
      );
      expect(hashingService.hash).toHaveBeenCalledWith(mockPayload.newPassword);
      expect(userRepository.update).toHaveBeenCalledWith(mockUserObject.id, {
        password: hashedPassword,
      });
      expect(result).toEqual({ success: true });
    });

    it('should return success false if email is not found', async () => {
      // Arrange
      emailAddressRepository.getByEmail.mockResolvedValue(null);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual({ success: false });
      expect(userRepository.getByEmail).not.toHaveBeenCalled();
    });

    it('should return success false if user is not found', async () => {
      // Arrange
      const mockEmailObject = emailAddressBuilder({
        email: 'test@example.com',
      });
      emailAddressRepository.getByEmail.mockResolvedValue(mockEmailObject as any);
      userRepository.getByEmail.mockResolvedValue(null);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual({ success: false });
      expect(otpCodeService.verifyOTPCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if OTP code is invalid', async () => {
      // Arrange
      const mockEmailObject = emailAddressBuilder({
        email: 'test@example.com',
      });
      const mockUserObject = userBuilder();
      emailAddressRepository.getByEmail.mockResolvedValue(mockEmailObject as any);
      userRepository.getByEmail.mockResolvedValue(mockUserObject as any);
      otpCodeService.verifyOTPCode.mockResolvedValue(false);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Invalid or expired OTP code');
      expect(hashingService.hash).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if password update fails', async () => {
      // Arrange
      const mockEmailObject = emailAddressBuilder({
        email: 'test@example.com',
      });
      const mockUserObject = userBuilder({
        id: 'user-id-123',
      });
      const hashedPassword = 'hashed-password';

      emailAddressRepository.getByEmail.mockResolvedValue(mockEmailObject as any);
      userRepository.getByEmail.mockResolvedValue(mockUserObject as any);
      otpCodeService.verifyOTPCode.mockResolvedValue(true);
      hashingService.hash.mockResolvedValue(hashedPassword);
      userRepository.update.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
      await expect(handler.execute(command)).rejects.toThrow('Failed to update user password');
    });
  });
});
