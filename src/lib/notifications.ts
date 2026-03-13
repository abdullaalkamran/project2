import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "LOT_RECEIVED"
  | "QC_ASSIGNED"
  | "QC_SUBMITTED"
  | "QC_APPROVED"
  | "QC_REJECTED"
  | "ORDER_PLACED"
  | "ORDER_ACCEPTED"
  | "ORDER_DECLINED"
  | "ORDER_DISPATCHED"
  | "AUCTION_UNSOLD"
  | "FIXED_PRICE_SUBMITTED"
  | "FIXED_PRICE_APPROVED"
  | "TRUCK_SUBMITTED"
  | "TRUCK_APPROVED"
  | "TRUCK_REJECTED"
  | "ORDER_HUB_RECEIVED"
  | "ORDER_DISTRIBUTOR_ASSIGNED"
  | "ORDER_OUT_FOR_DELIVERY"
  | "ORDER_ARRIVED"
  | "ORDER_DELIVERED"
  | "MESSAGE";

export const NOTIF_ICONS: Record<NotificationType, string> = {
  LOT_RECEIVED:          "📦",
  QC_ASSIGNED:           "🔬",
  QC_SUBMITTED:          "📋",
  QC_APPROVED:           "✅",
  QC_REJECTED:           "❌",
  ORDER_PLACED:          "🛒",
  ORDER_ACCEPTED:        "🤝",
  ORDER_DECLINED:        "🚫",
  ORDER_DISPATCHED:      "🚚",
  AUCTION_UNSOLD:        "⏰",
  FIXED_PRICE_SUBMITTED: "🏷️",
  FIXED_PRICE_APPROVED:  "✅",
  TRUCK_SUBMITTED:       "🚛",
  TRUCK_APPROVED:              "✅",
  TRUCK_REJECTED:              "🚫",
  ORDER_HUB_RECEIVED:          "🏭",
  ORDER_DISTRIBUTOR_ASSIGNED:  "🧑‍💼",
  ORDER_OUT_FOR_DELIVERY:      "🏍️",
  ORDER_ARRIVED:               "📍",
  ORDER_DELIVERED:             "✅",
  MESSAGE:                     "💬",
};

interface NotifParams {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/** Create a notification for a single user (fires-and-forgets errors). */
export async function notify(userId: string, params: NotifParams) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link ?? "/",
      },
    });
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

/** Create notifications for multiple users at once. Null/undefined IDs are skipped. */
export async function notifyMany(
  userIds: (string | null | undefined)[],
  params: NotifParams
) {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))];
  if (!ids.length) return;
  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link ?? "/",
      })),
    });
  } catch (err) {
    console.error("[notifyMany] failed:", err);
  }
}

/** Look up a user ID by their display name (first match). */
export async function userIdByName(name: string): Promise<string | null> {
  const u = await prisma.user.findFirst({ where: { name }, select: { id: true } });
  return u?.id ?? null;
}

/** Get all user IDs with a given role. */
export async function userIdsByRole(role: string): Promise<string[]> {
  const roles = await prisma.userRole.findMany({
    where: { role },
    select: { userId: true },
  });
  return roles.map((r) => r.userId);
}

/** Resolve all party IDs for a lot (seller, qcLeader, qcChecker, hub managers). */
export async function getLotParties(lotId: string): Promise<{
  sellerId: string | null;
  qcLeaderId: string | null;
  qcCheckerId: string | null;
  hubManagerIds: string[];
}> {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    select: { sellerId: true, sellerName: true, qcLeaderName: true, qcCheckerName: true },
  });
  if (!lot) return { sellerId: null, qcLeaderId: null, qcCheckerId: null, hubManagerIds: [] };

  const [sellerId, qcLeaderId, qcCheckerId, hubManagerIds] = await Promise.all([
    lot.sellerId ? Promise.resolve(lot.sellerId) : userIdByName(lot.sellerName),
    lot.qcLeaderName ? userIdByName(lot.qcLeaderName) : Promise.resolve(null),
    lot.qcCheckerName ? userIdByName(lot.qcCheckerName) : Promise.resolve(null),
    userIdsByRole("hub_manager"),
  ]);

  return { sellerId, qcLeaderId, qcCheckerId, hubManagerIds };
}
