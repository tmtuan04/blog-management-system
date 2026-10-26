import { RedisService } from '../../infra/redis/redis.service';
import { User } from '../users/models/user.model';
import { UserStatusService } from './user-status.service';

describe('UserStatusService', () => {
  const client = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const userModel = { findByPk: jest.fn() };
  const service = new UserStatusService(
    { client } as unknown as RedisService,
    userModel as unknown as typeof User,
  );

  beforeEach(() => jest.clearAllMocks());

  it('dùng giá trị cache nếu có', async () => {
    client.get.mockResolvedValueOnce('0');
    await expect(service.isActive(1)).resolves.toBe(false);
    expect(userModel.findByPk).not.toHaveBeenCalled();
  });

  it('chưa có cache thì đọc DB và cache 60 giây', async () => {
    client.get.mockResolvedValueOnce(null);
    userModel.findByPk.mockResolvedValueOnce({ isActive: true });
    await expect(service.isActive(7)).resolves.toBe(true);
    expect(client.set).toHaveBeenCalledWith(
      'auth:user-active:7',
      '1',
      'EX',
      60,
    );
  });

  it('user không còn tồn tại thì coi như bị khóa', async () => {
    client.get.mockResolvedValueOnce(null);
    userModel.findByPk.mockResolvedValueOnce(null);
    await expect(service.isActive(9)).resolves.toBe(false);
  });

  it('invalidate xóa key auth:user-active', async () => {
    await service.invalidate(3);
    expect(client.del).toHaveBeenCalledWith('auth:user-active:3');
  });
});
