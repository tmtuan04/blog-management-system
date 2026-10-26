import { Role } from './models/role.model';
import { User } from './models/user.model';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const scoped = { findOne: jest.fn() };
  const userModel = {
    scope: jest.fn(() => scoped),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const roleModel = { findOne: jest.fn() };
  const service = new UsersService(
    userModel as unknown as typeof User,
    roleModel as unknown as typeof Role,
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
});
