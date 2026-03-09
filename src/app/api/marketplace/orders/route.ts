import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify, notifyMany, getLotParties } from "@/lib/notifications";

function generateOrderCode() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${suffix}`;
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { lotCode, qty, pricePerUnit, deliveryPoint } = (await req.json()) as {
    lotCode: string;
    qty: number;
    pricePerUnit: number;
    deliveryPoint?: string;
  };

  if (!lotCode || !qty || !pricePerUnit) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  // Look up the lot by lotCode
  const lot = await prisma.lot.findUnique({
    where: { lotCode: lotCode.toUpperCase() },
  });

  if (!lot) {
    return NextResponse.json({ message: "Lot not found" }, { status: 404 });
  }

  if (!["QC_PASSED", "LIVE"].includes(lot.status)) {
    return NextResponse.json({ message: "Lot is not available for purchase" }, { status: 400 });
  }

  const productAmount   = Math.round(pricePerUnit * qty * 100) / 100;
  const platformFeeRate = 5;
  const platformFee     = Math.round(productAmount * platformFeeRate) / 100;
  const sellerPayable   = Math.round((productAmount - platformFee) * 100) / 100;
  const totalAmount     = productAmount; // transport cost added later at pre-dispatch
  const qtyStr = `${qty} ${lot.unit}`;

  // Check buyer wallet balance before creating the order
  const buyerWallet = await prisma.wallet.upsert({
    where:  { userId: session.userId },
    create: { userId: session.userId, balance: 0 },
    update: {},
  });

  if (buyerWallet.balance < productAmount) {
    return NextResponse.json(
      { message: `Insufficient wallet balance. You need ৳${productAmount.toLocaleString()} but have ৳${buyerWallet.balance.toLocaleString()}. Please add funds.` },
      { status: 400 }
    );
  }

  // Generate unique order code
  let orderCode = generateOrderCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.order.findUnique({ where: { orderCode } });
    if (!existing) break;
    orderCode = generateOrderCode();
    attempts++;
  }

  // Create order and deduct product amount from buyer wallet atomically
  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        orderCode,
        lotId: lot.id,
        buyerId: session.userId,
        sellerId: lot.sellerId ?? null,
        buyerName: session.name,
        sellerName: lot.sellerName,
        product: lot.title,
        qty: qtyStr,
        deliveryPoint: deliveryPoint ?? lot.hubId,
        winningBid: pricePerUnit,
        productAmount,
        platformFeeRate,
        platformFee,
        sellerPayable,
        totalAmount,
        status: "CONFIRMED",
        sellerStatus: "PENDING_SELLER",
      },
    }),
    prisma.wallet.update({
      where: { id: buyerWallet.id },
      data:  { balance: { decrement: productAmount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: buyerWallet.id,
        type: "DEBIT",
        amount: productAmount,
        description: `Order ${orderCode} — ${lot.title} (${qtyStr})`,
      },
    }),
  ]);

  // Fan-out: notify all parties about the new order
  const parties = await getLotParties(lot.id);

  // Seller — new order requires their acceptance
  if (parties.sellerId) {
    await notify(parties.sellerId, {
      type: "ORDER_PLACED",
      title: "New Order Received",
      message: `${session.name} ordered ${qtyStr} of "${lot.title}" (${lot.lotCode}) at ৳${pricePerUnit.toLocaleString()}/${lot.unit}. Your acceptance is required.`,
      link: "/seller-dashboard/orders",
    });
  }

  // Buyer — order placement confirmation
  await notify(session.userId, {
    type: "ORDER_PLACED",
    title: "Order Placed Successfully",
    message: `Your order for ${qtyStr} of "${lot.title}" (${lot.lotCode}) at ৳${pricePerUnit.toLocaleString()}/${lot.unit} has been placed. Awaiting seller confirmation.`,
    link: "/buyer-dashboard/orders",
  });

  // Hub managers — new order for a lot at their hub
  await notifyMany(parties.hubManagerIds, {
    type: "ORDER_PLACED",
    title: "New Order for Lot",
    message: `${session.name} placed an order for ${qtyStr} of "${lot.title}" (${lot.lotCode}). Delivery to: ${deliveryPoint ?? lot.hubId}.`,
    link: "/hub-manager",
  });

  // QC Leader — informed of order on their approved lot
  if (parties.qcLeaderId) {
    await notify(parties.qcLeaderId, {
      type: "ORDER_PLACED",
      title: "Order Placed on Approved Lot",
      message: `An order of ${qtyStr} was placed by ${session.name} on lot "${lot.title}" (${lot.lotCode}) that you approved.`,
      link: "/qc-leader/approvals",
    });
  }

  return NextResponse.json(
    { orderCode: order.orderCode, totalAmount: order.totalAmount },
    { status: 201 }
  );
}
