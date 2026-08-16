import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/models/User", () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    countDocuments: vi.fn(),
  },
}));
vi.mock("mongoose", () => {
  function ObjectId(id: string) { return id; }
  return {
    default: { Types: { ObjectId } },
  };
});

import User from "@/lib/models/User";
import { userRepository } from "./user.repository";

function chainable(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.sort = vi.fn().mockReturnValue(chain);
  chain.skip = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.session = vi.fn().mockReturnValue(chain);
  chain.populate = vi.fn().mockReturnValue(chain);
  chain.lean = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

const mockUser = {
  _id: "u1",
  name: "Test User",
  email: "test@example.com",
  role: "buyer",
};

describe("userRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByEmail", () => {
    it("lowercases email before query", async () => {
      vi.mocked(User.findOne).mockReturnValue(chainable(mockUser) as never);

      const result = await userRepository.findByEmail("Test@Example.COM");

      expect(result).toEqual(mockUser);
      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    });
  });

  describe("findById", () => {
    it("constructs ObjectId from string", async () => {
      vi.mocked(User.findById).mockReturnValue(chainable(mockUser) as never);

      const result = await userRepository.findById("u1");

      expect(result).toEqual(mockUser);
      expect(User.findById).toHaveBeenCalled();
    });
  });

  describe("findByIds", () => {
    it("returns empty array for empty ids", async () => {
      const result = await userRepository.findByIds([]);

      expect(result).toEqual([]);
      expect(User.find).not.toHaveBeenCalled();
    });

    it("returns users for given ids", async () => {
      vi.mocked(User.find).mockReturnValue(chainable([mockUser]) as never);

      const result = await userRepository.findByIds(["u1"]);

      expect(result).toEqual([mockUser]);
    });
  });

  describe("create", () => {
    it("strips password from returned object", async () => {
      vi.mocked(User.create).mockResolvedValue({
        toObject: () => ({ _id: "u1", password: "hash", name: "User" }),
      } as never);

      const result = await userRepository.create({ name: "User", email: "u@e.com" });

      expect(result).not.toHaveProperty("password");
      expect(result).toHaveProperty("name", "User");
    });
  });

  describe("update", () => {
    it("calls findByIdAndUpdate", async () => {
      vi.mocked(User.findByIdAndUpdate).mockReturnValue(
        chainable({ ...mockUser, name: "Updated" }) as never
      );

      const result = await userRepository.update("u1", { name: "Updated" });

      expect(result).toEqual({ ...mockUser, name: "Updated" });
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "u1",
        { name: "Updated" },
        { new: true }
      );
    });
  });

  describe("usernameExists", () => {
    it("returns true when count > 0", async () => {
      vi.mocked(User.countDocuments).mockResolvedValue(1 as never);

      const result = await userRepository.usernameExists("taken");

      expect(result).toBe(true);
    });

    it("returns false when count is 0", async () => {
      vi.mocked(User.countDocuments).mockResolvedValue(0 as never);

      const result = await userRepository.usernameExists("available");

      expect(result).toBe(false);
    });
  });

  describe("incrementSalesCount", () => {
    it("calls findByIdAndUpdate with $inc", async () => {
      vi.mocked(User.findByIdAndUpdate).mockResolvedValue(null as never);

      await userRepository.incrementSalesCount("producer1");

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "producer1",
        { $inc: { salesCount: 1 } },
        { session: undefined }
      );
    });
  });

  describe("incrementFollowersCount", () => {
    it("calls findByIdAndUpdate with $inc", async () => {
      vi.mocked(User.findByIdAndUpdate).mockResolvedValue(null as never);

      await userRepository.incrementFollowersCount("u1");

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "u1",
        { $inc: { followersCount: 1 } },
        { session: undefined }
      );
    });
  });

  describe("decrementFollowersCount", () => {
    it("calls updateOne with guard and $inc -1", async () => {
      vi.mocked(User.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);

      await userRepository.decrementFollowersCount("u1");

      expect(User.updateOne).toHaveBeenCalledWith(
        { _id: "u1", followersCount: { $gt: 0 } },
        { $inc: { followersCount: -1 } },
        { session: undefined }
      );
    });
  });

  describe("countByRole", () => {
    it("calls countDocuments with role", async () => {
      vi.mocked(User.countDocuments).mockResolvedValue(15 as never);

      const result = await userRepository.countByRole("producer");

      expect(result).toBe(15);
      expect(User.countDocuments).toHaveBeenCalledWith({ role: "producer" });
    });
  });

  describe("countAll", () => {
    it("calls countDocuments without filter", async () => {
      vi.mocked(User.countDocuments).mockResolvedValue(100 as never);

      const result = await userRepository.countAll();

      expect(result).toBe(100);
      expect(User.countDocuments).toHaveBeenCalledWith();
    });
  });

  describe("toggleVerified", () => {
    it("toggles verified field", async () => {
      vi.mocked(User.findById).mockReturnValue({
        select: vi.fn().mockResolvedValue({ verified: false }),
      } as never);
      vi.mocked(User.findByIdAndUpdate).mockResolvedValue({
        ...mockUser,
        verified: true,
      } as never);

      const result = await userRepository.toggleVerified("u1");

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith("u1", { verified: true });
      expect(result).toHaveProperty("verified", true);
    });

    it("returns null if user not found", async () => {
      vi.mocked(User.findById).mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      } as never);

      const result = await userRepository.toggleVerified("u1");

      expect(result).toBeNull();
    });
  });
});
