import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getPreDispatchCheck, upsertPreDispatchCheck } from "@/lib/pre-dispatch-store";
import { notify, notifyMany, getLotParties } from "@/lib/notifications";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orderCode = id.toUpperCase();
  const order = await prisma.order.findUnique({ where: { orderCode } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  const existing = await getPreDispatchCheck(orderCode);
  return NextResponse.json(
    existing ?? {
      orderCode,
      physicallyReceived: false,
      qualityChecked: false,
      packetQty: 0,
      grossWeightKg: 0,
      freeQty: order.freeQty ?? 0,  // seed from QC-calculated value on Order
      step2EditRequested: false,
      step2Unlocked: false,
      truckPriceBDT: 0,
      hubManagerConfirmed: false,
      qcLeadConfirmed: false,
      updatedAt: null,
      updatedBy: null,
    },
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orderCode = id.toUpperCase();
  const order = await prisma.order.findUnique({ where: { orderCode } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  const body = (await req.json()) as {
    physicallyReceived?: boolean;
    qualityChecked?: boolean;
    packetQty?: number;
    grossWeightKg?: number;
    freeQty?: number;
    step2EditRequested?: boolean;
    step2Unlocked?: boolean;
    truckPriceBDT?: number;
    hubManagerConfirmed?: boolean;
    qcLeadConfirmed?: boolean;
  };

  const previous = await getPreDispatchCheck(orderCode);
  const lot = await prisma.lot.findUnique({
    where: { id: order.lotId },
    select: { sellerTransportShare: true },
  });

  const shareMode = (lot?.sellerTransportShare ?? "YES") as "YES" | "NO" | "HALF";
  const toMoney = (n: number) => Math.round(n * 100) / 100;
  const splitTransport = (amount: number) => {
    if (shareMode === "NO") return { buyerShare: toMoney(amount), sellerShare: 0 };
    if (shareMode === "HALF") {
      const buyerShare = toMoney(amount / 2);
      return { buyerShare, sellerShare: toMoney(amount - buyerShare) };
    }
    return { buyerShare: 0, sellerShare: toMoney(amount) }; // YES => seller pays
  };

  const next = {
    orderCode,
    physicallyReceived: body.physicallyReceived ?? previous?.physicallyReceived ?? false,
    qualityChecked:     body.qualityChecked     ?? previous?.qualityChecked     ?? false,
    packetQty:          Number(body.packetQty          ?? previous?.packetQty          ?? 0),
    grossWeightKg:      Number(body.grossWeightKg      ?? previous?.grossWeightKg      ?? 0),
    freeQty:            Number(body.freeQty            ?? previous?.freeQty            ?? 0),
    step2EditRequested: body.step2EditRequested ?? previous?.step2EditRequested ?? false,
    step2Unlocked:      body.step2Unlocked      ?? previous?.step2Unlocked      ?? false,
    truckPriceBDT:      Math.max(0, Number(body.truckPriceBDT ?? previous?.truckPriceBDT ?? 0)),
    hubManagerConfirmed: body.hubManagerConfirmed ?? previous?.hubManagerConfirmed ?? false,
    qcLeadConfirmed:     body.qcLeadConfirmed     ?? previous?.qcLeadConfirmed     ?? false,
    updatedAt: new Date().toISOString(),
    updatedBy: session.userId,
  };

  // Sync truck price to order.transportCost and apply buyer wallet delta on every change.
  const prevTruckPrice = previous?.truckPriceBDT ?? 0;
  // Hoist these so the post-save notification block can read them
  let buyerInsufficientBalance = false;
  let buyerDelta = 0;
  let buyerWallet: { id: string; balance: number } | null = null;

  if (prevTruckPrice !== next.truckPriceBDT) {
    // productAmount: use existing if already set, else use totalAmount (= product price at order creation)
    const productAmount = order.productAmount > 0 ? order.productAmount : order.totalAmount;
    const platformFeeRate = order.platformFeeRate ?? 5;
    const platformFee = Math.round(productAmount * platformFeeRate) / 100;
    const sellerPayable = productAmount - platformFee;
    const prevSplit = splitTransport(prevTruckPrice);
    const nextSplit = splitTransport(next.truckPriceBDT);
    buyerDelta = toMoney(nextSplit.buyerShare - prevSplit.buyerShare);         // +ve charge buyer, -ve refund
    const sellerDelta = toMoney(nextSplit.sellerShare - prevSplit.sellerShare); // +ve charge seller, -ve refund

    const sellerUserId = order.sellerId ?? null;
    buyerWallet = order.buyerId
      ? await prisma.wallet.upsert({
          where: { userId: order.buyerId },
          create: { userId: order.buyerId, balance: 0 },
          update: {},
        })
      : null;
    const sellerWallet = sellerUserId
      ? await prisma.wallet.upsert({
          where: { userId: sellerUserId },
          create: { userId: sellerUserId, balance: 0 },
          update: {},
        })
      : null;

    const newTotalAmount = toMoney(productAmount + nextSplit.buyerShare);
    const tx: Prisma.PrismaPromise<unknown>[] = [
      prisma.order.update({
        where: { id: order.id },
        data: {
          transportCost: next.truckPriceBDT,
          buyerTransportCost: nextSplit.buyerShare,
          sellerTransportCost: nextSplit.sellerShare,
          productAmount,
          platformFee,
          sellerPayable,
          totalAmount: newTotalAmount,
        },
      }),
    ];

    // Check buyer balance before charging transport delta
    if (buyerWallet && buyerDelta > 0 && buyerWallet.balance < buyerDelta) {
      buyerInsufficientBalance = true;
      // DO NOT deduct — notifications sent after save below
    } else if (buyerWallet && buyerDelta !== 0) {
      tx.push(
        prisma.wallet.update({
          where: { id: buyerWallet.id },
          data: buyerDelta > 0
            ? { balance: { decrement: buyerDelta } }
            : { balance: { increment: Math.abs(buyerDelta) } },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: buyerWallet.id,
            type: buyerDelta > 0 ? "DEBIT" : "DEPOSIT",
            amount: Math.abs(buyerDelta),
            description:
              buyerDelta > 0
                ? `Transport cost adjustment (buyer share +) for order ${orderCode} — ${order.product}`
                : `Transport cost adjustment refund (buyer share) for order ${orderCode} — ${order.product}`,
          },
        }),
      );
    }

    if (sellerWallet && sellerDelta !== 0) {
      tx.push(
        prisma.wallet.update({
          where: { id: sellerWallet.id },
          data: sellerDelta > 0
            ? { balance: { decrement: sellerDelta } }
            : { balance: { increment: Math.abs(sellerDelta) } },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: sellerWallet.id,
            type: sellerDelta > 0 ? "DEBIT" : "DEPOSIT",
            amount: Math.abs(sellerDelta),
            description:
              sellerDelta > 0
                ? `Transport cost adjustment (seller share +) for order ${orderCode} — ${order.product}`
                : `Transport cost adjustment refund (seller share) for order ${orderCode} — ${order.product}`,
          },
        }),
      );
    }

    await prisma.$transaction(tx);
  }

  const saved = await upsertPreDispatchCheck(next);

  // Sync freeQty to order
  const prevFreeQty = previous?.freeQty ?? 0;
  if (prevFreeQty !== next.freeQty) {
    await prisma.order.update({
      where: { id: order.id },
      data: { freeQty: next.freeQty },
    });
  }

  // ── Notifications per step ────────────────────────────────────────────────
  const parties = await getLotParties(order.lotId);

  // Step 1: product physically received → notify QC leader + checker to begin inspection
  if (saved.physicallyReceived && !previous?.physicallyReceived) {
    const recipients = [parties.qcLeaderId, parties.qcCheckerId].filter(Boolean) as string[];
    if (recipients.length > 0) {
      await notifyMany(recipients, {
        type: "ORDER_DISPATCHED",
        title: "Product Arrived at Hub",
        message: `Order (${orderCode}) for "${order.product}" has physically arrived at the hub. Please proceed with weight & quality check.`,
        link: "/qc-leader/confirmed-orders",
      });
    }
    await notifyMany(parties.hubManagerIds, {
      type: "ORDER_DISPATCHED",
      title: "Physical Arrival Confirmed",
      message: `You confirmed physical arrival of order (${orderCode}) for "${order.product}". QC team has been notified.`,
      link: "/hub-manager/dispatch",
    });
  }

  // Step 2: quality checked → notify hub managers to confirm
  if (saved.qualityChecked && !previous?.qualityChecked) {
    await notifyMany(parties.hubManagerIds, {
      type: "ORDER_DISPATCHED",
      title: "Quality Check Complete",
      message: `QC team has completed weight & quality check for order (${orderCode}) — "${order.product}", actual weight: ${saved.grossWeightKg} kg. QC leader is setting truck price.`,
      link: "/hub-manager/dispatch",
    });
  }

  // Step 2 edit requested → notify hub managers
  if (saved.step2EditRequested && !previous?.step2EditRequested) {
    await notifyMany(parties.hubManagerIds, {
      type: "ORDER_DISPATCHED",
      title: "Edit Permission Requested",
      message: `QC leader has requested permission to re-edit weight & quality check for order (${orderCode}) — "${order.product}". Please approve from the Dispatch page.`,
      link: "/hub-manager/dispatch",
    });
  }

  // Hub manager unlocked step 2 → notify QC leader
  if (saved.step2Unlocked && !previous?.step2Unlocked) {
    if (parties.qcLeaderId) {
      await notify(parties.qcLeaderId, {
        type: "ORDER_DISPATCHED",
        title: "Edit Permission Granted",
        message: `Hub manager has approved your request to re-edit weight & quality check for order (${orderCode}) — "${order.product}".`,
        link: "/qc-leader/confirmed-orders",
      });
    }
  }

  // Step 3: truck price set → notify QC leader to give their confirmation
  if (saved.truckPriceBDT > 0 && (previous?.truckPriceBDT ?? 0) === 0) {
    if (parties.qcLeaderId) {
      await notify(parties.qcLeaderId, {
        type: "ORDER_DISPATCHED",
        title: "Truck Price Set — Confirm Now",
        message: `You set the transport cost for order (${orderCode}). Please now give your QC confirmation to proceed.`,
        link: "/qc-leader/confirmed-orders",
      });
    }
  }

  // Step 4: QC leader confirmed → notify hub managers for final approval
  if (saved.qcLeadConfirmed && !previous?.qcLeadConfirmed) {
    await notifyMany(parties.hubManagerIds, {
      type: "ORDER_DISPATCHED",
      title: "QC Leader Confirmed — Final Approval Needed",
      message: `QC leader has confirmed order (${orderCode}) — "${order.product}". Please give your final approval to unlock truck assignment.`,
      link: "/hub-manager/dispatch",
    });
  }

  // Step 5: Hub manager final approval → notify seller, buyer, QC leader (gate complete)
  if (saved.hubManagerConfirmed && !previous?.hubManagerConfirmed) {
    if (parties.qcLeaderId) {
      await notify(parties.qcLeaderId, {
        type: "ORDER_DISPATCHED",
        title: "Pre-Dispatch Gate Complete",
        message: `Hub manager gave final approval for order (${orderCode}) — "${order.product}". Truck assignment is now unlocked.`,
        link: "/qc-leader/confirmed-orders",
      });
    }
    if (parties.sellerId) {
      await notify(parties.sellerId, {
        type: "ORDER_DISPATCHED",
        title: "Order Cleared for Dispatch",
        message: `Pre-dispatch gate completed for your order (${orderCode}) — "${order.product}". Truck assignment is in progress.`,
        link: "/seller-dashboard/orders",
      });
    }
    const buyerId = order.buyerId ?? null;
    if (buyerId) {
      await notify(buyerId, {
        type: "ORDER_DISPATCHED",
        title: "Order Cleared for Dispatch",
        message: `Your order (${orderCode}) for "${order.product}" has passed all pre-dispatch checks and will be assigned a truck shortly.`,
        link: "/buyer-dashboard/orders",
      });
    }
  }

  // ── Insufficient balance notifications ───────────────────────────────────
  if (buyerInsufficientBalance) {
    const shortfall = Math.round((buyerDelta - (buyerWallet?.balance ?? 0)) * 100) / 100;
    const fmt = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;

    // Notify buyer
    if (order.buyerId) {
      await notify(order.buyerId, {
        type: "ORDER_PLACED",
        title: "Insufficient Balance — Action Required",
        message: `Your wallet balance is ${fmt(buyerWallet?.balance ?? 0)}, but order (${orderCode}) for "${order.product}" requires ${fmt(buyerDelta)} for transport cost. You are short by ${fmt(shortfall)}. Please add funds immediately.`,
        link: "/buyer-dashboard/payments",
      });
    }

    // Notify hub managers
    await notifyMany(parties.hubManagerIds, {
      type: "ORDER_PLACED",
      title: "Buyer Insufficient Balance",
      message: `Buyer "${order.buyerName}" does not have enough wallet balance for transport cost of order (${orderCode}) — "${order.product}". Required: ${fmt(buyerDelta)}, Available: ${fmt(buyerWallet?.balance ?? 0)}, Shortfall: ${fmt(shortfall)}. Please follow up immediately.`,
      link: "/hub-manager/dispatch",
    });

    // Notify QC leader
    if (parties.qcLeaderId) {
      await notify(parties.qcLeaderId, {
        type: "ORDER_PLACED",
        title: "Buyer Insufficient Balance",
        message: `Buyer "${order.buyerName}" cannot cover the transport cost (${fmt(buyerDelta)}) for order (${orderCode}) — "${order.product}". Wallet balance: ${fmt(buyerWallet?.balance ?? 0)}. Shortfall: ${fmt(shortfall)}.`,
        link: "/qc-leader/confirmed-orders",
      });
    }

    // Notify seller
    if (parties.sellerId) {
      await notify(parties.sellerId, {
        type: "ORDER_PLACED",
        title: "Buyer Insufficient Balance",
        message: `Buyer "${order.buyerName}" does not have sufficient funds for transport cost on order (${orderCode}) — "${order.product}". Shortfall: ${fmt(shortfall)}. Dispatch may be delayed.`,
        link: "/seller-dashboard/orders",
      });
    }

    return NextResponse.json({
      ...saved,
      insufficientBalance: true,
      shortfall,
      required: buyerDelta,
      available: buyerWallet?.balance ?? 0,
    });
  }

  return NextResponse.json(saved);
}
