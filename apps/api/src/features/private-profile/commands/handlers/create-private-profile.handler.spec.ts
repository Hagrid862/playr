import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { CreatePrivateProfileCommand } from '../impl/create-private-profile.command';
import { CreatePrivateProfileHandler } from './create-private-profile.handler';

describe('CreatePrivateProfileHandler', () => {
  let handler: CreatePrivateProfileHandler;
  let privateProfileRepository: PrivateProfileRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePrivateProfileHandler,
        {
          provide: PrivateProfileRepository,
          useValue: {
            getByUserId: vi.fn(),
            create: vi.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<CreatePrivateProfileHandler>(CreatePrivateProfileHandler);
    privateProfileRepository = module.get<PrivateProfileRepository>(PrivateProfileRepository);
  });

  it('should create a new private profile if one does not exist', async () => {
    const userId = 'user-123';
    const mockProfile = { id: 'pp-123', userId };

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue(null);
    vi.mocked(privateProfileRepository.create).mockResolvedValue(mockProfile as any);

    const command = new CreatePrivateProfileCommand(userId);
    const result = await handler.execute(command);

    expect(result).toEqual(mockProfile);
    expect(privateProfileRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(privateProfileRepository.create).toHaveBeenCalledWith({
      user: { connect: { id: userId } },
    });
  });

  it('should throw ConflictException if profile already exists', async () => {
    const userId = 'user-123';
    const mockProfile = { id: 'pp-123', userId };

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue(mockProfile as any);

    const command = new CreatePrivateProfileCommand(userId);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
    expect(privateProfileRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(privateProfileRepository.create).not.toHaveBeenCalled();
  });
});
