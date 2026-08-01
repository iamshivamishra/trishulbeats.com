import { cartRepository } from "@/lib/repositories/cart.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { CartItemPopulated } from "@/types";

export const cartService = {
  async getItems(userId: string): Promise<CartItemPopulated[]> {
    const items = await cartRepository.findByUser(userId);
    const beatIds = [...new Set(items.map((item) => item.beatId.toString()))];
    const licenseIds = [...new Set(items.map((item) => item.licenseId.toString()))];

    const [beats, licenses] = await Promise.all([
      beatRepository.findByIds(beatIds),
      licenseRepository.findByIds(licenseIds),
    ]);
    const beatMap = new Map(beats.map((beat) => [beat._id.toString(), beat]));
    const licenseMap = new Map(licenses.map((license) => [license._id.toString(), license]));

    const producerIds = [
      ...new Set(
        beats
          .map((beat) => beat.producerId?.toString())
          .filter((producerId): producerId is string => !!producerId)
      ),
    ];
    const producers = await userRepository.findByIds(producerIds);
    const producerMap = new Map(producers.map((producer) => [producer._id.toString(), producer]));

    const populated: CartItemPopulated[] = [];
    for (const item of items) {
      const beat = beatMap.get(item.beatId.toString());
      const license = licenseMap.get(item.licenseId.toString());

      if (
        !beat ||
        !beat.isPublished ||
        beat.status !== "published" ||
        beat.saleMode === "pack_only" ||
        !license ||
        !license.isActive
      ) {
        await cartRepository.remove(userId, item.beatId.toString());
        continue;
      }

      const producer = producerMap.get(beat.producerId.toString());

      populated.push({
        beatId: beat._id.toString(),
        licenseId: license._id.toString(),
        beatTitle: beat.title,
        beatCoverUrl: beat.coverUrl,
        beatGenre: beat.genre,
        producerName: producer?.displayName || producer?.name || "Unknown",
        licenseName: license.name,
        licenseType: license.type,
        price: license.price,
      });
    }

    return populated;
  },

  MAX_CART_ITEMS: 50,

  async addItem(userId: string, beatId: string, licenseId: string): Promise<void> {
    const currentCount = await cartRepository.count(userId);
    if (currentCount >= this.MAX_CART_ITEMS) {
      throw new ConflictError(`Cart cannot exceed ${this.MAX_CART_ITEMS} items`);
    }

    const beat = await beatRepository.findById(beatId);
    if (!beat) throw new NotFoundError("Beat");
    if (!beat.isPublished || beat.status !== "published") {
      throw new ConflictError("This beat is not available for purchase");
    }
    if (beat.saleMode === "pack_only") {
      throw new ConflictError("This beat is only available as part of a beat pack");
    }

    const license = await licenseRepository.findById(licenseId);
    if (!license) throw new NotFoundError("License");
    if (!license.isActive) {
      throw new ConflictError("This license is no longer available");
    }
    if (license.beatId.toString() !== beatId) {
      throw new ConflictError("License does not belong to this beat");
    }

    const alreadyPurchased = await purchaseRepository.hasPurchased(userId, beatId);
    if (alreadyPurchased) {
      throw new ConflictError("You already own a license for this beat");
    }

    await cartRepository.add(userId, beatId, licenseId);
    logger.info("Cart item added", { userId, beatId, licenseId });
  },

  async updateLicense(userId: string, beatId: string, licenseId: string): Promise<void> {
    const existing = await cartRepository.findOne(userId, beatId);
    if (!existing) throw new NotFoundError("Cart item");

    const license = await licenseRepository.findById(licenseId);
    if (!license) throw new NotFoundError("License");
    if (!license.isActive) {
      throw new ConflictError("This license is no longer available");
    }
    if (license.beatId.toString() !== beatId) {
      throw new ConflictError("License does not belong to this beat");
    }

    await cartRepository.updateLicense(userId, beatId, licenseId);
    logger.info("Cart license updated", { userId, beatId, licenseId });
  },

  async removeItem(userId: string, beatId: string): Promise<void> {
    await cartRepository.remove(userId, beatId);
    logger.info("Cart item removed", { userId, beatId });
  },

  async clearCart(userId: string): Promise<void> {
    await cartRepository.clear(userId);
    logger.info("Cart cleared", { userId });
  },

  async getCount(userId: string): Promise<number> {
    return cartRepository.count(userId);
  },

  async getTotal(userId: string): Promise<number> {
    const items = await this.getItems(userId);
    return items.reduce((sum, item) => sum + item.price, 0);
  },
};
