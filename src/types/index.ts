import type { Types } from "mongoose";

export type UserRole = "buyer" | "producer" | "admin";

export interface IUser {
  _id: string | Types.ObjectId;
  name: string;
  email: string;
  image?: string;
  password?: string;
  role: UserRole;
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  genres?: string[];
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    twitter?: string;
    website?: string;
    spotify?: string;
    soundcloud?: string;
  };
  verified?: boolean;
  followersCount?: number;
  salesCount?: number;
  resetToken?: string;
  resetTokenPrefix?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBeatStorageKeys {
  preview?: string;
  master?: string;
  stems?: string;
  artwork?: string;
}

export type BeatStatus = "draft" | "published" | "archived";

export interface IBeat {
  _id: string | Types.ObjectId;
  title: string;
  description?: string;
  producerId: string | Types.ObjectId;
  producerName?: string;
  producerUsername?: string;
  bpm?: number;
  key?: string;
  genre: string;
  tags: string[];
  mood?: string;
  duration: number;
  audioTaggedUrl: string;
  audioFullUrl: string;
  stemsUrl?: string;
  coverUrl?: string;
  storageKeys?: IBeatStorageKeys;
  status: BeatStatus;
  plays: number;
  salesCount: number;
  likesCount: number;
  isPublished: boolean;
  saleMode?: "single" | "pack_only";
  packId?: string | Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type BeatPackStatus = "draft" | "published" | "archived";

export interface IBeatPack {
  _id: string | Types.ObjectId;
  title: string;
  metadata?: string;
  description?: string;
  producerId: string | Types.ObjectId;
  coverUrl?: string;
  imageUrls: string[];
  tags: string[];
  beatIds: Array<string | Types.ObjectId>;
  prices: {
    basic: number;
    premium: number;
    unlimited: number;
  };
  status: BeatPackStatus;
  isPublished: boolean;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILike {
  _id?: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  beatId: string | Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type LicenseType = "basic" | "premium" | "unlimited";

export interface ILicense {
  _id: string | Types.ObjectId;
  beatId: string | Types.ObjectId;
  type: LicenseType;
  name: string;
  price: number;
  streamLimit: number;
  includesWav: boolean;
  includesStems: boolean;
  commercialUse: boolean;
  terms: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPurchase {
  _id: string | Types.ObjectId;
  buyerId: string | Types.ObjectId;
  beatId: string | Types.ObjectId;
  licenseId: string | Types.ObjectId;
  licenseType: "basic" | "premium" | "unlimited" | "exclusive";
  includesWav?: boolean;
  includesStems?: boolean;
  orderId: string;
  paymentId: string;
  amount: number;
  sourceType?: "beat" | "pack" | "upgrade";
  sourcePackId?: string | Types.ObjectId;
  upgradedFrom?: string;
  upgradedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = "pending" | "paid" | "failed" | "refunded";

export interface IOrderItem {
  beatId: string | Types.ObjectId;
  licenseId: string | Types.ObjectId;
  licenseType: LicenseType;
  price: number;
  beatTitle: string;
  sourceType?: "beat" | "pack" | "upgrade";
  sourcePackId?: string | Types.ObjectId;
}

export interface IOrder {
  _id: string | Types.ObjectId;
  buyerId: string | Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  subtotalAmount?: number;
  discountAmount: number;
  couponCode?: string;
  couponId?: string | Types.ObjectId;
  discountPerPack?: Record<string, number>;
  status: OrderStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  receipt: string;
  failureReason?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICartItem {
  _id?: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  beatId: string | Types.ObjectId;
  licenseId: string | Types.ObjectId;
  addedAt: Date;
}

export interface CartItemPopulated {
  beatId: string;
  licenseId: string;
  beatTitle: string;
  beatCoverUrl?: string;
  beatGenre: string;
  producerName: string;
  licenseName: string;
  licenseType: LicenseType;
  price: number;
}

export interface IBeatPackCartItem {
  _id?: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  packId: string | Types.ObjectId;
  tier: LicenseType;
  addedAt: Date;
}

export interface BeatPackCartItemPopulated {
  packId: string;
  packTitle: string;
  tier: LicenseType;
  price: number;
  beatCount: number;
  producerName: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type PackLicenseCertificateStatus = "active" | "superseded";

export interface IPackLicenseCertificateSnapshot {
  name: string;
  email: string;
}

export interface IPackLicenseCertificatePackSnapshot {
  title: string;
  beatTitles: string[];
}

export interface IPackLicenseCertificate {
  _id: string | Types.ObjectId;
  buyerId: string | Types.ObjectId;
  packId: string | Types.ObjectId;
  orderId: string;
  licenseNumber: string;
  licenseType: LicenseType;
  status: PackLicenseCertificateStatus;
  storageKey: string;
  supersededBy?: string | Types.ObjectId;
  previousCertificateId?: string | Types.ObjectId;
  upgradedFrom?: string;
  buyerSnapshot: IPackLicenseCertificateSnapshot;
  packSnapshot: IPackLicenseCertificatePackSnapshot;
  amountPaid: number;
  verificationHash: string;
  effectiveAt: Date;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CouponDiscountType = "flat" | "percentage";

export type CouponStatus =
  | "draft"
  | "active"
  | "scheduled"
  | "paused"
  | "expired"
  | "exhausted";

export interface ICoupon {
  _id: string | Types.ObjectId;
  code: string;
  producerId: string | Types.ObjectId;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountCap?: number;
  minOrderAmount?: number;
  applicablePacks: Array<string | Types.ObjectId>;
  restrictedToUsers: Array<string | Types.ObjectId>;
  restrictedToEmails: string[];
  startsAt: Date;
  expiresAt: Date;
  maxUses: number;
  maxUsesPerUser: number;
  currentUses: number;
  isDraft: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICouponUsage {
  _id: string | Types.ObjectId;
  couponId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  orderId: string;
  packId: string | Types.ObjectId;
  discount: number;
  usedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BeatFilters {
  genre?: string;
  bpm?: { min?: number; max?: number };
  key?: string;
  mood?: string;
  tags?: string[];
  search?: string;
  producer?: string;
  producerId?: string;
  isPublished?: boolean;
}
