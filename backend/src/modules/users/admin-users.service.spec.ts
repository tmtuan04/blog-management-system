import { compare } from "bcrypt";
import { Op, UniqueConstraintError } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { AppException } from "../../common/errors";
import { TokenService } from "../auth/token.service";
import { UserStatusService } from "../auth/user-status.service";
import { AdminUsersService } from "./admin-users.service";
import { Role, RoleCode } from "./models/role.model";
import { User } from "./models/user.model";
import { UsersService } from "./users.service";

describe("AdminUsersService", () => {
  const userModel = {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
  };
  const roleModel = { findOne: jest.fn() };
  const users = { emailExists: jest.fn(), create: jest.fn() };
  const tokens = { revokeAll: jest.fn() };
  const userStatus = { invalidate: jest.fn() };
  const transaction = { id: "tx", LOCK: { UPDATE: "UPDATE" } };
  const sequelize = {
    transaction: jest.fn(
      async <T>(callback: (t: unknown) => Promise<T>): Promise<T> =>
        callback(transaction),
    ),
  };
  const service = new AdminUsersService(
    userModel as unknown as typeof User,
    roleModel as unknown as typeof Role,
    users as unknown as UsersService,
    tokens as unknown as TokenService,
    userStatus as unknown as UserStatusService,
    sequelize as unknown as Sequelize,
  );

  const ROLE_IDS: Record<RoleCode, number> = {
    user: 1,
    blog_owner: 2,
    super_admin: 3,
  };
  const ACTOR_ID = 1;

  /** Dòng users giả kèm role. update() ghi đè field như Sequelize */
  const row = (overrides: Record<string, unknown> = {}) => {
    const code = (overrides.roleCode as RoleCode | undefined) ?? "user";
    const user: Record<string, unknown> = {
      id: 2,
      fullName: "Nguyễn Văn An",
      email: "an@blog.local",
      avatar: null,
      roleId: ROLE_IDS[code],
      role: { id: ROLE_IDS[code], code },
      isActive: true,
      createdAt: new Date("2026-08-01T00:00:00Z"),
      ...overrides,
    };
    delete user.roleCode;
    user.update = jest.fn((values: Record<string, unknown>) => {
      Object.assign(user, values);
      return Promise.resolve(user);
    });
    return user as Record<string, unknown> & { update: jest.Mock };
  };

  const expectError = async (
    promise: Promise<unknown>,
    status: number,
    code: string,
  ): Promise<AppException> => {
    const error = await promise.then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).getStatus()).toBe(status);
    expect((error as AppException).code).toBe(code);
    return error as AppException;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    sequelize.transaction.mockImplementation(
      async <T>(callback: (t: unknown) => Promise<T>): Promise<T> =>
        callback(transaction),
    );
    tokens.revokeAll.mockResolvedValue(undefined);
    userStatus.invalidate.mockResolvedValue(undefined);
  });

  describe("list", () => {
    it("không lọc: lấy một trang kèm role, mới tạo xếp trước, isSelf đúng dòng, không lộ passwordHash", async () => {
      userModel.findAndCountAll.mockResolvedValue({
        rows: [
          row({ id: 1, fullName: "Super Admin", roleCode: "super_admin" }),
          row({ passwordHash: "khong-duoc-lo" }),
        ],
        count: 25,
      });

      const result = await service.list({ page: 1, limit: 10 }, 1);

      expect(userModel.findAndCountAll).toHaveBeenCalledTimes(1);
      expect(userModel.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        include: [{ model: Role, required: false }],
        order: [
          ["createdAt", "DESC"],
          ["id", "DESC"],
        ],
        offset: 0,
        limit: 10,
      });
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
      expect(result.items).toEqual([
        {
          id: 1,
          fullName: "Super Admin",
          email: "an@blog.local",
          avatar: null,
          role: "super_admin",
          isActive: true,
          isSelf: true,
          createdAt: new Date("2026-08-01T00:00:00Z"),
        },
        {
          id: 2,
          fullName: "Nguyễn Văn An",
          email: "an@blog.local",
          avatar: null,
          role: "user",
          isActive: true,
          isSelf: false,
          createdAt: new Date("2026-08-01T00:00:00Z"),
        },
      ]);
      expect(JSON.stringify(result)).not.toContain("passwordHash");
    });

    it("q tìm trong họ tên và email, escape % và _; lọc isActive và role; trang 2", async () => {
      userModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await service.list(
        { page: 2, limit: 5, q: "100%_a", isActive: false, role: "blog_owner" },
        ACTOR_ID,
      );

      expect(userModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: false,
            [Op.or]: [
              { fullName: { [Op.like]: "%100\\%\\_a%" } },
              { email: { [Op.like]: "%100\\%\\_a%" } },
            ],
          },
          include: [
            { model: Role, required: true, where: { code: "blog_owner" } },
          ],
          offset: 5,
          limit: 5,
        }),
      );
    });

    it("isActive = true cũng được lọc (không bị coi là không lọc)", async () => {
      userModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      await service.list({ page: 1, limit: 10, isActive: true }, ACTOR_ID);
      expect(userModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });
  });

  describe("create", () => {
    const dto = {
      fullName: "Trần Thị Bình",
      email: "binh@blog.local",
      password: "Password123",
      role: "blog_owner" as const,
    };

    it("email đã có → 409, lỗi ở field email, không tạo", async () => {
      users.emailExists.mockResolvedValue(true);
      const error = await expectError(
        service.create(dto, ACTOR_ID),
        409,
        "CONFLICT",
      );
      expect(error.errors).toEqual([
        { field: "email", message: "Email này đã được đăng ký." },
      ]);
      expect(users.create).not.toHaveBeenCalled();
    });

    it("tạo tài khoản với role đã chọn, mật khẩu băm bcrypt, không lưu mật khẩu thô", async () => {
      users.emailExists.mockResolvedValue(false);
      users.create.mockImplementation(
        (input: { fullName: string; email: string; role: RoleCode }) =>
          Promise.resolve(
            row({
              id: 9,
              fullName: input.fullName,
              email: input.email,
              roleCode: input.role,
            }),
          ),
      );

      const result = await service.create(dto, ACTOR_ID);

      const input = users.create.mock.calls[0][0] as {
        passwordHash: string;
        role: string;
        email: string;
      };
      expect(input.role).toBe("blog_owner");
      expect(input.email).toBe("binh@blog.local");
      expect(input.passwordHash).not.toBe("Password123");
      await expect(compare("Password123", input.passwordHash)).resolves.toBe(
        true,
      );
      expect(result).toMatchObject({
        id: 9,
        fullName: "Trần Thị Bình",
        role: "blog_owner",
        isActive: true,
        isSelf: false,
      });
    });

    it("hai request cùng email chạy song song: lỗi UNIQUE của DB cũng thành 409", async () => {
      users.emailExists.mockResolvedValue(false);
      users.create.mockRejectedValue(new UniqueConstraintError({}));
      const error = await expectError(
        service.create(dto, ACTOR_ID),
        409,
        "CONFLICT",
      );
      expect(error.errors).toEqual([
        { field: "email", message: "Email này đã được đăng ký." },
      ]);
    });

    it("lỗi khác không bị nuốt", async () => {
      users.emailExists.mockResolvedValue(false);
      users.create.mockRejectedValue(new Error("db down"));
      await expect(service.create(dto, ACTOR_ID)).rejects.toThrow("db down");
    });
  });

  describe("changeRole", () => {
    it("không có người dùng → 404", async () => {
      userModel.findByPk.mockResolvedValue(null);
      await expectError(
        service.changeRole(99, { role: "blog_owner" }, ACTOR_ID),
        404,
        "NOT_FOUND",
      );
    });

    it("đổi user thành blog_owner: cập nhật roleId, không phải kiểm tra Super Admin cuối", async () => {
      const target = row();
      userModel.findByPk.mockResolvedValue(target);
      roleModel.findOne.mockResolvedValue({ id: 2, code: "blog_owner" });

      const result = await service.changeRole(
        2,
        { role: "blog_owner" },
        ACTOR_ID,
      );

      expect(roleModel.findOne).toHaveBeenCalledWith({
        where: { code: "blog_owner" },
        transaction,
      });
      expect(target.update).toHaveBeenCalledWith(
        { roleId: 2 },
        { transaction },
      );
      expect(userModel.findAll).not.toHaveBeenCalled();
      expect(result.role).toBe("blog_owner");
    });

    it("role không đổi thì không ghi gì", async () => {
      const target = row({ roleCode: "blog_owner" });
      userModel.findByPk.mockResolvedValue(target);
      const result = await service.changeRole(
        2,
        { role: "blog_owner" },
        ACTOR_ID,
      );
      expect(target.update).not.toHaveBeenCalled();
      expect(roleModel.findOne).not.toHaveBeenCalled();
      expect(result.role).toBe("blog_owner");
    });

    it("tự hạ quyền chính mình → 400, không ghi", async () => {
      const self = row({ id: ACTOR_ID, roleCode: "super_admin" });
      userModel.findByPk.mockResolvedValue(self);
      const error = await expectError(
        service.changeRole(ACTOR_ID, { role: "user" }, ACTOR_ID),
        400,
        "BAD_REQUEST",
      );
      expect(error.message).toBe("Không thể tự hạ quyền chính mình");
      expect(self.update).not.toHaveBeenCalled();
    });

    it("Super Admin hoạt động cuối cùng bị hạ quyền → 409 LAST_SUPER_ADMIN, đọc có khóa dòng", async () => {
      const target = row({ id: 5, roleCode: "super_admin" });
      userModel.findByPk.mockResolvedValue(target);
      userModel.findAll.mockResolvedValue([{ id: 5 }]);

      await expectError(
        service.changeRole(5, { role: "blog_owner" }, ACTOR_ID),
        409,
        "LAST_SUPER_ADMIN",
      );
      expect(userModel.findAll).toHaveBeenCalledWith({
        attributes: ["id"],
        where: { roleId: 3, isActive: true },
        transaction,
        lock: "UPDATE",
      });
      expect(target.update).not.toHaveBeenCalled();
    });

    it("còn Super Admin khác đang hoạt động thì hạ quyền được", async () => {
      const target = row({ id: 5, roleCode: "super_admin" });
      userModel.findByPk.mockResolvedValue(target);
      userModel.findAll.mockResolvedValue([{ id: 1 }, { id: 5 }]);
      roleModel.findOne.mockResolvedValue({ id: 2, code: "blog_owner" });

      const result = await service.changeRole(
        5,
        { role: "blog_owner" },
        ACTOR_ID,
      );

      expect(target.update).toHaveBeenCalledWith(
        { roleId: 2 },
        { transaction },
      );
      expect(result.role).toBe("blog_owner");
    });

    it("Super Admin đã bị khóa không tính vào số còn lại, hạ quyền không bị chặn", async () => {
      const target = row({ id: 5, roleCode: "super_admin", isActive: false });
      userModel.findByPk.mockResolvedValue(target);
      roleModel.findOne.mockResolvedValue({ id: 1, code: "user" });

      await service.changeRole(5, { role: "user" }, ACTOR_ID);

      expect(userModel.findAll).not.toHaveBeenCalled();
      expect(target.update).toHaveBeenCalled();
    });

    it("nâng user lên super_admin thì không cần kiểm tra Super Admin cuối", async () => {
      const target = row();
      userModel.findByPk.mockResolvedValue(target);
      roleModel.findOne.mockResolvedValue({ id: 3, code: "super_admin" });
      const result = await service.changeRole(
        2,
        { role: "super_admin" },
        ACTOR_ID,
      );
      expect(userModel.findAll).not.toHaveBeenCalled();
      expect(result.role).toBe("super_admin");
    });

    it("chưa seed bảng roles thì báo lỗi rõ ràng, không ghi", async () => {
      const target = row();
      userModel.findByPk.mockResolvedValue(target);
      roleModel.findOne.mockResolvedValue(null);
      await expect(
        service.changeRole(2, { role: "blog_owner" }, ACTOR_ID),
      ).rejects.toThrow("01-roles");
      expect(target.update).not.toHaveBeenCalled();
    });
  });

  describe("changeStatus", () => {
    it("không có người dùng → 404, không đụng Redis", async () => {
      userModel.findByPk.mockResolvedValue(null);
      await expectError(
        service.changeStatus(99, { isActive: false }, ACTOR_ID),
        404,
        "NOT_FOUND",
      );
      expect(tokens.revokeAll).not.toHaveBeenCalled();
      expect(userStatus.invalidate).not.toHaveBeenCalled();
    });

    it("khóa: ghi is_active = false rồi thu hồi mọi refresh token và xóa cache is_active", async () => {
      const target = row();
      userModel.findByPk.mockResolvedValue(target);
      const calls: string[] = [];
      target.update.mockImplementation((values: Record<string, unknown>) => {
        calls.push("update");
        Object.assign(target, values);
        return Promise.resolve(target);
      });
      tokens.revokeAll.mockImplementation(() => {
        calls.push("revokeAll");
        return Promise.resolve();
      });
      userStatus.invalidate.mockImplementation(() => {
        calls.push("invalidate");
        return Promise.resolve();
      });

      const result = await service.changeStatus(
        2,
        { isActive: false },
        ACTOR_ID,
      );

      expect(target.update).toHaveBeenCalledWith(
        { isActive: false },
        { transaction },
      );
      expect(tokens.revokeAll).toHaveBeenCalledWith(2);
      expect(userStatus.invalidate).toHaveBeenCalledWith(2);
      // Redis chỉ được đụng sau khi DB đã ghi
      expect(calls).toEqual(["update", "revokeAll", "invalidate"]);
      expect(result.isActive).toBe(false);
    });

    it("mở khóa: chỉ xóa cache is_active, không thu hồi token", async () => {
      const target = row({ isActive: false });
      userModel.findByPk.mockResolvedValue(target);

      const result = await service.changeStatus(
        2,
        { isActive: true },
        ACTOR_ID,
      );

      expect(target.update).toHaveBeenCalledWith(
        { isActive: true },
        { transaction },
      );
      expect(userStatus.invalidate).toHaveBeenCalledWith(2);
      expect(tokens.revokeAll).not.toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });

    it("tự khóa mình → 400, không ghi và không thu hồi gì", async () => {
      const self = row({ id: ACTOR_ID, roleCode: "super_admin" });
      userModel.findByPk.mockResolvedValue(self);
      const error = await expectError(
        service.changeStatus(ACTOR_ID, { isActive: false }, ACTOR_ID),
        400,
        "BAD_REQUEST",
      );
      expect(error.message).toBe("Không thể tự khóa tài khoản của chính mình");
      expect(self.update).not.toHaveBeenCalled();
      expect(tokens.revokeAll).not.toHaveBeenCalled();
    });

    it("khóa Super Admin hoạt động cuối cùng → 409 LAST_SUPER_ADMIN, không thu hồi token", async () => {
      const target = row({ id: 5, roleCode: "super_admin" });
      userModel.findByPk.mockResolvedValue(target);
      userModel.findAll.mockResolvedValue([{ id: 5 }]);

      await expectError(
        service.changeStatus(5, { isActive: false }, ACTOR_ID),
        409,
        "LAST_SUPER_ADMIN",
      );
      expect(target.update).not.toHaveBeenCalled();
      expect(tokens.revokeAll).not.toHaveBeenCalled();
      expect(userStatus.invalidate).not.toHaveBeenCalled();
    });

    it("còn Super Admin khác đang hoạt động thì khóa được", async () => {
      const target = row({ id: 5, roleCode: "super_admin" });
      userModel.findByPk.mockResolvedValue(target);
      userModel.findAll.mockResolvedValue([{ id: 1 }, { id: 5 }]);

      await service.changeStatus(5, { isActive: false }, ACTOR_ID);

      expect(target.update).toHaveBeenCalledWith(
        { isActive: false },
        { transaction },
      );
      expect(tokens.revokeAll).toHaveBeenCalledWith(5);
    });

    it("khóa tài khoản đã khóa: không ghi lại nhưng vẫn thu hồi token để gọi lại được khi Redis từng lỗi", async () => {
      const target = row({ isActive: false });
      userModel.findByPk.mockResolvedValue(target);

      const result = await service.changeStatus(
        2,
        { isActive: false },
        ACTOR_ID,
      );

      expect(target.update).not.toHaveBeenCalled();
      expect(tokens.revokeAll).toHaveBeenCalledWith(2);
      expect(userStatus.invalidate).toHaveBeenCalledWith(2);
      expect(result.isActive).toBe(false);
    });

    it("DB ghi lỗi thì không thu hồi token", async () => {
      const target = row();
      target.update.mockRejectedValue(new Error("db down"));
      userModel.findByPk.mockResolvedValue(target);

      await expect(
        service.changeStatus(2, { isActive: false }, ACTOR_ID),
      ).rejects.toThrow("db down");
      expect(tokens.revokeAll).not.toHaveBeenCalled();
    });

    it("Redis lỗi thì báo lỗi ra ngoài, không nuốt", async () => {
      userModel.findByPk.mockResolvedValue(row());
      tokens.revokeAll.mockRejectedValue(new Error("redis down"));
      await expect(
        service.changeStatus(2, { isActive: false }, ACTOR_ID),
      ).rejects.toThrow("redis down");
    });
  });
});
