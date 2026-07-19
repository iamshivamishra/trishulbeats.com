import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import EditBeatForm from "@/app/studio/beats/[id]/edit/EditBeatForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit Beat" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBeatPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  const { id } = await params;
  const beat = await beatRepository.findById(id, true);
  if (!beat) notFound();

  if (beat.producerId.toString() !== session.user.id && session.user.role !== "admin") {
    redirect("/studio/beats");
  }

  const licenses = await licenseRepository.findByBeatId(id);

  const serializedBeat = JSON.parse(JSON.stringify(beat));
  const serializedLicenses = JSON.parse(JSON.stringify(licenses));

  return (
    <div className="page-shell max-w-3xl">
      <EditBeatForm beat={serializedBeat} licenses={serializedLicenses} />
    </div>
  );
}
