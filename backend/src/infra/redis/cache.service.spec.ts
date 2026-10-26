import { CacheService } from './cache.service';
import { RedisService } from './redis.service';

describe('CacheService', () => {
  let client: Record<string, jest.Mock>;
  let cache: CacheService;

  beforeEach(() => {
    client = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn().mockImplementation((...keys: string[]) => keys.length),
      scan: jest.fn(),
    };
    cache = new CacheService({ client } as unknown as RedisService);
  });

  it('get trả null khi chưa có key, parse JSON khi có', async () => {
    client.get.mockResolvedValueOnce(null).mockResolvedValueOnce('{"a":1}');
    await expect(cache.get('k')).resolves.toBeNull();
    await expect(cache.get('k')).resolves.toEqual({ a: 1 });
  });

  it('set lưu JSON kèm TTL', async () => {
    await cache.set('k', { a: 1 }, 60);
    expect(client.set).toHaveBeenCalledWith('k', '{"a":1}', 'EX', 60);
  });

  it('wrap: có cache thì không gọi load', async () => {
    client.get.mockResolvedValue('[1]');
    const load = jest.fn();
    await expect(cache.wrap('k', 60, load)).resolves.toEqual([1]);
    expect(load).not.toHaveBeenCalled();
  });

  it('wrap: chưa có cache thì gọi load và lưu lại', async () => {
    client.get.mockResolvedValue(null);
    await expect(
      cache.wrap('k', 60, () => Promise.resolve([2])),
    ).resolves.toEqual([2]);
    expect(client.set).toHaveBeenCalledWith('k', '[2]', 'EX', 60);
  });

  it('del bỏ qua khi không có key', async () => {
    await cache.del();
    expect(client.del).not.toHaveBeenCalled();
    await cache.del('a', 'b');
    expect(client.del).toHaveBeenCalledWith('a', 'b');
  });

  it('invalidate dùng SCAN theo prefix tới khi cursor về 0', async () => {
    client.scan
      .mockResolvedValueOnce(['5', ['cache:posts:1', 'cache:posts:2']])
      .mockResolvedValueOnce(['0', []]);
    await expect(cache.invalidate('cache:posts:')).resolves.toBe(2);
    expect(client.scan).toHaveBeenCalledWith(
      '0',
      'MATCH',
      'cache:posts:*',
      'COUNT',
      200,
    );
    expect(client.scan).toHaveBeenCalledTimes(2);
  });
});
