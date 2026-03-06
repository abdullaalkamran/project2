import { NextRequest, NextResponse } from "next/server";
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
    truckPriceBDT?: number;
    hubManagerConfirmed?: boolean;
    qcLeadConfirmed?: boolean;
  };

  const previous = await getPreDispatchCheck(orderCode);

  const next = await upsertPreDispatchCheck({
    orderCode,
    physicallyReceived: body.physicallyReceived ?? previous?.physicallyReceived ?? false,
    qualityChecked:     body.qualityChecked     ?? previous?.qualityChecked     ?? false,
    packetQty:          Number(body.packetQty          ?? previous?.packetQty          ?? 0),
    grossWeightKg:      Number(body.grossWeightKg      ?? previous?.grossWeightKg      ?? 0),
    truckPriceBDT:      Number(body.truckPriceBDT      ?? previous?.truckPriceBDT      ?? 0),
    hubManagerConfirmed: body.hubManagerConfirmed ?? previous?.hubManagerConfirmed ?? false,
    qcLeadConfirmed:     body.qcLeadConfirmed     ?? previous?.qcLeadConfirmed     ?? false,
    updatedAt: new Date().toISOString(),
    updatedBy: session.userId,
  });

  // Sync truck price to order.transportCost and deduct from buyer wallet when first set
  const prevTruckPrice = previous?.truckPriceBDT ?? 0;
  if (next.truckPriceBDT > 0 && prevTruckPrice !== next.truckPriceBDT) {
    // productAmount: use existing if already set, else use totalAmount (= product price at order creation)
    const productAmount = order.productAmount > 0 ? order.productAmount : order.totalAmount;
    const platformFeeRate = order.platformFeeRate ?? 5;
    const platformFee = Math.round(productAmount * platformFeeRate) / 100;
    const sellerPayable = productAmount - platformFee;
    const newTotalAmount = productAmount + next.truckPriceBDT + platformFee;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        transportCost: next.truckPriceBDT,
        productAmount,
        platformFee,
        sellerPayable,
        totalAmount: newTotalAmount,
      },
    });

    // Deduct from buyer wallet immediately when truck price is set for the first time
    if (next.truckPriceBDT > 0 && prevTruckPrice === 0 && order.buyerId) {
      const buyerWallet = await prisma.wallet.findUnique({ where: { userId: order.buyerId } });
      if (buyerWallet) {
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: buyerWallet.id },
            data: { balance: { decrement: next.truckPriceBDT } },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: buyerWallet.id,
              type: "DEBIT",
              amount: next.truckPriceBDT,
              description: `Transport cost for order ${orderCode} — ${order.product}`,
            },
          }),
        ]);
      }
    }
  }

  // ── Notifications per step ────────────────────────────────────────────────
  const parties = await getLotParties(order.lotId);

  // Step 1: product physically received → notify QC leader + checker to begin inspection
  if (next.physicallyReceived && !previous?.physicallyReceived) {
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
  if (next.qualityChecked && !previous?.qualityChecked) {
    await notifyMany(parties.hubManagerIds, {
      type: "ORDER_DISPATCHED",
      title: "Quality Check Complete",
      message: `QC team has completed weight & quality check for order (${orderCode}) — "${order.product}", actual weight: ${next.grossWeightKg} kg. QC leader is setting truck price.`,
      link: "/hub-manager/dispatch",
    });
  }

  // Step 3: truck price set → notify QC leader to give their confirmation
  if (next.truckPriceBDT > 0 && (previous?.truckPriceBDT ?? 0) === 0) {
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
  if (next.qcLeadConfirmed && !previous?.qcLeadConfirmed) {
    await notifyMany(parties.hubManagerIds, {
      type: "ORDER_DISPATCHED",
      title: "QC Leader Confirmed — Final Approval Needed",
      message: `QC leader has confirmed order (${orderCode}) — "${order.product}". Please give your final approval to unlock truck assignment.`,
      link: "/hub-manager/dispatch",
    });
  }

  // Step 5: Hub manager final approval → notify seller, buyer, QC leader (gate complete)
  if (next.hubManagerConfirmed && !previous?.hubManagerConfirmed) {
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

  return NextResponse.json(next);
}
