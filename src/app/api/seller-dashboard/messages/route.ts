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
      OR: [{ sellerId: session.userId }, { sellerName: session.name }],
    },
    include: {
      lot: { select: { lotCode: true, title: true, quantity: true, unit: true } },
    },
    orderBy: { confirmedAt: "desc" },
    take: 50,
  });

  const threads = orders.map((o, idx) => ({
    id: String(idx + 1),
    buyer: o.buyerName,
    lot: `${o.lot?.title ?? o.product} — ${o.lot?.quantity ?? ""} ${o.lot?.unit ?? ""}`.trim(),
    lastMsg:
      o.status === "CONFIRMED"
        ? "Order confirmed. Please coordinate dispatch."
        : o.status === "DISPATCHED"
          ? "Order dispatched from hub."
          : o.status === "ARRIVED"
            ? "Order arrived at delivery point."
            : o.status === "PICKED_UP"
              ? "Order delivered successfully."
              : "Order update available.",
    time: o.confirmedAt.toLocaleString("en-BD", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    unread: 0,
    messages: [
      {
        from: "buyer",
        text: `Order ${o.orderCode} confirmed for ${o.product}.`,
        time: o.confirmedAt.toLocaleString("en-BD", { hour: "2-digit", minute: "2-digit" }),
      },
      {
        from: "seller",
        text: "Acknowledged. We are coordinating with hub for processing.",
        time: o.confirmedAt.toLocaleString("en-BD", { hour: "2-digit", minute: "2-digit" }),
      },
      {
        from: "system",
        text: `Current order status: ${o.status}.`,
        time: o.confirmedAt.toLocaleString("en-BD", { hour: "2-digit", minute: "2-digit" }),
      },
    ],
  }));

  return NextResponse.json({ threads });
}
