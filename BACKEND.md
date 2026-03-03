r# Paikari — Backend Developer Guide

> **Version:** 1.0 · **Stack:** Next.js 16 App Router · **DB:** PostgreSQL + Prisma ORM  
> **Platform:** Wholesale B2B live auction marketplace (Bangladesh)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Environment Setup & Installation](#3-environment-setup--installation)
4. [Database Design (Prisma Schema)](#4-database-design-prisma-schema)
5. [Authentication (NextAuth v5)](#5-authentication-nextauth-v5)
6. [API Routes Reference](#6-api-routes-reference)
7. [Business Logic & Workflows](#7-business-logic--workflows)
8. [Wallet & Payments](#8-wallet--payments)
9. [Real-Time Bidding (WebSocket)](#9-real-time-bidding-websocket)
10. [File Uploads (Cloudinary)](#10-file-uploads-cloudinary)
11. [Notifications](#11-notifications)
12. [Role-Based Access Control](#12-role-based-access-control)
13. [Deployment Checklist](#13-deployment-checklist)

---

## 1. Architecture Overview

```
Browser
  │
  ├── Next.js App Router (src/app/)
  │     ├── Server Components  → read DB directly via Prisma
  │     ├── Client Components  → call API routes via src/lib/api.ts
  │     └── Server Actions     → mutations (form submissions)
  │
  ├── /api/* (Next.js Route Handlers)
  │     ├── /api/auth         → NextAuth
  │     ├── /api/lots         → lot CRUD
  │     ├── /api/bids         → bid placement
  │     ├── /api/orders       → order management
  │     ├── /api/wallet       → balance / transactions
  │     ├── /api/qc           → QC report submission
  │     ├── /api/hub          → hub inbound / dispatch
  │     ├── /api/admin        → admin management
  │     └── /api/ws           → WebSocket upgrade (Pusher)
  │
  └── PostgreSQL  ←─── Prisma ORM
        └── Redis (optional — bid caching, rate limiting)
```

### Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| ORM | Prisma | Type-safe, migration-based |
| Auth | NextAuth v5 (credentials) | Built into Next.js, JWT session |
| Real-time | Pusher (or Ably) | Serverless-compatible WebSocket |
| File storage | Cloudinary | Free tier, direct upload |
| Payment | SSLCommerz / bKash | Bangladesh-specific |
| Email | Resend (or SendGrid) | Transactional email |

---

## 2. Technology Stack

### Install these packages

```bash
# Core backend
npm install @prisma/client prisma
npm install next-auth@beta  # NextAuth v5
npm install bcryptjs @types/bcryptjs
npm install jsonwebtoken @types/jsonwebtoken

# Real-time
npm install pusher pusher-js

# Storage
npm install cloudinary

# Email
npm install resend

# Utilities
npm install nanoid       # short IDs for lot/order numbers
npm install date-fns     # already installed
```

### Initialize Prisma

```bash
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.

---

## 3. Environment Setup & Installation

### 3.1 `.env` file (create in project root)

```env
# ─── Database ────────────────────────────────────────────────
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/paikari?schema=public"

# ─── NextAuth ────────────────────────────────────────────────
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"

# ─── App ─────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=""          # empty = same origin (Next.js API routes)
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# ─── Pusher (real-time bidding) ───────────────────────────────
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
PUSHER_CLUSTER="ap2"            # ap2 = Asia Pacific (Singapore)
NEXT_PUBLIC_PUSHER_KEY="your-key"
NEXT_PUBLIC_PUSHER_CLUSTER="ap2"

# ─── Cloudinary (file uploads) ───────────────────────────────
CLOUDINARY_CLOUD_NAME="your-cloud"
CLOUDINARY_API_KEY="your-key"
CLOUDINARY_API_SECRET="your-secret"

# ─── Email (Resend) ───────────────────────────────────────────
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="noreply@paikari.com"

# ─── Payment (SSLCommerz) ────────────────────────────────────
SSLCOMMERZ_STORE_ID="your-store-id"
SSLCOMMERZ_STORE_PASSWORD="your-password"
SSLCOMMERZ_SANDBOX="true"       # "false" in production
```

### 3.2 Database Setup

```bash
# 1. Create the database (PostgreSQL must be running)
createdb paikari

# 2. Apply the schema (after copying schema.prisma from section 4)
npx prisma migrate dev --name init

# 3. Generate the Prisma client
npx prisma generate

# 4. (Optional) Seed with test data
npx prisma db seed
```

### 3.3 File structure to create

```
src/
  lib/
    db.ts          ← Prisma singleton (create this first)
    auth.ts        ← NextAuth config
    pusher.ts      ← Pusher server instance
    cloudinary.ts  ← Cloudinary config
    email.ts       ← Resend email helpers
  app/
    api/
      auth/
        [...nextauth]/
          route.ts
      lots/
        route.ts          GET (list) · POST (create)
        [id]/
          route.ts        GET · PATCH · DELETE
          bids/
            route.ts      GET · POST (place bid)
      orders/
        route.ts          GET
        [id]/
          route.ts        GET · PATCH
      wallet/
        route.ts          GET balance + transactions
        deposit/
          route.ts        POST
        withdraw/
          route.ts        POST
      qc/
        reports/
          route.ts        GET · POST
      hub/
        inbound/
          route.ts        GET · POST (receive)
        dispatch/
          route.ts        GET · POST
      admin/
        users/
          route.ts        GET · PATCH
        lots/
          route.ts        GET
      upload/
        route.ts          POST (Cloudinary signed upload)
```

### 3.4 `src/lib/db.ts` — Prisma Singleton

```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

---

## 4. Database Design (Prisma Schema)

Copy this entire block into `prisma/schema.prisma`:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum Role {
  BUYER
  SELLER
  ADMIN
  HUB_MANAGER
  QC_LEADER
  QC_CHECKER
  DELIVERY_POINT
}

enum LotStatus {
  DRAFT
  PENDING_DELIVERY    // seller submitted; waiting to be received at hub
  AT_HUB              // received at hub
  IN_QC               // assigned to QC checker
  QC_PASSED
  QC_FAILED
  SCHEDULED           // QC passed; auction time set
  LIVE                // auction in progress
  AUCTION_ENDED       // bidding closed
  PAID                // winning buyer paid
  DISPATCHED          // sent to delivery point
  AT_DELIVERY_POINT
  DELIVERED
  RETURNED
}

enum Grade {
  A
  B
  C
}

enum Unit {
  KG
  PIECE
  DOZEN
  CRATE
  BAG
  BOX
}

enum BidStatus {
  ACTIVE
  OUTBID
  WON
  LOST
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  PROCESSING
  DISPATCHED
  AT_DELIVERY_POINT
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum QCVerdict {
  PENDING
  PASSED
  FAILED
  CONDITIONAL
}

enum DisputeStatus {
  OPEN
  IN_REVIEW
  RESOLVED
  CLOSED
}

enum WalletTxType {
  CREDIT
  DEBIT
  HOLD        // funds held when bid placed
  RELEASE     // hold released when outbid
}

enum DeliveryMethod {
  HUB_PICKUP
  COURIER
}

// ─── Users & Auth ────────────────────────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified DateTime?
  phone         String?   @unique
  passwordHash  String
  role          Role      @default(BUYER)
  isVerified    Boolean   @default(false)
  isActive      Boolean   @default(true)
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  sellerProfile  SellerProfile?
  buyerProfile   BuyerProfile?
  wallet         Wallet?
  lotsCreated    Lot[]          @relation("SellerLots")
  bids           Bid[]
  ordersAsBuyer  Order[]        @relation("BuyerOrders")
  ordersAsSeller Order[]        @relation("SellerOrders")
  qcReports      QCReport[]     @relation("InspectorReports")
  assignedLots   Lot[]          @relation("QCAssignedLots")
  reviews        Review[]       @relation("ReviewerReviews")
  reviewsReceived Review[]      @relation("RevieweeReviews")
  disputes       Dispute[]      @relation("DisputeRaiser")
  messagesThreads MessageThread[] @relation("ThreadParticipant")
  messagesSent   Message[]
  notifications  Notification[]
  hubManaged     Hub?           @relation("HubManager")
  deliveryPointManaged DeliveryPoint? @relation("DPOperator")

  @@index([email])
  @@index([role])
}

model SellerProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  businessName  String
  ownerName     String
  address       String
  city          String?
  nid           String   @unique
  tradeLicense  String   @unique
  bankName      String?
  accountName   String?
  accountNumber String?
  routingNumber String?
  mobileBanking String?
  mobileNumber  String?
  isKycApproved Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model BuyerProfile {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  businessName String
  address      String?
  city         String?
  nid          String   @unique
  tradeLicense String   @unique
  isKycApproved Boolean @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// ─── Hubs & Delivery Points ──────────────────────────────────────────────────

model Hub {
  id          String   @id @default(cuid())
  name        String
  city        String
  address     String
  managerId   String?  @unique
  manager     User?    @relation("HubManager", fields: [managerId], references: [id])
  lots        Lot[]
  createdAt   DateTime @default(now())

  @@index([city])
}

model DeliveryPoint {
  id          String   @id @default(cuid())
  name        String
  city        String
  address     String
  operatorId  String?  @unique
  operator    User?    @relation("DPOperator", fields: [operatorId], references: [id])
  orders      Order[]
  createdAt   DateTime @default(now())

  @@index([city])
}

// ─── Lots ────────────────────────────────────────────────────────────────────

model Lot {
  id              String    @id @default(cuid())
  lotNumber       String    @unique  // e.g. "L2026-001"
  title           String
  description     String
  category        String
  grade           Grade
  unit            Unit
  quantity        Float
  basePrice       Float
  currentPrice    Float     @default(0)
  status          LotStatus @default(DRAFT)

  sellerId        String
  seller          User      @relation("SellerLots", fields: [sellerId], references: [id])

  hubId           String?
  hub             Hub?      @relation(fields: [hubId], references: [id])

  qcAssigneeId    String?
  qcAssignee      User?     @relation("QCAssignedLots", fields: [qcAssigneeId], references: [id])

  auctionStartsAt DateTime?
  auctionEndsAt   DateTime?
  finalPrice      Float?
  winnerId        String?

  photos          LotPhoto[]
  bids            Bid[]
  qcReports       QCReport[]
  orders          Order[]
  inboundReceipts InboundReceipt[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([status])
  @@index([category])
  @@index([sellerId])
  @@index([hubId])
  @@index([auctionStartsAt])
}

model LotPhoto {
  id        String   @id @default(cuid())
  lotId     String
  lot       Lot      @relation(fields: [lotId], references: [id], onDelete: Cascade)
  url       String
  source    String   // "SELLER" | "QC"
  createdAt DateTime @default(now())
}

// ─── Bidding ─────────────────────────────────────────────────────────────────

model Bid {
  id        String    @id @default(cuid())
  lotId     String
  lot       Lot       @relation(fields: [lotId], references: [id])
  bidderId  String
  bidder    User      @relation(fields: [bidderId], references: [id])
  amount    Float
  status    BidStatus @default(ACTIVE)
  isAutoBid Boolean   @default(false)
  createdAt DateTime  @default(now())

  @@index([lotId])
  @@index([bidderId])
  @@index([lotId, amount])  // fast max-bid lookup
}

model AutoBid {
  id              String   @id @default(cuid())
  lotId           String
  buyerId         String
  maxAmount       Float
  incrementAmount Float    @default(100)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([lotId, buyerId])
  @@index([lotId])
}

// ─── Orders ──────────────────────────────────────────────────────────────────

model Order {
  id               String         @id @default(cuid())
  orderNumber      String         @unique  // e.g. "ORD-2026-001"
  lotId            String
  lot              Lot            @relation(fields: [lotId], references: [id])
  buyerId          String
  buyer            User           @relation("BuyerOrders", fields: [buyerId], references: [id])
  sellerId         String
  seller           User           @relation("SellerOrders", fields: [sellerId], references: [id])
  totalAmount      Float
  platformFee      Float          @default(0)  // e.g. 2% of totalAmount
  sellerPayout     Float          @default(0)  // totalAmount - platformFee
  status           OrderStatus    @default(PENDING_PAYMENT)
  deliveryMethod   DeliveryMethod @default(HUB_PICKUP)
  deliveryPointId  String?
  deliveryPoint    DeliveryPoint? @relation(fields: [deliveryPointId], references: [id])
  payments         Payment[]
  disputes         Dispute[]
  reviews          Review[]
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@index([buyerId])
  @@index([sellerId])
  @@index([status])
}

// ─── Payments & Wallet ───────────────────────────────────────────────────────

model Wallet {
  id           String              @id @default(cuid())
  userId       String              @unique
  user         User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  balance      Float               @default(0)
  heldBalance  Float               @default(0)  // funds locked in active bids
  transactions WalletTransaction[]
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
}

model WalletTransaction {
  id          String       @id @default(cuid())
  walletId    String
  wallet      Wallet       @relation(fields: [walletId], references: [id])
  type        WalletTxType
  amount      Float
  description String
  referenceId String?      // orderId, bidId, etc.
  createdAt   DateTime     @default(now())

  @@index([walletId])
  @@index([createdAt])
}

model Payment {
  id          String        @id @default(cuid())
  orderId     String
  order       Order         @relation(fields: [orderId], references: [id])
  buyerId     String
  amount      Float
  status      PaymentStatus @default(PENDING)
  method      String        // "WALLET" | "CARD" | "BANK_TRANSFER" | "MOBILE_BANKING"
  gatewayRef  String?       // SSLCommerz transaction ID
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([orderId])
  @@index([buyerId])
}

// ─── QC ──────────────────────────────────────────────────────────────────────

model QCReport {
  id           String    @id @default(cuid())
  lotId        String
  lot          Lot       @relation(fields: [lotId], references: [id])
  inspectorId  String
  inspector    User      @relation("InspectorReports", fields: [inspectorId], references: [id])
  verdict      QCVerdict @default(PENDING)
  grade        Grade?
  notes        String
  weight       Float?    // actual weighed quantity
  defectRate   Float?    // percentage 0-100
  photos       String[]  // Cloudinary URLs added during inspection
  createdAt    DateTime  @default(now())

  @@index([lotId])
  @@index([inspectorId])
}

model InboundReceipt {
  id           String   @id @default(cuid())
  lotId        String
  lot          Lot      @relation(fields: [lotId], references: [id])
  receivedById String
  receivedQty  Float
  condition    String   // "GOOD" | "DAMAGED" | "PARTIAL"
  notes        String?
  createdAt    DateTime @default(now())
}

// ─── Messaging ───────────────────────────────────────────────────────────────

model MessageThread {
  id           String    @id @default(cuid())
  lotId        String?
  lastMessage  String?
  participants User[]    @relation("ThreadParticipant")
  messages     Message[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([updatedAt])
}

model Message {
  id        String        @id @default(cuid())
  threadId  String
  thread    MessageThread @relation(fields: [threadId], references: [id])
  senderId  String
  sender    User          @relation(fields: [senderId], references: [id])
  body      String
  createdAt DateTime      @default(now())

  @@index([threadId])
  @@index([createdAt])
}

// ─── Reviews, Disputes, Notifications ───────────────────────────────────────

model Review {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id])
  reviewerId  String
  reviewer    User     @relation("ReviewerReviews", fields: [reviewerId], references: [id])
  revieweeId  String
  reviewee    User     @relation("RevieweeReviews", fields: [revieweeId], references: [id])
  rating      Int      // 1-5
  comment     String?
  createdAt   DateTime @default(now())

  @@unique([orderId, reviewerId])  // one review per order per reviewer
  @@index([revieweeId])
}

model Dispute {
  id          String        @id @default(cuid())
  orderId     String
  order       Order         @relation(fields: [orderId], references: [id])
  raisedById  String
  raisedBy    User          @relation("DisputeRaiser", fields: [raisedById], references: [id])
  reason      String
  status      DisputeStatus @default(OPEN)
  resolution  String?
  resolvedAt  DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([status])
  @@index([orderId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String   // "BID_OUTBID" | "AUCTION_WON" | "ORDER_UPDATED" | etc.
  title     String
  body      String
  read      Boolean  @default(false)
  link      String?  // route to navigate to
  createdAt DateTime @default(now())

  @@index([userId, read])
  @@index([createdAt])
}
```

---

## 5. Authentication (NextAuth v5)

### 5.1 `src/lib/auth.ts`

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(6),
          role: z.string(),
        }).safeParse(credentials);

        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.isActive) return null;
        if (user.role.toLowerCase() !== parsed.data.role) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
});
```

### 5.2 `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

### 5.3 TypeScript augmentation — `src/types/next-auth.d.ts`

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
```

### 5.4 Registration endpoint — `src/app/api/auth/register/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signUpSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });
  }

  const { company, email, password, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ message: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      name: company,
      email,
      passwordHash,
      role: role.toUpperCase() as "BUYER" | "SELLER",
      wallet: { create: { balance: 0 } },
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
```

---

## 6. API Routes Reference

The frontend `src/lib/api.ts` uses `NEXT_PUBLIC_API_URL` (empty = same origin). All routes live under `/api/`.

### Auth
| Method | Path | Body / Query | Response | Access |
|---|---|---|---|---|
| POST | `/api/auth/register` | `{company, email, password, role}` | `{id, email}` | Public |
| POST | `/api/auth/signin` | NextAuth handled | JWT session | Public |
| POST | `/api/auth/forgot-password` | `{email}` | `204` | Public |
| POST | `/api/auth/reset-password` | `{token, password}` | `204` | Public |

### Lots
| Method | Path | Body / Query | Response | Access |
|---|---|---|---|---|
| GET | `/api/lots` | `?status=LIVE&category=&page=` | `PaginatedResponse<Lot>` | Public |
| POST | `/api/lots` | `CreateLotFormData` | `Lot` | SELLER |
| GET | `/api/lots/[id]` | — | `Lot` | Public |
| PATCH | `/api/lots/[id]` | partial `Lot` fields | `Lot` | SELLER (own) / ADMIN |
| DELETE | `/api/lots/[id]` | — | `204` | SELLER (own) / ADMIN |
| GET | `/api/lots/[id]/bids` | `?page=` | `PaginatedResponse<Bid>` | Authenticated |
| POST | `/api/lots/[id]/bids` | `{amount}` | `Bid` | BUYER |

### Orders
| Method | Path | Body / Query | Response | Access |
|---|---|---|---|---|
| GET | `/api/orders` | `?buyerId= &sellerId= &status=` | `PaginatedResponse<Order>` | Own orders |
| GET | `/api/orders/[id]` | — | `Order` | Owner |
| PATCH | `/api/orders/[id]` | `{status}` | `Order` | HUB_MANAGER / DELIVERY_POINT / ADMIN |

### Wallet
| Method | Path | Body / Query | Response | Access |
|---|---|---|---|---|
| GET | `/api/wallet` | — | `{balance, heldBalance, transactions[]}` | Owner |
| POST | `/api/wallet/deposit` | `{amount, method}` | `WalletTransaction` | BUYER / SELLER |
| POST | `/api/wallet/withdraw` | `{amount, bankAccount}` | `WalletTransaction` | SELLER |

### QC
| Method | Path | Body / Query | Response | Access |
|---|---|---|---|---|
| GET | `/api/qc/reports` | `?lotId= &inspectorId=` | `QCReport[]` | QC_CHECKER / QC_LEADER / ADMIN |
| POST | `/api/qc/reports` | `QCSubmitFormData` | `QCReport` | QC_CHECKER |
| POST | `/api/qc/reports/draft` | `QCReportDraftInput` | `QCReportDraft` | QC_CHECKER |
| POST | `/api/qc/reports/[reportId]/submit` | `{}` | `QCSubmissionVersion` | QC_CHECKER |
| GET | `/api/qc/lots/[lotId]/review-packet` | — | `QCReviewPacket` | QC_LEADER / ADMIN |
| GET | `/api/qc/lots/[lotId]/history` | — | `QCSubmissionVersion[]` | QC_LEADER / ADMIN |
| GET | `/api/qc/lots/[lotId]/change-log` | `?entity=&field=&actorId=` | `QCChangeLog[]` | QC_LEADER / ADMIN |
| POST | `/api/qc/reports/[reportId]/leader-decision` | `{decision, reason, overrideReason?}` | `QCLotDecision` | QC_LEADER |

### Hub
| Method | Path | Body / Query | Response | Access |
|---|---|---|---|---|
| GET | `/api/hub/inbound` | `?hubId= &status=` | `Lot[]` | HUB_MANAGER |
| POST | `/api/hub/inbound` | `ReceiveInboundFormData` | `InboundReceipt` | HUB_MANAGER |
| GET | `/api/hub/dispatch` | `?hubId=` | `Order[]` | HUB_MANAGER |
| POST | `/api/hub/dispatch` | `{orderId, deliveryPointId}` | `Order` | HUB_MANAGER |

### Admin
| Method | Path | Body / Query | Response | Access |
|---|---|---|---|---|
| GET | `/api/admin/users` | `?role= &page=` | `PaginatedResponse<User>` | ADMIN |
| PATCH | `/api/admin/users/[id]` | `{isActive, role}` | `User` | ADMIN |
| GET | `/api/admin/lots` | `?status= &page=` | `PaginatedResponse<Lot>` | ADMIN |
| GET | `/api/admin/disputes` | `?status=` | `Dispute[]` | ADMIN |
| PATCH | `/api/admin/disputes/[id]` | `{status, resolution}` | `Dispute` | ADMIN |

### Uploads
| Method | Path | Body | Response | Access |
|---|---|---|---|---|
| POST | `/api/upload` | `{folder: "lots" \| "qc"}` | `{url, publicId}` | Authenticated |

---

## 7. Business Logic & Workflows

### 7.1 Complete Lot Lifecycle

```
SELLER creates lot (DRAFT)
    │
    ▼
SELLER confirms dispatch → status: PENDING_DELIVERY
    │
    ▼
HUB_MANAGER receives at hub → POST /api/hub/inbound → status: AT_HUB
    │
    ▼
QC_LEADER assigns to QC_CHECKER → PATCH /api/lots/[id] {qcAssigneeId} → status: IN_QC
    │
    ├── QC_CHECKER submits PASSED → status: QC_PASSED
    │       │
    │       ▼
    │   ADMIN / QC_LEADER sets auction time → status: SCHEDULED
    │       │
    │       ▼
    │   Cron job fires at auctionStartsAt → status: LIVE
    │       │
    │       ▼
    │   Cron job fires at auctionEndsAt → status: AUCTION_ENDED
    │       │
    │       ▼
    │   System creates Order for winner → BUYER pays → status: PAID
    │       │
    │       ▼
    │   HUB_MANAGER dispatches → status: DISPATCHED
    │       │
    │       ▼
    │   DELIVERY_POINT confirms arrival → status: AT_DELIVERY_POINT
    │       │
    │       ▼
    │   BUYER/DP confirms pickup → status: DELIVERED
    │
    └── QC_CHECKER submits FAILED → status: QC_FAILED → RETURNED
```

### 7.2 Bid Placement Logic

```typescript
// src/app/api/lots/[id]/bids/route.ts  (core logic)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { amount } = await req.json();
  const lotId = params.id;

  // 1. Verify lot is LIVE
  const lot = await db.lot.findUnique({ where: { id: lotId } });
  if (!lot || lot.status !== "LIVE") {
    return NextResponse.json({ message: "Lot is not live" }, { status: 400 });
  }

  // 2. Check bid is higher than currentPrice
  if (amount <= lot.currentPrice) {
    return NextResponse.json({ message: `Bid must exceed ৳ ${lot.currentPrice}` }, { status: 400 });
  }

  // 3. Check buyer has sufficient wallet balance (hold the amount)
  const wallet = await db.wallet.findUnique({ where: { userId: session.user.id } });
  const available = (wallet?.balance ?? 0) - (wallet?.heldBalance ?? 0);
  if (available < amount) {
    return NextResponse.json({ message: "Insufficient wallet balance" }, { status: 400 });
  }

  // 4. Run in transaction
  const [bid] = await db.$transaction([
    // Create new bid
    db.bid.create({
      data: { lotId, bidderId: session.user.id, amount, status: "ACTIVE" },
    }),
    // Mark previous winning bid as OUTBID
    db.bid.updateMany({
      where: { lotId, status: "ACTIVE", NOT: { bidderId: session.user.id } },
      data: { status: "OUTBID" },
    }),
    // Update lot currentPrice
    db.lot.update({
      where: { id: lotId },
      data: { currentPrice: amount, winnerId: session.user.id },
    }),
    // Hold funds in wallet
    db.wallet.update({
      where: { userId: session.user.id },
      data: { heldBalance: { increment: amount } },
    }),
    // Release hold on previous top bidder
    // NOTE: look up previous winner first, then release their hold
  ]);

  // 5. Push real-time update via Pusher
  await pusher.trigger(`lot-${lotId}`, "bid-placed", {
    amount,
    bidderId: session.user.id,
    bidderName: session.user.name,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(bid, { status: 201 });
}
```

### 7.3 QC Approval Workflow (Checker -> Team Leader)

This is the required workflow when a QC Team Leader must see all data before approving a lot.

#### Workflow states

```
draft
  -> submitted_by_checker
  -> under_leader_review
  -> approved
  -> rework_requested
  -> rejected
```

#### Role permissions

| Role | Allowed actions | Not allowed |
|---|---|---|
| `QC_CHECKER` | create draft, edit own draft, attach photos, submit report | approve/reject lot, edit submitted version |
| `QC_LEADER` | open review packet, compare versions, approve/rework/reject, override with reason | edit checker measurements directly |
| `ADMIN` | read full packet/history/logs | bypass audit trail |

#### What checker can change

Before submit (`draft`):
- Checklist items (pass/fail)
- Measured values (`weight`, `moisture`, `defectRate`, grading inputs)
- Flags (`CRITICAL`, `MAJOR`, `MINOR`)
- Photos and notes
- Recommended action (`APPROVE` | `REWORK` | `REJECT`)

After submit:
- Checker cannot update that submitted version.
- Any correction must create a new draft + new submission version.

#### What leader must see before approval

`GET /api/qc/lots/[lotId]/review-packet` must include:
- Lot master snapshot (lot number, seller, hub, category, quantity, timestamps)
- Current checker submission (full measurements + checklist + recommendation)
- Previous submissions for same lot
- Field-level diffs (`oldValue` -> `newValue`)
- Attachments/photos
- Rule violations (threshold breaches)
- Assignment info (checker, leader, submittedAt)

#### Data model additions (Prisma)

Add these models in your Prisma schema:

```prisma
enum QCLotState {
  DRAFT
  SUBMITTED_BY_CHECKER
  UNDER_LEADER_REVIEW
  APPROVED
  REWORK_REQUESTED
  REJECTED
}

enum QCDecision {
  APPROVE
  REWORK
  REJECT
}

model QCReportDraft {
  id              String     @id @default(cuid())
  lotId           String
  lot             Lot        @relation(fields: [lotId], references: [id])
  checkerId       String
  checker         User       @relation(fields: [checkerId], references: [id])
  state           QCLotState @default(DRAFT)
  payloadJson     Json
  recommendation  QCDecision?
  submittedAt     DateTime?
  submittedById   String?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([lotId, checkerId, state])
}

model QCSubmissionVersion {
  id              String   @id @default(cuid())
  lotId           String
  lot             Lot      @relation(fields: [lotId], references: [id])
  draftId         String
  draft           QCReportDraft @relation(fields: [draftId], references: [id])
  versionNo       Int
  snapshotJson    Json
  submittedById   String
  submittedAt     DateTime @default(now())

  @@unique([lotId, versionNo])
  @@index([lotId, submittedAt])
}

model QCLotDecision {
  id              String      @id @default(cuid())
  lotId           String
  lot             Lot         @relation(fields: [lotId], references: [id])
  submissionId    String
  submission      QCSubmissionVersion @relation(fields: [submissionId], references: [id])
  leaderId        String
  leader          User        @relation(fields: [leaderId], references: [id])
  decision        QCDecision
  reason          String
  overrideReason  String?
  decidedAt       DateTime    @default(now())

  @@index([lotId, decidedAt])
}

model QCChangeLog {
  id              String   @id @default(cuid())
  lotId           String
  lot             Lot      @relation(fields: [lotId], references: [id])
  entity          String   // QCReportDraft | QCSubmissionVersion | QCLotDecision
  field           String
  oldValue        String?
  newValue        String?
  actorId         String
  actor           User     @relation(fields: [actorId], references: [id])
  actorRole       String
  changedAt       DateTime @default(now())

  @@index([lotId, changedAt])
  @@index([entity, field])
}
```

#### Mandatory backend rules

1. `submit` creates immutable `QCSubmissionVersion` from draft payload.
2. Leader decision always points to one exact submission version.
3. Every field mutation writes one `QCChangeLog` row.
4. Reject/rework decision requires non-empty `reason`.
5. Override requires non-empty `overrideReason`.
6. No hard delete for draft/submission/decision/change-log rows.

#### Decision outcomes and lot status mapping

| Leader decision | Lot status update | Next step |
|---|---|---|
| `APPROVE` | `QC_PASSED` | scheduling and auction pipeline |
| `REWORK` | `IN_QC` | checker resubmits new version |
| `REJECT` | `QC_FAILED` | return/escalate per policy |

### 7.4 Auction End (Cron Job)

Use a cron job OR Next.js Route Handler triggered by Vercel Cron (or a standalone worker):

```typescript
// src/app/api/cron/end-auctions/route.ts
// Add to vercel.json: { "crons": [{ "path": "/api/cron/end-auctions", "schedule": "*/1 * * * *" }] }

export async function GET(req: NextRequest) {
  // Verify cron secret
  if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const endedLots = await db.lot.findMany({
    where: { status: "LIVE", auctionEndsAt: { lte: now } },
  });

  for (const lot of endedLots) {
    if (lot.winnerId) {
      // Create order
      await db.$transaction([
        db.lot.update({ where: { id: lot.id }, data: { status: "AUCTION_ENDED", finalPrice: lot.currentPrice } }),
        db.order.create({
          data: {
            orderNumber: `ORD-${Date.now()}`,
            lotId: lot.id,
            buyerId: lot.winnerId,
            sellerId: lot.sellerId,
            totalAmount: lot.currentPrice * lot.quantity,
            platformFee: lot.currentPrice * lot.quantity * 0.02,
            sellerPayout: lot.currentPrice * lot.quantity * 0.98,
            status: "PENDING_PAYMENT",
          },
        }),
        db.bid.update({ where: { id: /* winning bid id */ "" }, data: { status: "WON" } }),
        db.bid.updateMany({ where: { lotId: lot.id, status: "OUTBID" }, data: { status: "LOST" } }),
      ]);
    } else {
      await db.lot.update({ where: { id: lot.id }, data: { status: "AUCTION_ENDED" } });
    }
  }

  return NextResponse.json({ ended: endedLots.length });
}
```

### 7.5 Auto-Bid Engine

When a bid comes in on a lot that has auto-bids:

```typescript
async function processAutoBids(lotId: string, currentAmount: number, currentBidderId: string) {
  const autoBids = await db.autoBid.findMany({
    where: { lotId, isActive: true, NOT: { buyerId: currentBidderId } },
    orderBy: { maxAmount: "desc" },
  });

  const topAutoBid = autoBids[0];
  if (!topAutoBid) return;

  const nextAmount = currentAmount + topAutoBid.incrementAmount;
  if (nextAmount > topAutoBid.maxAmount) return;

  // Place automatic bid on behalf of buyer
  // (call the same bid logic above with isAutoBid: true)
}
```

---

## 8. Wallet & Payments

### 8.1 Wallet Operations

```typescript
// Deposit (adds balance)
await db.$transaction([
  db.walletTransaction.create({
    data: { walletId, type: "CREDIT", amount, description: "Wallet deposit via bKash", referenceId: gatewayTxId },
  }),
  db.wallet.update({
    where: { id: walletId },
    data: { balance: { increment: amount } },
  }),
]);

// Hold on bid placement
await db.wallet.update({
  where: { userId },
  data: { heldBalance: { increment: bidAmount } },
});

// Release hold when outbid
await db.wallet.update({
  where: { userId: outbidUserId },
  data: { heldBalance: { decrement: previousBidAmount } },
});
```

### 8.2 Platform Fee

- Commission: **2%** of `totalAmount` on every completed order
- `platformFee = totalAmount * 0.02`
- `sellerPayout = totalAmount - platformFee`
- Payout to seller wallet when order status becomes `DELIVERED`

### 8.3 SSLCommerz Integration (Payment Gateway)

```typescript
// src/app/api/payment/initiate/route.ts
import SSLCommerzPayment from "sslcommerz-lts";

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();
  const order = await db.order.findUnique({ where: { id: orderId }, include: { buyer: true } });

  const sslcz = new SSLCommerzPayment(
    process.env.SSLCOMMERZ_STORE_ID!,
    process.env.SSLCOMMERZ_STORE_PASSWORD!,
    process.env.SSLCOMMERZ_SANDBOX === "true"
  );

  const data = {
    total_amount: order!.totalAmount,
    currency: "BDT",
    tran_id: orderId,
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/success`,
    fail_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/fail`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/cancel`,
    cus_name: order!.buyer.name,
    cus_email: order!.buyer.email,
    cus_phone: order!.buyer.phone ?? "01700000000",
    cus_add1: "Dhaka",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    shipping_method: "NO",
    product_name: `Order ${order!.orderNumber}`,
    product_category: "Agricultural",
    product_profile: "general",
  };

  const response = await sslcz.init(data);
  return NextResponse.json({ url: response.GatewayPageURL });
}
```

---

## 9. Real-Time Bidding (WebSocket)

### 9.1 `src/lib/pusher.ts`

```typescript
import Pusher from "pusher";
import PusherJs from "pusher-js";

// Server-side
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side (use in *Client.tsx files)
export const pusherClient = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
});
```

### 9.2 Live page usage (in `LiveClient.tsx`)

```typescript
useEffect(() => {
  const channel = pusherClient.subscribe(`lot-${lotId}`);
  
  channel.bind("bid-placed", (data: { amount: number; bidderName: string }) => {
    setCurrentBid(data.amount);
    setBids((prev) => [data, ...prev]);
  });

  channel.bind("auction-ended", () => {
    setAuctionStatus("ended");
  });

  return () => {
    pusherClient.unsubscribe(`lot-${lotId}`);
  };
}, [lotId]);
```

### Pusher Channels Reference

| Channel | Events | Description |
|---|---|---|
| `lot-{id}` | `bid-placed`, `auction-ended`, `lot-updated` | Per-lot bidding |
| `user-{id}` | `notification`, `order-updated`, `outbid` | Private user alerts |
| `admin` | `new-dispute`, `new-lot`, `new-user` | Admin dashboard |

---

## 10. File Uploads (Cloudinary)

### 10.1 `src/lib/cloudinary.ts`

```typescript
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
```

### 10.2 Signed upload endpoint — `src/app/api/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { folder } = await req.json(); // "lots" | "qc"
  const timestamp = Math.round(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: `paikari/${folder}` },
    process.env.CLOUDINARY_API_SECRET!
  );

  return NextResponse.json({
    timestamp,
    signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder: `paikari/${folder}`,
  });
}
```

### 10.3 Client-side upload

```typescript
// Get signature from API, then upload directly from browser
const { timestamp, signature, cloudName, apiKey, folder } = await api.post("/api/upload", { folder: "lots" });

const formData = new FormData();
formData.append("file", file);
formData.append("api_key", apiKey);
formData.append("timestamp", timestamp);
formData.append("signature", signature);
formData.append("folder", folder);

const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
  method: "POST",
  body: formData,
});
const { secure_url } = await res.json();
```

---

## 11. Notifications

### Notification Types

```typescript
const NotificationType = {
  // Bidding
  BID_OUTBID:     "BID_OUTBID",      // sent to buyer when outbid
  AUCTION_WON:    "AUCTION_WON",     // sent to winner
  AUCTION_ENDED:  "AUCTION_ENDED",   // sent to seller
  // Orders
  ORDER_CREATED:  "ORDER_CREATED",
  ORDER_PAID:     "ORDER_PAID",
  ORDER_DISPATCHED: "ORDER_DISPATCHED",
  ORDER_DELIVERED:"ORDER_DELIVERED",
  // QC
  QC_ASSIGNED:    "QC_ASSIGNED",
  QC_COMPLETED:   "QC_COMPLETED",
  LOT_APPROVED:   "LOT_APPROVED",
  LOT_REJECTED:   "LOT_REJECTED",
  // Finance
  PAYOUT_SENT:    "PAYOUT_SENT",
  DEPOSIT_CONFIRMED: "DEPOSIT_CONFIRMED",
};
```

### Creating a notification

```typescript
async function notify(userId: string, type: string, title: string, body: string, link?: string) {
  await db.notification.create({
    data: { userId, type, title, body, link },
  });
  // Also push via Pusher
  await pusher.trigger(`user-${userId}`, "notification", { type, title, body, link });
}
```

---

## 12. Role-Based Access Control

### Role → Dashboard mapping (matches `src/middleware.ts`)

| Role | Dashboard prefix | Can access |
|---|---|---|
| `BUYER` | `/buyer-dashboard` | marketplace, live auctions, own orders |
| `SELLER` | `/seller-dashboard` | own lots, create lots, earnings |
| `ADMIN` | `/admin` | full platform management |
| `HUB_MANAGER` | `/hub-manager` | inbound receiving, dispatch, QC assignment |
| `QC_LEADER` | `/qc-leader` | QC task assignment, approval |
| `QC_CHECKER` | `/qc-checker` | QC submission, own history |
| `DELIVERY_POINT` | `/delivery-point` | arrivals, pickup confirmation |

### Route protection helper

```typescript
// src/lib/require-role.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireRole(...roles: string[]) {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  if (!roles.includes(session.user.role.toLowerCase())) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

// Usage in a route handler:
// const { session, error } = await requireRole("seller", "admin");
// if (error) return error;
```

---

## 13. Deployment Checklist

### Database (PostgreSQL)

- [ ] Use **Supabase** (free tier) or **Railway** or **Neon** for managed PostgreSQL
- [ ] Run `npx prisma migrate deploy` (not `dev`) in production
- [ ] Enable connection pooling (PgBouncer on Supabase / Prisma Accelerate)
- [ ] Set `DATABASE_URL` as environment variable in hosting platform

### Next.js App (Vercel — recommended)

```bash
# Production deploy
vercel --prod

# Or connect GitHub repo to Vercel for CI/CD
```

- [ ] All `.env` variables added in Vercel project settings
- [ ] `NEXTAUTH_URL` set to production domain
- [ ] `NEXTAUTH_SECRET` generated with `openssl rand -base64 32`
- [ ] Vercel Cron configured for `/api/cron/end-auctions`

### Pre-launch checklist

- [ ] `npx prisma migrate deploy` on production DB
- [ ] Seed initial admin user
- [ ] Test SSLCommerz with sandbox then flip `SSLCOMMERZ_SANDBOX=false`
- [ ] Pusher cluster set to `ap2` (Singapore — closest to Bangladesh)
- [ ] Cloudinary upload preset set to "signed" (not unsigned)
- [ ] Rate limiting on `/api/lots/[id]/bids` (max 10 bids/second per lot)
- [ ] `robots.ts` disallows dashboard routes ✅ (already done)
- [ ] HTTPS enforced (automatic on Vercel)

### Seed script — `prisma/seed.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // Create admin
  await db.user.upsert({
    where: { email: "admin@paikari.com" },
    update: {},
    create: {
      name: "Paikari Admin",
      email: "admin@paikari.com",
      passwordHash: await bcrypt.hash("Admin@123", 12),
      role: "ADMIN",
      isVerified: true,
      wallet: { create: {} },
    },
  });

  // Create hubs
  await db.hub.createMany({
    skipDuplicates: true,
    data: [
      { name: "Dhaka Central Hub", city: "Dhaka", address: "Aminbazar, Savar, Dhaka" },
      { name: "Chittagong Hub", city: "Chittagong", address: "Kalurghat, Chittagong" },
      { name: "Bogura Hub", city: "Bogura", address: "Tinmatha, Bogura" },
      { name: "Rangpur Hub", city: "Rangpur", address: "Modhupur, Rangpur" },
      { name: "Jessore Hub", city: "Jessore", address: "Chanchra, Jessore" },
    ],
  });

  // Create delivery points
  await db.deliveryPoint.createMany({
    skipDuplicates: true,
    data: [
      { name: "Mirpur DP", city: "Dhaka", address: "Mirpur-10, Dhaka" },
      { name: "Uttara DP", city: "Dhaka", address: "Uttara Sector-7, Dhaka" },
      { name: "Agrabad DP", city: "Chittagong", address: "Agrabad, Chittagong" },
    ],
  });

  console.log("Seed complete");
}

main().catch(console.error).finally(() => db.$disconnect());
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
}
```

Run: `npx prisma db seed`

---

## Quick Reference — Frontend ↔ Backend Contract

The frontend reads types from `src/types/index.ts` — **all API responses must match these interfaces exactly**. Key mappings:

| Frontend type | DB model | Notes |
|---|---|---|
| `User` | `User` | Omit `passwordHash` from responses |
| `Lot` | `Lot` + `hub` + `photos` | Include related `hub` and `photos` |
| `Bid` | `Bid` + `bidder` | Include `bidderName` from `bidder.name` |
| `Order` | `Order` + `lot` + `deliveryPoint` | Full nested include |
| `WalletTransaction` | `WalletTransaction` | All fields |
| `QCReport` | `QCReport` + `inspector` | Include `inspectorName` |
| `PaginatedResponse<T>` | — | `{items, total, page, limit, hasMore}` |

The frontend auth stores JWT in the session (NextAuth). The `src/lib/api.ts` reads the bearer token from `localStorage` key `paikari_token` — **ensure the token is stored after sign-in** or switch to cookie-based auth (recommended).

---

*Last updated: February 2026 — Frontend v1.0 complete, backend implementation pending.*
