"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { userRepository } from "@/lib/repositories/user.repository";
import type { UserRole } from "@/types";

async function assertAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function updateUserRoleAction(formData: FormData) {
  await assertAdmin();
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as UserRole;
  await userRepository.updateRole(userId, role);
  revalidatePath("/admin/users");
}

export async function toggleUserVerifiedAction(formData: FormData) {
  await assertAdmin();
  const userId = formData.get("userId") as string;
  await userRepository.toggleVerified(userId);
  revalidatePath("/admin/users");
}