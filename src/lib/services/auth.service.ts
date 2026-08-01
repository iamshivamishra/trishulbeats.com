import bcrypt from "bcryptjs";
import { userRepository } from "@/lib/repositories/user.repository";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { SignupInput } from "@/lib/validators/auth";
import type { IUser, UserRole } from "@/types";

const BCRYPT_ROUNDS = 12;

function generateUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const authService = {
  async signup(input: SignupInput): Promise<IUser> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    let username: string | undefined;
    if (input.role === "producer") {
      username = generateUsername(input.name);
      const taken = await userRepository.usernameExists(username);
      if (taken) {
        username = `${username}-${Date.now().toString(36)}`;
      }
    }

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: input.role,
      username,
      displayName: input.name,
    });

    logger.info("User registered", { userId: user._id, role: input.role });
    audit({ action: "user.signup", userId: user._id.toString(), metadata: { role: input.role } });
    return user;
  },

  async setRole(userId: string, role: UserRole): Promise<IUser> {
    const currentUser = await userRepository.findById(userId);
    if (!currentUser) throw new NotFoundError("User");

    if (currentUser.role !== "buyer") {
      throw new ConflictError("Role has already been set during onboarding");
    }

    let username: string | undefined;
    if (role === "producer") {
      const user = currentUser;
      if (user) {
        username = generateUsername(user.name);
        const taken = await userRepository.usernameExists(username, userId);
        if (taken) {
          username = `${username}-${Date.now().toString(36)}`;
        }
      }
    }

    const updated = await userRepository.update(userId, {
      role,
      ...(username ? { username, displayName: (await userRepository.findById(userId))?.name } : {}),
    });
    if (!updated) throw new NotFoundError("User");

    logger.info("User role updated", { userId, role });
    audit({ action: "user.role_change", userId, metadata: { newRole: role } });
    return updated;
  },

};
