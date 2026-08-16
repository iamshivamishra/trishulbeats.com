import type { LicenseType } from "@/types";

export interface LicenseClause {
  title: string;
  items: string[];
}

export interface LicenseClauses {
  filesDelivered: string;
  royalties: string;
  credit: string;
  term: string;
  proofOfPurchase: string;
  copyrightOwner: string;
  usageRights: LicenseClause;
  restrictions: LicenseClause;
  refundPolicy: string;
  effectiveDate: string;
  ownership: string;
  governingLaw: string;
}

const COMMON = {
  royalties:
    "Licensee retains 100% of royalties earned from songs created using the licensed beat(s).",
  credit:
    'Licensee must credit the Licensor in all public releases as: "Produced by Trishul Beats."',
  term:
    "The term of this Agreement is ninety-nine (99) years from the date of purchase.",
  proofOfPurchase:
    "Proof of purchase (invoice or receipt) shall serve as valid evidence of this license and its terms.",
  copyrightOwner:
    "Licensor remains the sole copyright owner of the original instrumental(s) at all times.",
  refundPolicy:
    "All sales are final. No refunds, cancellations, or exchanges will be provided once the licensed files have been delivered.",
  effectiveDate:
    "This Agreement becomes effective on the date of purchase, as indicated on the Licensee's invoice or receipt.",
  ownership:
    "The Licensor, Rajan Kumar Mishra (Trishul Beats), retains all ownership rights, title, and interest in and to the original beat(s). This Agreement grants the Licensee a non-exclusive license for the usage described above; no transfer of copyright or ownership occurs under this Agreement.",
  governingLaw:
    "This Agreement shall be governed by and construed in accordance with the laws of India, being the Licensor's country of residence.",
};

const COMMON_RESTRICTIONS = [
  "Reselling, leasing, sublicensing, or redistributing the beat(s) in any form.",
  "Claiming ownership or authorship of the original instrumental(s).",
  "Registering the beat(s) or any derivative work in YouTube Content ID or similar rights-management systems.",
  "Using the beat(s) for unlawful, defamatory, or offensive purposes.",
];

const TIER_CLAUSES: Record<LicenseType, Pick<LicenseClauses, "filesDelivered" | "usageRights" | "restrictions">> = {
  basic: {
    filesDelivered:
      "Licensee shall receive MP3 files, delivered in ZIP format.",
    usageRights: {
      title: "Usage Rights",
      items: [
        "Non-commercial use only. Personal projects and demos.",
        "Up to 5,000 streams across digital platforms.",
        "Up to 1 non-monetized music video.",
        "Non-commercial live performances.",
        'Credit required: "Produced by Trishul Beats."',
      ],
    },
    restrictions: {
      title: "Restrictions",
      items: [
        ...COMMON_RESTRICTIONS,
        "Using the beat(s) for commercial purposes without upgrading to a Premium or Unlimited license.",
        "Monetizing music videos or other content created with the beat(s).",
      ],
    },
  },

  premium: {
    filesDelivered:
      "Licensee shall receive MP3 and WAV files, delivered in ZIP format.",
    usageRights: {
      title: "Usage Rights",
      items: [
        "Full commercial use allowed.",
        "Up to 50,000 streams across all digital platforms.",
        "Unlimited music videos, including monetized YouTube content.",
        "Live performances and paid shows or events.",
        "Radio and television broadcast.",
        "Digital distribution on Spotify, Apple Music, iTunes, and similar platforms.",
      ],
    },
    restrictions: {
      title: "Restrictions",
      items: COMMON_RESTRICTIONS,
    },
  },

  unlimited: {
    filesDelivered:
      "Licensee shall receive MP3, WAV, and trackout STEMS files, delivered in ZIP format.",
    usageRights: {
      title: "Usage Rights",
      items: [
        "Full commercial use allowed.",
        "Unlimited streaming across all digital platforms.",
        "Unlimited music videos, including monetized YouTube content.",
        "Live performances and paid shows or events.",
        "Radio and television broadcast.",
        "Unlimited digital distribution on Spotify, Apple Music, iTunes, and similar platforms.",
      ],
    },
    restrictions: {
      title: "Restrictions",
      items: COMMON_RESTRICTIONS,
    },
  },
};

export function getClauses(tier: LicenseType): LicenseClauses {
  const tierSpecific = TIER_CLAUSES[tier];
  return {
    filesDelivered: tierSpecific.filesDelivered,
    royalties: COMMON.royalties,
    credit: COMMON.credit,
    term: COMMON.term,
    proofOfPurchase: COMMON.proofOfPurchase,
    copyrightOwner: COMMON.copyrightOwner,
    usageRights: tierSpecific.usageRights,
    restrictions: tierSpecific.restrictions,
    refundPolicy: COMMON.refundPolicy,
    effectiveDate: COMMON.effectiveDate,
    ownership: COMMON.ownership,
    governingLaw: COMMON.governingLaw,
  };
}
