import { compare, hash } from 'bcrypt';
import { AppException } from '../../common/errors';
import { CachePrefix } from '../../common/utils/redis-keys';
import { CacheService } from '../../infra/redis/cache.service';
import { UploadService } from '../../infra/upload/upload.service';
import { TokenService } from '../auth/token.service';
import { User } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let passwordHash: string;
  const users = {
    findById: jest.fn(),
    updateProfile: jest.fn(),
    updatePassword: jest.fn(),
  };
  const tokens = { revokeAll: jest.fn() };
  const upload = { saveImage: jest.fn(), remove: jest.fn() };
  const cache = { invalidate: jest.fn() };
  const service = new ProfileService(
    users as unknown as UsersService,
    tokens as unknown as TokenService,
    upload as unknown as UploadService,
    cache as unknown as CacheService,
  );

  const userOf = (overrides: Partial<User> = {}) =>
    ({
      id: 1,
      fullName: 'Nguyễn Văn An',
      email: 'an@test.local',
      avatar: null,
      passwordHash,
      role: { code: 'blog_owner' },
      ...overrides,
    }) as unknown as User;

  const errorOf = (promise: Promise<unknown>) =>
    promise.then(
      () => {
        throw new Error('phải ném lỗi');
      },
      (e: unknown) => e as AppException,
    );

  const file = { originalname: 'a.png' } as Express.Multer.File;

  beforeAll(async () => {
    passwordHash = await hash('Password123', 4);
  });

  beforeEach(() => jest.clearAllMocks());

  describe('get', () => {
    it('trả họ tên, email, avatar, role, hasPassword và không có passwordHash', async () => {
      users.findById.mockResolvedValue(
        userOf({ avatar: 'uploads/avatars/x.png' }),
      );
      const profile = await service.get(1);
      expect(users.findById).toHaveBeenCalledWith(1, { withPassword: true });
      expect(profile).toEqual({
        fullName: 'Nguyễn Văn An',
        email: 'an@test.local',
        avatar: 'uploads/avatars/x.png',
        role: 'blog_owner',
        hasPassword: true,
      });
    });

    it('tài khoản OAuth chưa có mật khẩu: hasPassword = false', async () => {
      users.findById.mockResolvedValue(userOf({ passwordHash: null }));
      await expect(service.get(1)).resolves.toMatchObject({
        hasPassword: false,
      });
    });

    it('user không còn trong DB: 401', async () => {
      users.findById.mockResolvedValue(null);
      const error = await errorOf(service.get(1));
      expect(error.getStatus()).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('update', () => {
    it('đổi họ tên, chỉ ghi fullName và xóa cache bài viết', async () => {
      users.findById.mockResolvedValue(userOf());
      const profile = await service.update(1, { fullName: 'Trần Thị Bình' });
      expect(users.updateProfile).toHaveBeenCalledWith(1, {
        fullName: 'Trần Thị Bình',
      });
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.posts);
      expect(profile.fullName).toBe('Trần Thị Bình');
      expect(profile.email).toBe('an@test.local');
    });

    it('họ tên không đổi thì không ghi DB, không xóa cache', async () => {
      users.findById.mockResolvedValue(userOf());
      await service.update(1, { fullName: 'Nguyễn Văn An' });
      expect(users.updateProfile).not.toHaveBeenCalled();
      expect(cache.invalidate).not.toHaveBeenCalled();
    });
  });

  describe('updateAvatar', () => {
    it('lưu vào avatars, cập nhật DB, xóa ảnh cũ, xóa cache bài viết', async () => {
      users.findById.mockResolvedValue(
        userOf({ avatar: 'uploads/avatars/old.png' }),
      );
      upload.saveImage.mockResolvedValue('uploads/avatars/new.png');

      const path = await service.updateAvatar(1, file);

      expect(path).toBe('uploads/avatars/new.png');
      expect(upload.saveImage).toHaveBeenCalledWith(file, 'avatars');
      expect(users.updateProfile).toHaveBeenCalledWith(1, {
        avatar: 'uploads/avatars/new.png',
      });
      expect(upload.remove).toHaveBeenCalledWith('uploads/avatars/old.png');
      expect(cache.invalidate).toHaveBeenCalledWith(CachePrefix.posts);
    });

    it('chưa có avatar: remove(null) để UploadService tự bỏ qua', async () => {
      users.findById.mockResolvedValue(userOf());
      upload.saveImage.mockResolvedValue('uploads/avatars/new.png');
      await service.updateAvatar(1, file);
      expect(upload.remove).toHaveBeenCalledWith(null);
    });

    it('file không hợp lệ: lỗi của UploadService, không ghi DB', async () => {
      users.findById.mockResolvedValue(userOf());
      const invalid = AppException.validation([
        { field: 'file', message: 'Ảnh tối đa 2MB.' },
      ]);
      upload.saveImage.mockRejectedValue(invalid);
      await expect(service.updateAvatar(1, file)).rejects.toBe(invalid);
      expect(users.updateProfile).not.toHaveBeenCalled();
      expect(upload.remove).not.toHaveBeenCalled();
    });

    it('ghi DB lỗi: xóa ảnh vừa lưu, giữ ảnh cũ', async () => {
      users.findById.mockResolvedValue(
        userOf({ avatar: 'uploads/avatars/old.png' }),
      );
      upload.saveImage.mockResolvedValue('uploads/avatars/new.png');
      users.updateProfile.mockRejectedValueOnce(new Error('db'));

      await expect(service.updateAvatar(1, file)).rejects.toThrow('db');
      expect(upload.remove).toHaveBeenCalledTimes(1);
      expect(upload.remove).toHaveBeenCalledWith('uploads/avatars/new.png');
      expect(cache.invalidate).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const body = {
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123',
    };

    it('đúng mật khẩu hiện tại: lưu hash mới và thu hồi mọi refresh token', async () => {
      users.findById.mockResolvedValue(userOf());
      await service.changePassword(1, {
        ...body,
        currentPassword: 'Password123',
      });
      const [id, newHash] = users.updatePassword.mock.calls[0] as [
        number,
        string,
      ];
      expect(id).toBe(1);
      await expect(compare('NewPass123', newHash)).resolves.toBe(true);
      expect(tokens.revokeAll).toHaveBeenCalledWith(1);
    });

    it('sai mật khẩu hiện tại: 400 errors[{ field: currentPassword }], không đổi', async () => {
      users.findById.mockResolvedValue(userOf());
      const error = await errorOf(
        service.changePassword(1, { ...body, currentPassword: 'Sai12345' }),
      );
      expect(error.getStatus()).toBe(400);
      expect(error.errors).toEqual([
        { field: 'currentPassword', message: 'Mật khẩu hiện tại không đúng.' },
      ]);
      expect(users.updatePassword).not.toHaveBeenCalled();
      expect(tokens.revokeAll).not.toHaveBeenCalled();
    });

    it('đã có mật khẩu mà không gửi currentPassword: 400', async () => {
      users.findById.mockResolvedValue(userOf());
      const error = await errorOf(service.changePassword(1, body));
      expect(error.getStatus()).toBe(400);
      expect(error.errors).toEqual([
        { field: 'currentPassword', message: 'Vui lòng nhập trường này.' },
      ]);
      expect(users.updatePassword).not.toHaveBeenCalled();
    });

    it('tài khoản OAuth chưa có mật khẩu: đặt mới không cần currentPassword', async () => {
      users.findById.mockResolvedValue(userOf({ passwordHash: null }));
      await service.changePassword(1, body);
      expect(users.updatePassword).toHaveBeenCalledWith(1, expect.any(String));
      expect(tokens.revokeAll).toHaveBeenCalledWith(1);
    });
  });
});
