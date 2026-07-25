import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { userRepository } from "@/lib/repositories/user.repository";
import EditProfileForm from "@/app/profile/edit/EditProfileForm";

export const metadata: Metadata = { title: "Edit Profile" };

export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await userRepository.findById(session.user.id);
  if (!user) redirect("/login");

  const serialized = JSON.parse(JSON.stringify(user));

  return (
    <div className="page-shell max-w-2xl">
      <EditProfileForm user={serialized} />
    </div>
  );
}
