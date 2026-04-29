import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { getPreDispatchCheck } from "@/lib/pre-dispatch-store";

export async function GET() {
  const auth = await requireApiRole(["aroth", "admin"]);
  if (auth.response) return auth.response;

  const userId = auth.session!.userId;

  const orders = await prisma.order.findMany({
    where: { arothId: userId },
    orderBy: { confirmedAt: "desc" },
    select: {
      orderCode: true,
      product: true,
      qty: true,
      freeQty: true,
      buyerName: true,
      sellerName: true,
      winningBid: true,
      totalAmount: true,
      productAmount: true,
      platformFee: true,
      platformFeeRate: true,
      transportCost: true,
      buyerTransportCost: true,
      sellerTransportCost: true,
      confirmedAt: true,
      // Order delivery status
      status: true,
      sellerStatus: true,
      assignedTruck: true,
      loadConfirmed: true,
      dispatched: true,
      // Aroth fields
      arothStatus: true,
      arothSaleAmount: true,
      arothCommissionRate: true,
      arothCommission: true,
      arothNetAmount: true,
      arothPaymentSentAt: true,
      arothPaymentConfirmedAt: true,
      arothSettledAt: true,
      arothHubId: true,
      lot: { select: { unit: true } },
    },
  });

  const result = await Promise.all(orders.map(async (o) => {
    const pd = await getPreDispatchCheck(o.orderCode);

    // Resolve buyer's actual transport share
    const bTrans = o.buyerTransportCost ?? 0;
    const sTrans = o.sellerTransportCost ?? 0;
    const buyerPaysTransport = bTrans > 0 ? bTrans : (sTrans === 0 && o.transportCost > 0 ? o.transportCost : 0);

    const productAmount = o.productAmount > 0 ? o.productAmount : o.totalAmount;
    const platformFee   = o.platformFee   > 0 ? o.platformFee   : Math.round(productAmount * (o.platformFeeRate ?? 5)) / 100;
    const buyerTotal    = productAmount + buyerPaysTransport + platformFee;

    // Parse numeric qty (e.g. "100 kg" → 100, "50 piece" → 50)
    const qtyNum  = parseFloat(o.qty.replace(/[^0-9.]/g, "")) || 1;
    const qtyUnit = o.lot?.unit ?? (o.qty.replace(/^\s*[\d.]+\s*/, "").trim() || "unit");
    const unitCost = buyerTotal / qtyNum;

    return {
      orderCode:    o.orderCode,
      product:      o.product,
      qty:          o.qty,
      freeQty:      o.freeQty ?? 0,
      buyerName:    o.buyerName,
      sellerName:   o.sellerName,
      winningBid:   o.winningBid,
      totalAmount:  o.totalAmount,
      productAmount,
      platformFee,
      platformFeeRate: o.platformFeeRate ?? 5,
      buyerTransportCost: buyerPaysTransport,
      qtyNum,
      qtyUnit,
      unitCost,
      confirmedAt: o.confirmedAt.toISOString(),
      // Delivery
      status:       o.status,
      sellerStatus: o.sellerStatus,
      assignedTruck:  o.assignedTruck  ?? null,
      loadConfirmed:  o.loadConfirmed,
      dispatched:     o.dispatched,
      physicallyReceived: pd?.physicallyReceived ?? false,
      qualityChecked:     pd?.qualityChecked     ?? false,
      actualWeightKg:     (pd?.grossWeightKg ?? 0) > 0 ? pd!.grossWeightKg : null,
      // Aroth
      arothStatus:            o.arothStatus            ?? null,
      arothSaleAmount:        o.arothSaleAmount        ?? null,
      arothCommissionRate:    o.arothCommissionRate    ?? null,
      arothCommission:        o.arothCommission        ?? null,
      arothNetAmount:         o.arothNetAmount         ?? null,
      arothPaymentSentAt:     o.arothPaymentSentAt?.toISOString()     ?? null,
      arothPaymentConfirmedAt:o.arothPaymentConfirmedAt?.toISOString() ?? null,
      arothSettledAt:         o.arothSettledAt?.toISOString()         ?? null,
      arothHubId:             o.arothHubId             ?? null,
    };
  }));

  return NextResponse.json(result);
}
