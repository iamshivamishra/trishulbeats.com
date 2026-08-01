import { orderRepository } from "@/lib/repositories/order.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { cartRepository } from "@/lib/repositories/cart.repository";
import { packCartRepository } from "@/lib/repositories/pack-cart.repository";
import { cartService } from "@/lib/services/cart.service";
import { withTransaction } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { fetchPaymentById, razorpay, verifySignature } from "@/lib/razorpay";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { packCartService } from "@/lib/services/pack-cart.service";
import type {
  CreateOrderInput,
  CreatePackOrderInput,
  CreateUpgradeOrderInput,
  VerifyPaymentInput,
  CheckoutCartInput,
} from "@/lib/validators/payment";
import type { IOrder, IPurchase, IOrderItem } from "@/types";

interface MongoLikeError {
  code?: number;
}

function generateReceipt(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `rcpt_${ts}_${rand}`;
}

function allocateAmounts(totalAmount: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalAmount / count);
  const remainder = totalAmount - base * count;
  return Array.from({ length: count }, (_, idx) => base + (idx < remainder ? 1 : 0));
}

export const paymentService = {
  /**  
   * Create a Razorpay order for a single beat+license (direct buy).
   */
  async createOrder(
    input: CreateOrderInput,
    buyerId: string
  ): Promise<{ orderId: string; amount: number; currency: string; internalOrderId: string }> {
    const already = await purchaseRepository.hasPurchased(buyerId, input.beatId);
    if (already) {
      throw new ConflictError("You have already purchased this beat");
    }

    const license = await licenseRepository.findById(input.licenseId);
    if (!license || !license.isActive) throw new NotFoundError("License");

    const existingPendingOrder = await orderRepository.findPendingByBuyerAndBeat(
      buyerId,
      input.beatId
    );
    if (existingPendingOrder?.razorpayOrderId) {
      const isSingleItemOrder = existingPendingOrder.items.length === 1;
      const itemMatch = isSingleItemOrder &&
        existingPendingOrder.items[0].licenseId.toString() === input.licenseId &&
        existingPendingOrder.totalAmount === license.price;

      if (itemMatch) {
        return {
          orderId: existingPendingOrder.razorpayOrderId,
          amount: existingPendingOrder.totalAmount,
          currency: "INR",
          internalOrderId: existingPendingOrder._id.toString(),
        };
      }
      if (isSingleItemOrder) {
        await orderRepository.updateStatus(
          existingPendingOrder._id.toString(),
          "failed",
          { failureReason: "License or price changed since order was created" }
        );
      }
    }
    if (license.beatId.toString() !== input.beatId) {
      throw new ConflictError("License does not belong to this beat");
    }

    const beat = await beatRepository.findById(input.beatId);
    if (!beat) throw new NotFoundError("Beat");
    if (!beat.isPublished || beat.status !== "published") {
      throw new ConflictError("This beat is not available for purchase");
    }
    if (beat.saleMode === "pack_only") {
      throw new ConflictError("This beat is sold only via a beat pack");
    }

    const receipt = generateReceipt();

    const order = await orderRepository.create({
      buyerId: buyerId as unknown as IOrder["buyerId"],
      items: [
        {
          beatId: input.beatId as unknown as IOrderItem["beatId"],
          licenseId: input.licenseId as unknown as IOrderItem["licenseId"],
          licenseType: license.type,
          price: license.price,
          beatTitle: beat.title,
        },
      ],
      totalAmount: license.price,
      status: "pending",
      receipt,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: license.price * 100,
      currency: "INR",
      receipt,
      notes: {
        internalOrderId: order._id.toString(),
        buyerId,
      },
    });
    await orderRepository.attachRazorpayOrderId(order._id.toString(), razorpayOrder.id);

    logger.info("Order created", {
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: license.price,
    });
    audit({
      action: "payment.order_created",
      userId: buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { amount: license.price, beatId: input.beatId },
    });

    return {
      orderId: razorpayOrder.id,
      amount: license.price,
      currency: "INR",
      internalOrderId: order._id.toString(),
    };
  },

  async createPackOrder(
    input: CreatePackOrderInput,
    buyerId: string
  ): Promise<{ orderId: string; amount: number; currency: string; internalOrderId: string }> {
    const pack = await beatPackRepository.findById(input.packId);
    if (!pack || !pack.isPublished || pack.status !== "published") {
      throw new NotFoundError("Beat pack");
    }

    const beatIds = pack.beatIds.map((beatId) => beatId.toString());
    if (beatIds.length === 0) {
      throw new ConflictError("This beat pack has no beats");
    }

    const beats = await beatRepository.findByIds(beatIds);
    if (beats.length !== beatIds.length) {
      throw new ConflictError("One or more beats in this pack are unavailable");
    }
    if (beats.some((beat) => !beat.isPublished || beat.status !== "published")) {
      throw new ConflictError("This beat pack contains unpublished beats");
    }

    const alreadyOwnedSet = await purchaseRepository.hasPurchasedBatch(buyerId, beatIds);
    if (beatIds.every((id) => alreadyOwnedSet.has(id))) {
      throw new ConflictError("You already own all beats in this pack");
    }

    const licenses = await Promise.all(
      beatIds.map(async (beatId) => {
        const options = await licenseRepository.findByBeatId(beatId);
        return options.find((license) => license.type === input.tier && license.isActive);
      })
    );
    if (licenses.some((license) => !license)) {
      throw new ConflictError(`Missing ${input.tier} license on one or more beats in this pack`);
    }

    const totalAmount = pack.prices[input.tier];
    const perBeatAmounts = allocateAmounts(totalAmount, beatIds.length);
    const receipt = generateReceipt();

    const orderItems: IOrderItem[] = beats.map((beat, idx) => ({
      beatId: beat._id as unknown as IOrderItem["beatId"],
      licenseId: licenses[idx]!._id as unknown as IOrderItem["licenseId"],
      licenseType: input.tier,
      price: perBeatAmounts[idx],
      beatTitle: beat.title,
      sourceType: "pack",
      sourcePackId: pack._id as unknown as IOrderItem["sourcePackId"],
    }));

    const order = await orderRepository.create({
      buyerId: buyerId as unknown as IOrder["buyerId"],
      items: orderItems,
      totalAmount,
      status: "pending",
      receipt,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt,
      notes: {
        internalOrderId: order._id.toString(),
        buyerId,
        packId: pack._id.toString(),
        packTier: input.tier,
      },
    });
    await orderRepository.attachRazorpayOrderId(order._id.toString(), razorpayOrder.id);

    return {
      orderId: razorpayOrder.id,
      amount: totalAmount,
      currency: "INR",
      internalOrderId: order._id.toString(),
    };
  },

  /**
   * Create a Razorpay order for upgrading a beat pack tier.
   * User pays only the price difference between current and target tier.
   */
  async createUpgradeOrder(
    input: CreateUpgradeOrderInput,
    buyerId: string
  ): Promise<{ orderId: string; amount: number; currency: string; internalOrderId: string }> {
    const pack = await beatPackRepository.findById(input.packId);
    if (!pack || !pack.isPublished || pack.status !== "published") {
      throw new NotFoundError("Beat pack");
    }

    const beatIds = pack.beatIds.map((id) => id.toString());
    if (beatIds.length === 0) {
      throw new ConflictError("This beat pack has no beats");
    }

    const ownedSet = await purchaseRepository.hasPurchasedBatch(buyerId, beatIds);
    if (!beatIds.every((id) => ownedSet.has(id))) {
      throw new ConflictError("You must own all beats in this pack to upgrade");
    }

    const existingPurchases = await purchaseRepository.findByBuyerAndBeatIds(buyerId, beatIds);
    if (existingPurchases.length === 0) {
      throw new ConflictError("No existing purchases found for this pack");
    }

    const packPurchases = existingPurchases.filter(
      (p) => p.sourceType === "pack" && p.sourcePackId?.toString() === input.packId
    );
    if (packPurchases.length !== beatIds.length) {
      throw new ConflictError(
        "Upgrade is only available for beats purchased through this pack"
      );
    }

    const tierRank: Record<string, number> = { basic: 0, premium: 1, unlimited: 2 };
    const currentTier = packPurchases.reduce(
      (lowest, p) => (tierRank[p.licenseType] ?? 0) < (tierRank[lowest] ?? 0) ? p.licenseType : lowest,
      packPurchases[0].licenseType
    );

    if ((tierRank[currentTier] ?? 0) >= (tierRank[input.targetTier] ?? 0)) {
      throw new ConflictError(`You already have ${currentTier} or higher. Cannot upgrade to ${input.targetTier}.`);
    }

    const currentPrice = pack.prices[currentTier as keyof typeof pack.prices] ?? 0;
    const targetPrice = pack.prices[input.targetTier] ?? 0;
    const upgradeAmount = targetPrice - currentPrice;

    if (upgradeAmount <= 0) {
      throw new ConflictError("Upgrade price difference is zero or negative");
    }

    const licenses = await Promise.all(
      beatIds.map(async (beatId) => {
        const options = await licenseRepository.findByBeatId(beatId);
        return options.find((lic) => lic.type === input.targetTier && lic.isActive);
      })
    );
    if (licenses.some((lic) => !lic)) {
      throw new ConflictError(`Missing ${input.targetTier} license on one or more beats`);
    }

    const perBeatAmounts = allocateAmounts(upgradeAmount, beatIds.length);
    const receipt = generateReceipt();
    const beats = await beatRepository.findByIds(beatIds);
    const beatTitleMap = new Map(beats.map((b) => [b._id.toString(), b.title]));

    const orderItems: IOrderItem[] = beatIds.map((beatId, idx) => ({
      beatId: beatId as unknown as IOrderItem["beatId"],
      licenseId: licenses[idx]!._id as unknown as IOrderItem["licenseId"],
      licenseType: input.targetTier,
      price: perBeatAmounts[idx],
      beatTitle: beatTitleMap.get(beatId) ?? "Beat",
      sourceType: "upgrade" as const,
      sourcePackId: pack._id as unknown as IOrderItem["sourcePackId"],
    }));

    const order = await orderRepository.create({
      buyerId: buyerId as unknown as IOrder["buyerId"],
      items: orderItems,
      totalAmount: upgradeAmount,
      status: "pending",
      receipt,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: upgradeAmount * 100,
      currency: "INR",
      receipt,
      notes: {
        internalOrderId: order._id.toString(),
        buyerId,
        packId: pack._id.toString(),
        upgradeFrom: currentTier,
        upgradeTo: input.targetTier,
      },
    });
    await orderRepository.attachRazorpayOrderId(order._id.toString(), razorpayOrder.id);

    logger.info("Upgrade order created", {
      orderId: order._id,
      packId: input.packId,
      from: currentTier,
      to: input.targetTier,
      upgradeAmount,
    });
    audit({
      action: "payment.upgrade_order_created",
      userId: buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { packId: input.packId, from: currentTier, to: input.targetTier, upgradeAmount },
    });

    return {
      orderId: razorpayOrder.id,
      amount: upgradeAmount,
      currency: "INR",
      internalOrderId: order._id.toString(),
    };
  },

  /**
   * Create a Razorpay order for the entire cart.
   */
  async checkoutCart(
    _input: CheckoutCartInput,
    buyerId: string
  ): Promise<{ orderId: string; amount: number; currency: string; internalOrderId: string }> {
    const cartItems = await cartService.getItems(buyerId);
    if (cartItems.length === 0) {
      throw new ConflictError("Your cart is empty");
    }

    // Validate none are already purchased (batch query)
    const cartBeatIds = cartItems.map((item) => item.beatId);
    const alreadyOwnedCart = await purchaseRepository.hasPurchasedBatch(buyerId, cartBeatIds);
    for (const item of cartItems) {
      if (alreadyOwnedCart.has(item.beatId)) {
        throw new ConflictError(
          `You already own "${item.beatTitle}". Remove it from your cart.`
        );
      }
    }
    const currentCartTotal = cartItems.reduce((sum, i) => sum + i.price, 0);
    const existingPendingOrder = await orderRepository.findPendingByBuyerAndBeatIds(
      buyerId,
      cartBeatIds
    );
    if (existingPendingOrder?.razorpayOrderId) {
      const pendingBeatIds = new Set(existingPendingOrder.items.map((i) => i.beatId.toString()));
      const cartBeatIdSet = new Set(cartBeatIds);
      const exactItemMatch =
        pendingBeatIds.size === cartBeatIdSet.size &&
        [...cartBeatIdSet].every((id) => pendingBeatIds.has(id)) &&
        existingPendingOrder.totalAmount === currentCartTotal;

      if (exactItemMatch) {
        return {
          orderId: existingPendingOrder.razorpayOrderId,
          amount: existingPendingOrder.totalAmount,
          currency: "INR",
          internalOrderId: existingPendingOrder._id.toString(),
        };
      }
    }

    const orderItems: IOrderItem[] = cartItems.map((item) => ({
      beatId: item.beatId as unknown as IOrderItem["beatId"],
      licenseId: item.licenseId as unknown as IOrderItem["licenseId"],
      licenseType: item.licenseType,
      price: item.price,
      beatTitle: item.beatTitle,
    }));

    const totalAmount = cartItems.reduce((sum, i) => sum + i.price, 0);
    const receipt = generateReceipt();

    const order = await orderRepository.create({
      buyerId: buyerId as unknown as IOrder["buyerId"],
      items: orderItems,
      totalAmount,
      status: "pending",
      receipt,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt,
      notes: {
        internalOrderId: order._id.toString(),
        buyerId,
        itemCount: String(cartItems.length),
      },
    });

    await orderRepository.attachRazorpayOrderId(order._id.toString(), razorpayOrder.id);

    logger.info("Cart checkout order created", {
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      items: cartItems.length,
      totalAmount,
    });
    audit({
      action: "cart.checkout",
      userId: buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { items: cartItems.length, totalAmount },
    });

    return {
      orderId: razorpayOrder.id,
      amount: totalAmount,
      currency: "INR",
      internalOrderId: order._id.toString(),
    };
  },

  /**
   * Create a single Razorpay order for both beat cart items and pack cart items.
   */
  async checkoutCombined(
    buyerId: string
  ): Promise<{ orderId: string; amount: number; currency: string; internalOrderId: string }> {
    const [cartItems, packItems] = await Promise.all([
      cartService.getItems(buyerId),
      packCartService.getItems(buyerId),
    ]);

    if (cartItems.length === 0 && packItems.length === 0) {
      throw new ConflictError("Your cart is empty");
    }

    // Validate individual beats not already purchased (batch query)
    const combinedBeatIds = cartItems.map((item) => item.beatId);
    const alreadyOwnedCombined = await purchaseRepository.hasPurchasedBatch(buyerId, combinedBeatIds);
    for (const item of cartItems) {
      if (alreadyOwnedCombined.has(item.beatId)) {
        throw new ConflictError(`You already own "${item.beatTitle}". Remove it from your cart.`);
      }
    }

    const orderItems: IOrderItem[] = [];

    // Add individual beat items
    for (const item of cartItems) {
      orderItems.push({
        beatId: item.beatId as unknown as IOrderItem["beatId"],
        licenseId: item.licenseId as unknown as IOrderItem["licenseId"],
        licenseType: item.licenseType,
        price: item.price,
        beatTitle: item.beatTitle,
      });
    }

    // Add pack items (expand each pack into its individual beats)
    // Prefetch all packs in one batch
    const packIds = packItems.map((p) => p.packId);
    const packs = await Promise.all(packIds.map((id) => beatPackRepository.findById(id)));
    const validPackEntries = packItems
      .map((packItem, i) => ({ packItem, pack: packs[i] }))
      .filter(({ pack }) => pack && pack.isPublished && pack.status === "published");

    // Collect all beat IDs across packs and prefetch beats + licenses in batch
    const allPackBeatIds = validPackEntries.flatMap(({ pack }) =>
      pack!.beatIds.map((id) => id.toString())
    );
    const [allPackBeats, allPackLicenses] = await Promise.all([
      beatRepository.findByIds(allPackBeatIds),
      licenseRepository.findByBeatIds(allPackBeatIds),
    ]);
    const packBeatMap = new Map(allPackBeats.map((b) => [b._id.toString(), b]));
    const packLicensesByBeat = new Map<string, typeof allPackLicenses>();
    for (const lic of allPackLicenses) {
      const key = lic.beatId.toString();
      if (!packLicensesByBeat.has(key)) packLicensesByBeat.set(key, []);
      packLicensesByBeat.get(key)!.push(lic);
    }

    for (const { packItem, pack } of validPackEntries) {
      const beatIds = pack!.beatIds.map((id) => id.toString());
      const packTotal = pack!.prices[packItem.tier];
      const perBeatAmounts = allocateAmounts(packTotal, beatIds.length);

      for (let idx = 0; idx < beatIds.length; idx++) {
        const beatId = beatIds[idx];
        const beat = packBeatMap.get(beatId);
        if (!beat) continue;
        const licOptions = packLicensesByBeat.get(beatId) ?? [];
        const license = licOptions.find((lic) => lic.type === packItem.tier && lic.isActive);
        if (!license) continue;

        orderItems.push({
          beatId: beat._id as unknown as IOrderItem["beatId"],
          licenseId: license._id as unknown as IOrderItem["licenseId"],
          licenseType: packItem.tier,
          price: perBeatAmounts[idx],
          beatTitle: beat.title,
          sourceType: "pack",
          sourcePackId: pack!._id as unknown as IOrderItem["sourcePackId"],
        });
      }
    }

    if (orderItems.length === 0) {
      throw new ConflictError("No valid items to checkout");
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + item.price, 0);
    const receipt = generateReceipt();

    const order = await orderRepository.create({
      buyerId: buyerId as unknown as IOrder["buyerId"],
      items: orderItems,
      totalAmount,
      status: "pending",
      receipt,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt,
      notes: {
        internalOrderId: order._id.toString(),
        buyerId,
        itemCount: String(orderItems.length),
        combined: "true",
      },
    });

    await orderRepository.attachRazorpayOrderId(order._id.toString(), razorpayOrder.id);

    logger.info("Combined checkout order created", {
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      beatItems: cartItems.length,
      packItems: packItems.length,
      totalAmount,
    });
    audit({
      action: "cart.checkout",
      userId: buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: {
        beatItems: cartItems.length,
        packItems: packItems.length,
        totalAmount,
      },
    });

    return {
      orderId: razorpayOrder.id,
      amount: totalAmount,
      currency: "INR",
      internalOrderId: order._id.toString(),
    };
  },

  /**
   * Verify Razorpay signature, record purchases, run post-purchase hooks.
   */
  async verifyAndRecord(
    input: VerifyPaymentInput,
    buyerId: string
  ): Promise<{ order: IOrder; purchases: IPurchase[] }> {
    const order = await orderRepository.findByRazorpayOrderId(input.orderId);
    if (!order) throw new NotFoundError("Order");

    if (order.buyerId.toString() !== buyerId) {
      throw new ConflictError("Order does not belong to this user");
    }

    if (order.status === "paid") {
      if (order.razorpayPaymentId && order.razorpayPaymentId !== input.paymentId) {
        throw new ConflictError("Order has already been settled with another payment");
      }
      const purchases = await purchaseRepository.findByBuyerAndOrderId(buyerId, input.orderId);
      return { order, purchases };
    }

    if (order.status !== "pending") {
      throw new ConflictError("This order can no longer be processed");
    }

    const isValid = verifySignature(input.orderId, input.paymentId, input.signature);

    if (!isValid) {
      await orderRepository.updateStatus(order._id.toString(), "failed", {
        razorpayPaymentId: input.paymentId,
        failureReason: "Invalid payment signature",
      });

      logger.warn("Payment verification failed", {
        orderId: order._id,
        razorpayOrderId: input.orderId,
      });
      audit({
        action: "payment.signature_invalid",
        userId: buyerId,
        resourceType: "order",
        resourceId: order._id.toString(),
      });

      throw new ValidationError("Payment verification failed", {
        signature: ["Invalid payment signature"],
      });
    }

    const providerPayment = await fetchPaymentById(input.paymentId);
    const expectedAmountPaise = order.totalAmount * 100;
    const providerErrors: string[] = [];

    if (providerPayment.order_id !== input.orderId) {
      providerErrors.push("Payment does not belong to this order");
    }
    if (providerPayment.status !== "captured") {
      providerErrors.push("Payment is not captured");
    }
    if (providerPayment.amount !== expectedAmountPaise) {
      providerErrors.push("Payment amount mismatch");
    }
    if (providerPayment.currency !== "INR") {
      providerErrors.push("Payment currency mismatch");
    }

    if (providerErrors.length > 0) {
      await orderRepository.updateStatus(order._id.toString(), "failed", {
        razorpayPaymentId: input.paymentId,
        failureReason: providerErrors.join("; "),
      });
      throw new ValidationError("Payment verification failed", {
        payment: providerErrors,
      });
    }

    const result = await withTransaction(async (session) => {
      const paidOrder = await orderRepository.markPaidIfPending(
        order._id.toString(),
        {
          razorpayPaymentId: input.paymentId,
          razorpaySignature: input.signature,
          paidAt: new Date(),
        },
        { session }
      );
      if (!paidOrder) {
        throw new ConflictError("This order has already been processed");
      }

      // Prefetch all beats and licenses in batch to avoid N+1
      const allItemBeatIds = paidOrder.items.map((item) => item.beatId.toString());
      const allItemLicenseIds = paidOrder.items.map((item) => item.licenseId.toString());
      const [allItemBeats, allItemLicenses] = await Promise.all([
        beatRepository.findByIds(allItemBeatIds),
        licenseRepository.findByIds(allItemLicenseIds),
      ]);
      const beatMap = new Map(allItemBeats.map((b) => [b._id.toString(), b]));
      const licenseMap = new Map(allItemLicenses.map((l) => [l._id.toString(), l]));

      const purchases: IPurchase[] = [];
      let createdCount = 0;
      let reusedCount = 0;

      for (const item of paidOrder.items) {
        const beatId = item.beatId.toString();
        const beat = beatMap.get(beatId) ?? null;
        const license = licenseMap.get(item.licenseId.toString()) ?? null;

        if (!beat) {
          throw new NotFoundError("Beat");
        }
        if (!beat.isPublished || beat.status !== "published") {
          throw new ConflictError("Beat is no longer available for purchase");
        }
        if (beat.saleMode === "pack_only" && item.sourceType !== "pack" && item.sourceType !== "upgrade") {
          throw new ConflictError("Beat is only purchasable through its beat pack");
        }
        if (!license || !license.isActive) {
          throw new ConflictError("License is no longer available");
        }
        if (license.beatId.toString() !== beatId) {
          throw new ConflictError("License does not belong to this beat");
        }

        if (item.sourceType === "upgrade") {
          const existingPurchases = await purchaseRepository.findByBuyerAndBeat(buyerId, beatId, { session });
          const existing = existingPurchases[0];
          if (!existing) {
            throw new ConflictError("Cannot upgrade: no existing purchase found");
          }
          const verifyTierRank: Record<string, number> = { basic: 0, premium: 1, unlimited: 2 };
          if ((verifyTierRank[existing.licenseType] ?? 0) >= (verifyTierRank[item.licenseType] ?? 0)) {
            throw new ConflictError(`Already at ${existing.licenseType} or higher. Cannot downgrade.`);
          }
          const upgraded = await purchaseRepository.upgradeTier(
            buyerId,
            beatId,
            {
              licenseId: item.licenseId.toString(),
              licenseType: item.licenseType,
              includesWav: license.includesWav,
              includesStems: license.includesStems,
              upgradedFrom: existing.licenseType,
              orderId: input.orderId,
              paymentId: input.paymentId,
              upgradeAmount: item.price,
            },
            { session }
          );
          if (upgraded) {
            purchases.push(upgraded);
            createdCount += 1;
          }
          continue;
        }

        try {
          const purchase = await purchaseRepository.create(
            {
              buyerId: buyerId as unknown as IPurchase["buyerId"],
              beatId: item.beatId as unknown as IPurchase["beatId"],
              licenseId: item.licenseId as unknown as IPurchase["licenseId"],
              licenseType: item.licenseType,
              includesWav: license.includesWav,
              includesStems: license.includesStems,
              orderId: input.orderId,
              paymentId: input.paymentId,
              amount: item.price,
              sourceType: item.sourceType ?? "beat",
              sourcePackId: item.sourcePackId as unknown as IPurchase["sourcePackId"],
            },
            { session }
          );
          purchases.push(purchase);
          createdCount += 1;

          await beatRepository.incrementSalesCount(beatId, { session });
          await userRepository.incrementSalesCount(beat.producerId.toString(), { session });
        } catch (error) {
          const mongoError = error as MongoLikeError;
          if (mongoError.code !== 11000) {
            throw error;
          }
          const existingPurchases = await purchaseRepository.findByBuyerAndBeat(
            buyerId,
            beatId,
            { session }
          );
          if (existingPurchases[0]) {
            purchases.push(existingPurchases[0]);
            reusedCount += 1;
            continue;
          }
          throw error;
        }
      }

      if (purchases.length === 0) {
        throw new ConflictError("Payment captured but purchase creation failed");
      }

      await cartRepository.clear(buyerId, { session });

      // Increment beat pack salesCount and clear pack cart for pack purchases
      const packIds = new Set<string>();
      for (const item of paidOrder.items) {
        if (item.sourceType === "pack" && item.sourcePackId) {
          packIds.add(item.sourcePackId.toString());
        }
      }
      for (const packId of packIds) {
        await beatPackRepository.incrementSalesCount(packId, { session });
      }

      return { paidOrder, purchases, createdCount, reusedCount };
    });

    // Clear pack cart items outside the transaction (non-critical)
    const purchasedPackIds = new Set<string>();
    for (const item of result.paidOrder.items) {
      if (item.sourceType === "pack" && item.sourcePackId) {
        purchasedPackIds.add(item.sourcePackId.toString());
      }
    }
    for (const packId of purchasedPackIds) {
      await packCartRepository.remove(buyerId, packId).catch(() => {});
    }

    logger.info("Payment verified and recorded", {
      orderId: order._id,
      purchaseCount: result.purchases.length,
      totalAmount: result.paidOrder.totalAmount,
    });
    audit({
      action: "payment.verified",
      userId: buyerId,
      resourceType: "order",
      resourceId: result.paidOrder._id.toString(),
      metadata: {
        purchaseCount: result.purchases.length,
        createdCount: result.createdCount,
        reusedCount: result.reusedCount,
        totalAmount: result.paidOrder.totalAmount,
      },
    });

    const updatedOrder = await orderRepository.findById(result.paidOrder._id.toString());

    return {
      order: updatedOrder!,
      purchases: result.purchases,
    };
  },

  /**
   * Webhook-safe fulfillment: fetch payment from Razorpay directly,
   * verify amount/status server-side, and record purchases.
   * Skips client-supplied signature because the webhook itself is
   * already authenticated via HMAC.
   */
  async fulfillFromWebhook(
    razorpayOrderId: string,
    razorpayPaymentId: string
  ): Promise<void> {
    const order = await orderRepository.findByRazorpayOrderId(razorpayOrderId);
    if (!order) return;
    if (order.status === "paid") return;
    if (order.status !== "pending") return;

    const providerPayment = await fetchPaymentById(razorpayPaymentId);
    const expectedAmountPaise = order.totalAmount * 100;

    if (
      providerPayment.order_id !== razorpayOrderId ||
      providerPayment.status !== "captured" ||
      providerPayment.amount !== expectedAmountPaise ||
      providerPayment.currency !== "INR"
    ) {
      await orderRepository.updateStatus(order._id.toString(), "failed", {
        razorpayPaymentId,
        failureReason: "Webhook fulfillment: payment validation failed",
      });
      return;
    }

    const buyerId = order.buyerId.toString();

    const result = await withTransaction(async (session) => {
      const paidOrder = await orderRepository.markPaidIfPending(
        order._id.toString(),
        {
          razorpayPaymentId,
          paidAt: new Date(),
        },
        { session }
      );
      if (!paidOrder) return null;

      const allItemBeatIds = paidOrder.items.map((item) => item.beatId.toString());
      const allItemLicenseIds = paidOrder.items.map((item) => item.licenseId.toString());
      const [allItemBeats, allItemLicenses] = await Promise.all([
        beatRepository.findByIds(allItemBeatIds),
        licenseRepository.findByIds(allItemLicenseIds),
      ]);
      const beatMap = new Map(allItemBeats.map((b) => [b._id.toString(), b]));
      const licenseMap = new Map(allItemLicenses.map((l) => [l._id.toString(), l]));

      const purchases: IPurchase[] = [];

      for (const item of paidOrder.items) {
        const beatId = item.beatId.toString();
        const beat = beatMap.get(beatId);
        const license = licenseMap.get(item.licenseId.toString());
        if (!beat || !license) continue;

        if (item.sourceType === "upgrade") {
          const existingPurchases = await purchaseRepository.findByBuyerAndBeat(buyerId, beatId, { session });
          const existing = existingPurchases[0];
          if (!existing) continue;

          const webhookTierRank: Record<string, number> = { basic: 0, premium: 1, unlimited: 2 };
          if ((webhookTierRank[existing.licenseType] ?? 0) >= (webhookTierRank[item.licenseType] ?? 0)) {
            continue;
          }

          const upgraded = await purchaseRepository.upgradeTier(
            buyerId, beatId,
            {
              licenseId: item.licenseId.toString(),
              licenseType: item.licenseType,
              includesWav: license.includesWav,
              includesStems: license.includesStems,
              upgradedFrom: existing.licenseType,
              orderId: razorpayOrderId,
              paymentId: razorpayPaymentId,
              upgradeAmount: item.price,
            },
            { session }
          );
          if (upgraded) purchases.push(upgraded);
          continue;
        }

        try {
          const purchase = await purchaseRepository.create(
            {
              buyerId: buyerId as unknown as IPurchase["buyerId"],
              beatId: item.beatId as unknown as IPurchase["beatId"],
              licenseId: item.licenseId as unknown as IPurchase["licenseId"],
              licenseType: item.licenseType,
              includesWav: license.includesWav,
              includesStems: license.includesStems,
              orderId: razorpayOrderId,
              paymentId: razorpayPaymentId,
              amount: item.price,
              sourceType: item.sourceType ?? "beat",
              sourcePackId: item.sourcePackId as unknown as IPurchase["sourcePackId"],
            },
            { session }
          );
          purchases.push(purchase);
          await beatRepository.incrementSalesCount(beatId, { session });
          await userRepository.incrementSalesCount(beat.producerId.toString(), { session });
        } catch (error) {
          const mongoError = error as MongoLikeError;
          if (mongoError.code === 11000) continue;
          throw error;
        }
      }

      if (purchases.length === 0) {
        throw new ConflictError("Webhook fulfillment: no purchases could be created");
      }

      await cartRepository.clear(buyerId, { session });

      const packIds = new Set<string>();
      for (const item of paidOrder.items) {
        if (item.sourceType === "pack" && item.sourcePackId) {
          packIds.add(item.sourcePackId.toString());
        }
      }
      for (const packId of packIds) {
        await beatPackRepository.incrementSalesCount(packId, { session });
      }

      return purchases;
    });

    if (!result || result.length === 0) return;

    logger.info("Webhook fulfillment completed", {
      orderId: order._id,
      purchaseCount: result.length,
    });
    audit({
      action: "payment.verified",
      userId: buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { source: "webhook", purchaseCount: result.length },
    });
  },

  /**
   * Mark an order as failed (called on payment dismissal or error).
   */
  async markFailed(
    razorpayOrderId: string,
    buyerId: string,
    reason: string
  ): Promise<void> {
    const order = await orderRepository.findByRazorpayOrderId(razorpayOrderId);
    if (!order) return;
    if (order.buyerId.toString() !== buyerId) return;
    if (order.status !== "pending") return;

    await orderRepository.updateStatus(order._id.toString(), "failed", {
      failureReason: reason,
    });

    logger.info("Order marked as failed", {
      orderId: order._id,
      reason,
    });
    audit({
      action: "payment.failed",
      userId: buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { reason },
    });
  },

  async getPurchasedBeatIds(buyerId: string): Promise<string[]> {
    return purchaseRepository.getPurchasedBeatIds(buyerId);
  },

  async getPurchaseHistory(buyerId: string): Promise<IPurchase[]> {
    return purchaseRepository.findByBuyerId(buyerId);
  },

  async getOrderHistory(buyerId: string): Promise<IOrder[]> {
    return orderRepository.findByBuyer(buyerId);
  },

  async getProducerEarnings(producerId: string): Promise<number> {
    return purchaseRepository.getEarningsByProducer(producerId);
  },
};
