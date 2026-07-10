"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { beatRepository } from "@/lib/repositories/beat.repository";

async function assertAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function deleteBeatAction(formData: FormData) {
  await assertAdmin();
  const beatId = formData.get("beatId") as string;
  await beatRepository.deleteById(beatId);
  revalidatePath("/admin/beats");
}