import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { GetPrivateProfileQuery } from '../impl/get-private-profile.query';
import { GetPrivateProfileHandler } from './get-private-profile.handler';

describe('GetPrivateProfileHandler', () => {
  let handler: GetPrivateProfileHandler;
  let privateProfileRepository: PrivateProfileRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPrivateProfileHandler,
        {
          provide: PrivateProfileRepository,
          useValue: {
            getByUserId: vi.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<GetPrivateProfileHandler>(GetPrivateProfileHandler);
    privateProfileRepository = module.get<PrivateProfileRepository>(PrivateProfileRepository);
  });

  it('should return private profile if found', async () => {
    const userId = 'user-123';
    const mockProfile = { id: 'pp-123', userId };

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue(mockProfile as any);

    const query = new GetPrivateProfileQuery(userId);
    const result = await handler.execute(query);

    expect(result).toEqual(mockProfile);
    expect(privateProfileRepository.getByUserId).toHaveBeenCalledWith(userId);
  });

  it('should throw NotFoundException if profile not found', async () => {
    const userId = 'user-123';

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue(null);

    const query = new GetPrivateProfileQuery(userId);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    expect(privateProfileRepository.getByUserId).toHaveBeenCalledWith(userId);
  });
});
