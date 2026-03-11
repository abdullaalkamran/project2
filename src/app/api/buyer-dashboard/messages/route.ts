import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      OR: [{ buyerId: session.userId }, { buyerName: session.name }],
    },
    include: {
      lot: { select: { lotCode: true, title: true, quantity: true, unit: true } },
    },
    orderBy: { confirmedAt: "desc" },
    take: 50,
  });

  const threads = orders.map((o, idx) => {
    const lastMsg =
      o.status === "CONFIRMED"
        ? "Order confirmed. Awaiting dispatch from seller."
        : o.status === "DISPATCHED"
          ? "Your order has been dispatched from the hub."
          : o.status === "ARRIVED"
            ? "Your order has arrived at the delivery point."
            : o.status === "PICKED_UP"
              ? "Order delivered successfully. Thank you!"
              : "Order update available.";

    const timeStr = o.confirmedAt.toLocaleString("en-BD", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      id: String(idx + 1),
      seller: o.sellerName,
      lot: `${o.lot?.title ?? o.product} — ${o.lot?.quantity ?? o.qty} ${o.lot?.unit ?? ""}`.trim(),
      lastMsg,
      time: timeStr,
      unread: 0,
      messages: [
        {
          from: "seller",
          text: `Your order ${o.orderCode} for ${o.product} has been confirmed.`,
          time: timeStr,
        },
        ...(o.status === "DISPATCHED" || o.status === "ARRIVED" || o.status === "PICKED_UP"
          ? [{ from: "seller", text: "Your order has been dispatched and is on its way.", time: timeStr }]
          : []),
        {
          from: "system",
          text: `Current status: ${o.status.replace(/_/g, " ")}.`,
          time: timeStr,
        },
      ],
    };
  });

  return NextResponse.json({ threads });
}
