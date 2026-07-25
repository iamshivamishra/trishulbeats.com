# Trishul Beats

Trishul Beats is a full-stack beat marketplace built with Next.js App Router where buyers discover, preview, license, and download music beats, and producers manage their catalog, pricing, and sales.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 18, Tailwind CSS 4, shadcn/ui (Base UI headless) |
| Auth | NextAuth v5 (Google OAuth + Credentials) |
| Database | MongoDB + Mongoose |
| Payments | Razorpay |
| Email | Resend |
| Storage | Pluggable — Cloudflare R2 (default) or Cloudinary |
| Testing | Vitest |
| CI | GitHub Actions |

## Quick Start

```bash
npm install
cp .env.example .env   # fill required variables
npm run dev             # http://localhost:3000
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript `--noEmit` |
| `npm run test` | Run tests |
| `npm run test:coverage` | Tests with coverage |
| `npm run check` | lint + typecheck + test + build |
| `npm run migrate:storage-keys` | Backfill beat storage keys |

## Environment Variables

See `.env.example` for all expected variables. Core groups:

- **App / Auth** — `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Database** — `MONGODB_URI`
- **Payments** — `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- **Storage** — `STORAGE_PROVIDER` (`r2` or `cloudinary`), R2 or Cloudinary credentials
- **Email** — `RESEND_API_KEY`
- **Analytics** — `NEXT_PUBLIC_GA_ID`

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Pages    │  │ Features     │  │ Components + UI       │  │
│  │ (app/)   │  │ (features/)  │  │ (components/)         │  │
│  └────┬─────┘  └──────────────┘  └───────────────────────┘  │
├───────┼─────────────────────────────────────────────────────┤
│       │         Proxy (src/proxy.ts + NextAuth)             │
├───────┼─────────────────────────────────────────────────────┤
│       ▼                                                     │
│  ┌──────────┐                                               │
│  │ API      │──▶ Services ──▶ Repositories ──▶ MongoDB     │
│  │ Routes   │       │                                       │
│  └──────────┘       ├──▶ Razorpay                          │
│                     ├──▶ R2 / Cloudinary                   │
│                     └──▶ Resend                            │
└─────────────────────────────────────────────────────────────┘
```

### Layering Rules

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Pages / Route Handlers** | Orchestration only — fetch data, render UI | `src/app/beats/[id]/page.tsx` |
| **Services** | Business logic, validation, cross-domain rules | `src/lib/services/payment.service.ts` |
| **Repositories** | Database queries and persistence | `src/lib/repositories/beat.repository.ts` |
| **Serializers** | DTO shaping for UI and API responses | `src/lib/serializers/beat.ts` |
| **Validators** | Zod schemas for request/input validation | `src/lib/validators/beat.ts` |

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth pages (login, signup, forgot/reset password)
│   ├── (dashboard)/        # Protected pages (profile, studio, admin, upload)
│   │   ├── admin/          # Admin: users, beats, sales management
│   │   ├── profile/        # User profile + edit
│   │   ├── studio/         # Producer studio: beats, packs, sales, analytics
│   │   └── upload/         # Beat upload page
│   ├── api/                # API route handlers
│   ├── beat-packs/         # Public beat pack listing + detail
│   ├── beats/              # Public beats catalog + detail
│   ├── cart/               # Shopping cart
│   ├── producer/[username] # Public producer profiles
│   ├── layout.tsx          # Root layout (fonts, providers, GA)
│   ├── page.tsx            # Home page
│   ├── sitemap.ts          # Dynamic sitemap
│   └── robots.ts           # Robots.txt
│
├── components/             # Shared React components
│   ├── layout/             # DashboardShell (sidebar nav)
│   ├── ui/                 # Primitives (button, card, dialog, etc.)
│   ├── AudioPlayerContext  # Global audio state (actions + progress contexts)
│   ├── BeatCard            # Beat listing card
│   ├── BottomPlayer        # Persistent bottom audio player
│   ├── Waveform            # Canvas waveform visualizer (rAF-driven)
│   ├── LicenseSelector     # License tier selection + checkout
│   ├── CartProvider         # Cart state management
│   ├── ShareDialog         # Social sharing dialog
│   └── ...                 # Navbar, Footer, Forms, etc.
│
├── features/               # Feature-scoped modules
│   ├── beats/              # Beat pack UI types and helpers
│   ├── studio/             # Studio dashboard, beat/pack editors, sales
│   └── payments/           # Reserved for payment DTOs
│
├── lib/                    # Core backend
│   ├── api/                # Typed client-side HTTP helpers
│   ├── models/             # Mongoose models
│   ├── repositories/       # Data access layer
│   ├── serializers/        # DTO shaping
│   ├── services/           # Business logic
│   ├── storage/            # R2 + Cloudinary adapters
│   ├── validators/         # Zod schemas
│   ├── security/           # ObjectId validation, entitlements
│   ├── auth.ts             # NextAuth configuration
│   ├── db.ts               # Mongoose connection
│   ├── rate-limit.ts       # Rate limiter (MongoDB-backed + in-memory fallback)
│   └── razorpay.ts         # Razorpay client
│
├── types/                  # Shared TypeScript interfaces
└── proxy.ts                # Next.js proxy (route protection)
```

### Data Models

```
User ──────┐
  │        │
  │ produces    │ buys
  ▼        ▼
