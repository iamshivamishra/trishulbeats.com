import { redirect, notFound } from "next/navigation";
import { userRepository } from "@/lib/repositories/user.repository";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LegacyProducerRedirect({ params }: Props) {
  const { slug } = await params;
  const producer = await userRepository.findBySlug(slug);
  if (!producer) notFound();

  const username = producer.username || slug;
  redirect(`/producer/${username}`);
}
