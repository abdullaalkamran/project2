import { prisma } from "@/lib/prisma";

/**
 * Returns the hub names (matching lot.hubId / truck.hubId strings)
 * that the given user is assigned to for the given role.
 *
 * If the user has no assignments for that role, returns [] (they'll see nothing).
 */
export async function getAssignedHubNames(
  userId: string,
  role: string
): Promise<string[]> {
  const assignments = await prisma.hubManagerAssignment.findMany({
    where: { userId, role },
    include: { hub: { select: { name: true, isActive: true } } },
  });

  const assigned = assignments
    .filter((a) => a.hub.isActive)
    .map((a) => a.hub.name);
  if (assigned.length > 0) return assigned;

  // Fallback: legacy accounts may only have User.hubId set (no assignment row yet).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hubId: true },
  });
  return user?.hubId ? [user.hubId] : [];
}

/**
 * Returns full hub objects assigned to the user for the given role.
 */
export async function getAssignedHubs(userId: string, role: string) {
  const assignments = await prisma.hubManagerAssignment.findMany({
    where: { userId, role },
    include: { hub: true },
  });
  const hubs = assignments.filter((a) => a.hub.isActive).map((a) => a.hub);
  if (hubs.length > 0) return hubs;

  // Same fallback as getAssignedHubNames for legacy user->hub mapping.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hubId: true },
  });
  if (!user?.hubId) return [];

  const hub = await prisma.hub.findFirst({
    where: {
      isActive: true,
      OR: [{ id: user.hubId }, { name: user.hubId }],
    },
  });
  return hub ? [hub] : [];
}
