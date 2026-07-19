import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import StudioBeatsClient from "@/app/studio/beats/StudioBeatsClient";
import type { BeatStatus } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Studio — My Beats" };

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function StudioBeatsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  const params = await searchParams;
  const status = (params.status || undefined) as BeatStatus | undefined;
  const page = parseInt(params.page || "1", 10);

  const [result, stats, earnings] = await Promise.all([
    beatService.listByProducer(session.user.id, status, page, 20),
    beatService.getProducerStats(session.user.id),
    purchaseRepository.getEarningsByProducer(session.user.id),
  ]);

  const beatsWithLicenses = await Promise.all(
    result.data.map(async (beat) => {
      const cheapest = await licenseRepository.findCheapestForBeat(beat._id.toString());
      return { ...JSON.parse(JSON.stringify(beat)), startingPrice: cheapest?.price };
    })
  );

  return (
    <StudioBeatsClient
      beats={beatsWithLicenses}
      stats={stats}
      earnings={earnings}
      pagination={{
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      }}
      currentStatus={status || "all"}
    />
  );
}
