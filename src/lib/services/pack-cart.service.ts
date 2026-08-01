
import { packCartRepository } from "@/lib/repositories/pack-cart.repository";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { BeatPackCartItemPopulated } from "@/types";

export const packCartService = {
  async getItems(userId: string): Promise<BeatPackCartItemPopulated[]> {
    const items = await packCartRepository.findByUser(userId);
    const packIds = [...new Set(items.map((item) => item.packId.toString()))];
    const packs = await beatPackRepository.findByIds(packIds);
    const producerIds = [...new Set(packs.map((pack) => pack.producerId.toString()))];
    const producers = await userRepository.findByIds(producerIds);
    const producerMap = new Map(producers.map((producer) => [producer._id.toString(), producer]));
    const packMap = new Map(packs.map((pack) => [pack._id.toString(), pack]));

    const populated: BeatPackCartItemPopulated[] = [];
    for (const item of items) {
      const pack = packMap.get(item.packId.toString());
      if (!pack || !pack.isPublished || pack.status !== "published") {
        await packCartRepository.remove(userId, item.packId.toString());
        continue;
      }
      const producer = producerMap.get(pack.producerId.toString());
      populated.push({
        packId: pack._id.toString(),
        packTitle: pack.title,
        tier: item.tier,
        price: pack.prices[item.tier],
        beatCount: pack.beatIds.length,
        producerName: producer?.displayName || producer?.name || "",
      });
    }
    return populated;
  },

  async addItem(
    userId: string,
    packId: string,
    tier: "basic" | "premium" | "unlimited"
  ): Promise<void> {
    const pack = await beatPackRepository.findById(packId);
    if (!pack || !pack.isPublished || pack.status !== "published") {
      throw new NotFoundError("Beat pack");
    }
    if (!pack.beatIds.length) {
      throw new ConflictError("This pack has no beats");
    }

    const owned = await Promise.all(
      pack.beatIds.map((beatId) => purchaseRepository.hasPurchased(userId, beatId.toString()))
    );
    if (owned.every(Boolean)) {
      throw new ConflictError("You already own all beats in this pack");
    }

    await packCartRepository.add(userId, packId, tier);
  },

  async updateTier(
    userId: string,
    packId: string,
    tier: "basic" | "premium" | "unlimited"
  ): Promise<void> {
    const existing = await packCartRepository.findOne(userId, packId);
    if (!existing) throw new NotFoundError("Pack cart item");
    await packCartRepository.updateTier(userId, packId, tier);
  },

  async removeItem(userId: string, packId: string): Promise<void> {
    await packCartRepository.remove(userId, packId);
  },

  async clear(userId: string): Promise<void> {
    await packCartRepository.clear(userId);
  },
};

