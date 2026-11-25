import type { Sequelize } from 'sequelize-typescript';
import { OauthAccount } from './models/oauth-account.model';
import { Role } from './models/role.model';
import { User } from './models/user.model';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const scoped = { findOne: jest.fn(), findByPk: jest.fn() };
  const userModel = {
    scope: jest.fn(() => scoped),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const roleModel = { findOne: jest.fn() };
  const oauthModel = {
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  };
  const transaction = { id: 'tx' };
  const sequelize = {
    transaction: jest.fn((work: (t: unknown) => unknown) => work(transaction)),
  };
  const service = new UsersService(
    userModel as unknown as typeof User,
    roleModel as unknown as typeof Role,
    oauthModel as unknown as typeof OauthAccount,
    sequelize as unknown as Sequelize,
  );

  beforeEach(() => jest.clearAllMocks());

  it('findByEmail mặc định không lấy password_hash, withPassword thì dùng scope', async () => {
    await service.findByEmail('a@b.com');
    expect(userModel.findOne).toHaveBeenCalledWith({
      where: { email: 'a@b.com' },
      include: [Role],
    });
    await service.findByEmail('a@b.com', { withPassword: true });
    expect(userModel.scope).toHaveBeenCalledWith('withPassword');
    expect(scoped.findOne).toHaveBeenCalled();
  });

  it('findById kèm role', async () => {
    await service.findById(3);
    expect(userModel.findByPk).toHaveBeenCalledWith(3, { include: [Role] });
    expect(userModel.scope).not.toHaveBeenCalled();
  });

  it('findById withPassword thì dùng scope withPassword', async () => {
    await service.findById(3, { withPassword: true });
    expect(userModel.scope).toHaveBeenCalledWith('withPassword');
    expect(scoped.findByPk).toHaveBeenCalledWith(3, { include: [Role] });
  });

  it('updateProfile chỉ ghi các field được truyền', async () => {
    await service.updateProfile(3, { fullName: 'An' });
    expect(userModel.update).toHaveBeenCalledWith(
      { fullName: 'An' },
      { where: { id: 3 } },
    );
  });

  it('emailExists', async () => {
    userModel.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await expect(service.emailExists('a@b.com')).resolves.toBe(true);
    await expect(service.emailExists('a@b.com')).resolves.toBe(false);
  });

  it('create lấy role_id theo code', async () => {
    roleModel.findOne.mockResolvedValue({ id: 1, code: 'user' });
    userModel.create.mockResolvedValue({ id: 9 });
    const user = await service.create({
      fullName: 'An',
      email: 'a@b.com',
      passwordHash: 'h',
      role: 'user',
    });
    expect(userModel.create).toHaveBeenCalledWith({
      fullName: 'An',
      email: 'a@b.com',
      passwordHash: 'h',
      roleId: 1,
    });
    expect(user.role).toEqual({ id: 1, code: 'user' });
  });

  it('create báo lỗi khi chưa seed role', async () => {
    roleModel.findOne.mockResolvedValue(null);
    await expect(
      service.create({
        fullName: 'An',
        email: 'a@b.com',
        passwordHash: null,
        role: 'user',
      }),
    ).rejects.toThrow('01-roles');
  });

  it('updatePassword', async () => {
    await service.updatePassword(2, 'h2');
    expect(userModel.update).toHaveBeenCalledWith(
      { passwordHash: 'h2' },
      { where: { id: 2 } },
    );
  });
  describe('OAuth (UC20)', () => {
    const link = {
      provider: 'github' as const,
      providerUserId: '42',
      providerEmail: 'a@b.com',
    };

    it('findByOauth tìm theo provider + provider user id, kèm user và role', async () => {
      const user = { id: 3 };
      oauthModel.findOne.mockResolvedValue({ user });
      await expect(service.findByOauth('github', '42')).resolves.toBe(user);
      expect(oauthModel.findOne).toHaveBeenCalledWith({
        where: { provider: 'github', providerUserId: '42' },
        include: [{ model: User, include: [Role] }],
      });
    });

    it('findByOauth chưa liên kết thì trả null', async () => {
      oauthModel.findOne.mockResolvedValue(null);
      await expect(service.findByOauth('github', '42')).resolves.toBeNull();
    });

    it('hasOauth đếm theo user + provider', async () => {
      oauthModel.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      await expect(service.hasOauth(3, 'github')).resolves.toBe(true);
      await expect(service.hasOauth(3, 'github')).resolves.toBe(false);
      expect(oauthModel.count).toHaveBeenCalledWith({
        where: { userId: 3, provider: 'github' },
      });
    });

    it('linkOauth ghi một dòng oauth_accounts', async () => {
      await service.linkOauth(3, link);
      expect(oauthModel.create).toHaveBeenCalledWith(
        { userId: 3, ...link },
        { transaction: undefined },
      );
    });

    it('createFromOauth tạo user role user, chưa có mật khẩu, và liên kết trong cùng transaction', async () => {
      const role = { id: 1, code: 'user' };
      roleModel.findOne.mockResolvedValue(role);
      userModel.create.mockResolvedValue({ id: 9 });

      const user = await service.createFromOauth({
        ...link,
        fullName: 'An',
        email: 'a@b.com',
        avatar: 'https://avatars.githubusercontent.com/u/42',
      });

      expect(roleModel.findOne).toHaveBeenCalledWith({
        where: { code: 'user' },
      });
      expect(userModel.create).toHaveBeenCalledWith(
        {
          fullName: 'An',
          email: 'a@b.com',
          passwordHash: null,
          avatar: 'https://avatars.githubusercontent.com/u/42',
          roleId: 1,
        },
        { transaction },
      );
      expect(oauthModel.create).toHaveBeenCalledWith(
        { userId: 9, ...link },
        { transaction },
      );
      expect(user.role).toBe(role);
    });
  });
});
