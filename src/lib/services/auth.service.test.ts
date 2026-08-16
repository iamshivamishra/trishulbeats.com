import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password") },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    usernameExists: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/errors", () => {
  class ConflictError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "ConflictError";
    }
  }
  class NotFoundError extends Error {
    constructor(msg: string) {
      super(`${msg} not found`);
      this.name = "NotFoundError";
    }
  }
  return { ConflictError, NotFoundError };
});

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
}));

import { authService } from "./auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signup", () => {
    it("creates a buyer account", async () => {
      // Arrange
      const input = {
        name: "John Doe",
        email: "john@example.com",
        password: "securepassword",
        role: "buyer" as const,
      };
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.create).mockResolvedValue({
        _id: "user1",
        ...input,
        password: "hashed_password",
      } as never);

      // Act
      const result = await authService.signup(input);

      // Assert
      expect(userRepository.findByEmail).toHaveBeenCalledWith("john@example.com");
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "john@example.com",
          password: "hashed_password",
          role: "buyer",
          username: undefined,
        })
      );
      expect(result._id).toBe("user1");
    });

    it("creates a producer account with generated username", async () => {
      // Arrange
      const input = {
        name: "DJ Cool Producer",
        email: "dj@example.com",
        password: "securepassword",
        role: "producer" as const,
      };
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.usernameExists).mockResolvedValue(false);
      vi.mocked(userRepository.create).mockResolvedValue({
        _id: "user2",
        ...input,
        password: "hashed_password",
        username: "dj-cool-producer",
      } as never);

      // Act
      const result = await authService.signup(input);

      // Assert
      expect(userRepository.usernameExists).toHaveBeenCalledWith("dj-cool-producer");
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "dj-cool-producer",
          role: "producer",
        })
      );
      expect(result._id).toBe("user2");
    });

    it("throws ConflictError for duplicate email", async () => {
      // Arrange
      const input = {
        name: "John Doe",
        email: "existing@example.com",
        password: "securepassword",
        role: "buyer" as const,
      };
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        _id: "existing-user",
      } as never);

      // Act & Assert
      await expect(authService.signup(input)).rejects.toThrow(
        "An account with this email already exists"
      );
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("setRole", () => {
    it("updates role from buyer to producer with username", async () => {
      // Arrange
      const currentUser = {
        _id: "user1",
        name: "Jane Smith",
        role: "buyer",
      };
      vi.mocked(userRepository.findById).mockResolvedValue(currentUser as never);
      vi.mocked(userRepository.usernameExists).mockResolvedValue(false);
      vi.mocked(userRepository.update).mockResolvedValue({
        ...currentUser,
        role: "producer",
        username: "jane-smith",
      } as never);

      // Act
      const result = await authService.setRole("user1", "producer");

      // Assert
      expect(userRepository.usernameExists).toHaveBeenCalledWith("jane-smith", "user1");
      expect(userRepository.update).toHaveBeenCalledWith(
        "user1",
        expect.objectContaining({ role: "producer", username: "jane-smith" })
      );
      expect(result.role).toBe("producer");
    });

    it("throws NotFoundError when user does not exist", async () => {
      // Arrange
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.setRole("nonexistent", "producer")).rejects.toThrow(
        "not found"
      );
    });

    it("throws ConflictError when role is already set (not buyer)", async () => {
      // Arrange
      vi.mocked(userRepository.findById).mockResolvedValue({
        _id: "user1",
        name: "Already Producer",
        role: "producer",
      } as never);

      // Act & Assert
      await expect(authService.setRole("user1", "producer")).rejects.toThrow(
        "Role has already been set"
      );
    });
  });
});
