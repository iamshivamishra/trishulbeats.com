import { beatService } from "@/lib/services/beat.service";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { toPublicBeatPayload } from "@/lib/serializers/beat";
import type { BeatFilterInput } from "@/lib/validators/beat";

export const marketplaceService = {
  async list(filters: BeatFilterInput) {
    const result = await beatService.list(filters);
    const beatIds = result.data.map((beat) => beat._id.toString());
    const producerIds = [...new Set(result.data.map((beat) => beat.producerId.toString()))];

    const [producers, cheapestByBeatId] = await Promise.all([
      userRepository.findByIds(producerIds),
      licenseRepository.findCheapestForBeats(beatIds),
    ]);

    const producerMap = new Map(
      producers.map((producer) => [
        producer._id.toString(),
        {
          name: producer.displayName || producer.name,
          username: producer.username || null,
        },
      ])
    );

    const beats = result.data.map((beat) => {
      const beatId = beat._id.toString();
      const producer = producerMap.get(beat.producerId.toString());
      return {
        ...toPublicBeatPayload(beat),
        startingPrice: cheapestByBeatId[beatId]?.price ?? null,
        producerName: producer?.name ?? "Unknown",
        producerUsername: producer?.username ?? null,
      };
    });

    return {
      beats,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
    };
  },
};
