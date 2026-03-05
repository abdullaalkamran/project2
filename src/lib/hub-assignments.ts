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
  return assignments
    .filter((a) => a.hub.isActive)
    .map((a) => a.hub.name);
}

/**
 * Returns full hub objects assigned to the user for the given role.
 */
export async function getAssignedHubs(userId: string, role: string) {
  const assignments = await prisma.hubManagerAssignment.findMany({
    where: { userId, role },
    include: { hub: true },
  });
  return assignments.filter((a) => a.hub.isActive).map((a) => a.hub);
}
