import { createMock, type DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UserSchema } from '@repo/contracts';
import { User } from '@repo/db';
// @ts-expect-error - ignore type errors from testing package imports
import { buildUser } from '@repo/testing';
import { TokenService } from '../../services/token.service';
import { LoginCommand } from '../impl/login.command';
import { LoginHandler } from './login.handler';

describe('LoginHandler', () => {
  let handler: LoginHandler;
  let tokenService: DeepMocked<TokenService>;

  const mockUser = buildUser();

  beforeEach(async () => {
    tokenService = createMock<TokenService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LoginHandler, { provide: TokenService, useValue: tokenService }],
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
    it('should successfully login and return tokens and user', async () => {
      // Arrange
      tokenService.generateAuthTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const command = new LoginCommand(mockUser);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(tokenService.generateAuthTokens).toHaveBeenCalledWith(mockUser.id, mockUser.username);

      const sanitizedUser = UserSchema.parse(mockUser);
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: sanitizedUser,
      });
    });

    it('should throw error if token generation fails', async () => {
      // Arrange
      tokenService.generateAuthTokens.mockRejectedValue(new Error('Token generation error'));

      const command = new LoginCommand(mockUser);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Token generation error');
    });

    it('should handle user with minimal fields', async () => {
      // Arrange
      const minimalUser: User = {
        ...mockUser,
        lastName: null,
        birthDate: null,
        gender: null,
        description: null,
        avatarId: null,
      };

      tokenService.generateAuthTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const command = new LoginCommand(minimalUser);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.user.lastName).toBeNull();
      expect(result.user.birthDate).toBeNull();
    });

    it('should throw error if transaction fails during token generation', async () => {
      // Arrange
      tokenService.generateAuthTokens.mockRejectedValue(new Error('Transaction failed'));
      const command = new LoginCommand(mockUser);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Transaction failed');
    });
  });
});