Beat ◄──── Purchase
  │           │
  ├── License │
  │           │
  └── BeatPack ◄── Order (line items)
        │
     PackCart ──── Cart
```

| Model | Purpose |
|-------|---------|
| **User** | Accounts, roles (`buyer`, `producer`, `admin`), profile fields, social links |
| **Beat** | Metadata, audio URLs, storage keys, status, plays, sales count |
| **BeatPack** | Curated beat collections with tiered pricing |
| **License** | Per-beat license tiers (basic, premium, unlimited) with pricing |
| **Cart / PackCart** | Shopping carts for individual beats and packs |
| **Order** | Razorpay checkout orders with line items |
| **Purchase** | Completed purchases — buyer entitlements |
| **Like / Follow** | Social engagement (beat likes, producer follows) |

### Services

| Service | Responsibility |
|---------|---------------|
| `beatService` | Beat CRUD, publishing, storage URL generation |
| `beatPackService` | Pack lifecycle management |
| `paymentService` | Razorpay order creation, verification, webhook handling |
| `cartService` / `packCartService` | Cart management |
| `marketplaceService` | Filtered beat listings |
| `licenseService` | License tier management per beat |
| `downloadService` | Signed download URLs, entitlement checks |
| `storageService` | Unified facade for R2/Cloudinary uploads, presigning, downloads |
| `studioService` | Producer analytics and sales data |
| `authService` | Signup, password reset flows |
| `emailService` | Transactional emails via Resend |
| `likeService` / `followService` | Social engagement |

### API Routes

| Domain | Routes |
|--------|--------|
| **Auth** | `/api/auth/[...nextauth]`, signup, forgot/reset password, onboarding |
| **Beats** | CRUD, licenses, likes, plays, downloads |
| **Beat Packs** | CRUD, cover upload, producer beats listing |
| **Cart** | Beat cart + pack cart operations |
| **Marketplace** | Filtered catalog listing |
| **Payments** | Order creation, verification, webhook, failure |
| **Studio** | Analytics, sales data |
| **User** | Profile, image upload, downloads, purchases |
| **Admin** | User/beat management (via server actions) |

### Authentication & Authorization

- **Providers**: Google OAuth + email/password credentials
- **Session**: JWT strategy, 7-day max age
- **Roles**: `buyer` → `producer` → `admin`
- **Route protection**: `src/proxy.ts` (Next.js proxy) + NextAuth `authorized` callback
- **Dashboard layout**: Additional `auth()` check with redirect
- **Admin layout**: Returns `notFound()` for non-admin users

### Storage

File uploads support two backends configured via `STORAGE_PROVIDER`:

| Backend | Use Case |
|---------|----------|
| **Cloudflare R2** (default) | Production — presigned uploads, signed downloads |
| **Cloudinary** | Alternative — authenticated delivery |

**Key structure**: `producers/{producerId}/beats/{beatId}/{preview|master|stems|artwork}.{ext}`

**Upload flow**: Client requests presigned URL → uploads directly to storage → confirms with API

### User Journeys

| Role | Capabilities |
|------|-------------|
| **Buyer** | Browse beats/packs, preview audio, add to cart, Razorpay checkout, download purchased files |
| **Producer** | Upload beats, manage licenses and packs, studio dashboard with analytics and sales |
| **Admin** | User management, beat moderation, platform-wide sales overview |

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs `npm run check` (lint, typecheck, test, build) on pushes and pull requests.
