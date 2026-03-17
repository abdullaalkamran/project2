import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify, notifyMany, getLotParties } from "@/lib/notifications";
import { getPreDispatchCheck, readPreDispatchChecks } from "@/lib/pre-dispatch-store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      assignedTruck?: string | null;
      loadConfirmed?: boolean;
      dispatched?: boolean;
    };

    const order = await prisma.order.findUnique({ where: { orderCode: id } });
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    if (!["ACCEPTED", "CONFIRMED"].includes(order.sellerStatus)) {
      return NextResponse.json(
        { message: "Order is not ready for dispatch yet. Seller acceptance is pending." },
        { status: 400 }
      );
    }

    const wantsDispatchAction =
      body.assignedTruck !== undefined || body.loadConfirmed === true || body.dispatched === true;
    if (wantsDispatchAction) {
      const check = await getPreDispatchCheck(order.orderCode);
      const gatePassed = !!(
        check?.physicallyReceived &&
        check?.qualityChecked &&
        check?.packetQty > 0 &&
        check?.grossWeightKg > 0 &&
        (check?.truckPriceBDT ?? 0) > 0 &&
        check?.hubManagerConfirmed
      );
      if (!gatePassed) {
        return NextResponse.json(
          {
            message:
              "All 4 pre-dispatch steps must be complete before truck assignment: physical arrival, weight/quality check, truck price, and manager confirmation.",
          },
          { status: 400 },
        );
      }

      // QR codes are recommended but not a hard blocker
    }

    // Truck capacity check — enforce when assigning a truck
    if (body.assignedTruck && body.assignedTruck !== order.assignedTruck) {
      const truck = await prisma.truck.findUnique({ where: { id: body.assignedTruck } });
      if (truck && truck.capacityKg > 0) {
        // Sum grossWeightKg of all other orders already on this truck (excluding dispatched)
        const allChecks = await readPreDispatchChecks();
        const otherOrders = await prisma.order.findMany({
          where: {
            assignedTruck: body.assignedTruck,
            id: { not: order.id },
            status: { not: "CANCELLED" },
            dispatched: { not: true },
          },
          select: { orderCode: true },
        });
        const alreadyLoadedKg = otherOrders.reduce((sum, o) => {
          const chk = allChecks.find((c) => c.orderCode === o.orderCode);
          return sum + (chk?.grossWeightKg ?? 0);
        }, 0);
        const currentCheck = await getPreDispatchCheck(order.orderCode);
        const thisOrderKg = currentCheck?.grossWeightKg ?? 0;
        if (alreadyLoadedKg + thisOrderKg > truck.capacityKg) {
          return NextResponse.json(
            {
              message: `Truck capacity exceeded. Truck ${truck.truckCode} (${truck.reg}) has a capacity of ${truck.capacityKg} kg. Currently loaded: ${alreadyLoadedKg} kg. This order weighs ${thisOrderKg} kg — total would be ${alreadyLoadedKg + thisOrderKg} kg.`,
            },
            { status: 400 },
          );
        }
      }
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        assignedTruck: body.assignedTruck !== undefined ? body.assignedTruck : order.assignedTruck,
        loadConfirmed: body.loadConfirmed !== undefined ? body.loadConfirmed : order.loadConfirmed,
        dispatched: body.dispatched !== undefined ? body.dispatched : order.dispatched,
        status: body.dispatched ? "DISPATCHED" : order.status,
      },
    });

    // Resolve all parties
    const [buyerId, parties] = await Promise.all([
      Promise.resolve(updated.buyerId ?? null),
      getLotParties(updated.lotId),
    ]);

    // Truck just assigned
    if (body.assignedTruck && !order.assignedTruck) {
      if (buyerId) {
        await notify(buyerId, {
          type: "ORDER_DISPATCHED",
          title: "Truck Assigned to Your Order",
          message: `Truck ${updated.assignedTruck} has been assigned to your order for "${updated.product}" (${updated.orderCode}). Loading is in progress.`,
          link: "/buyer-dashboard/orders",
        });
      }
      if (parties.sellerId) {
        await notify(parties.sellerId, {
          type: "ORDER_DISPATCHED",
          title: "Truck Assigned for Dispatch",
          message: `Truck ${updated.assignedTruck} has been assigned to deliver order (${updated.orderCode}) for "${updated.product}" to ${updated.buyerName}.`,
          link: "/seller-dashboard/orders",
        });
      }
    }

    // Load confirmed
    if (body.loadConfirmed && !order.loadConfirmed) {
      if (buyerId) {
        await notify(buyerId, {
          type: "ORDER_DISPATCHED",
          title: "Load Confirmed on Truck",
          message: `Your order for "${updated.product}" (${updated.orderCode}) has been loaded onto truck ${updated.assignedTruck ?? ""}. Awaiting dispatch.`,
          link: "/buyer-dashboard/orders",
        });
      }
      if (parties.sellerId) {
        await notify(parties.sellerId, {
          type: "ORDER_DISPATCHED",
          title: "Order Loaded onto Truck",
          message: `Order (${updated.orderCode}) for "${updated.product}" has been loaded onto truck ${updated.assignedTruck ?? ""}. Ready for dispatch.`,
          link: "/seller-dashboard/orders",
        });
      }
    }

    // Order dispatched
    if (body.dispatched && !order.dispatched) {
      const truckInfo = updated.assignedTruck ? ` on truck ${updated.assignedTruck}` : "";
      if (buyerId) {
        await notify(buyerId, {
          type: "ORDER_DISPATCHED",
          title: "Your Order is On the Way!",
          message: `Your order for "${updated.product}" (${updated.orderCode}) has been dispatched${truckInfo}. It will arrive at your delivery hub soon.`,
          link: "/buyer-dashboard/orders",
        });
      }
      if (parties.sellerId) {
        await notify(parties.sellerId, {
          type: "ORDER_DISPATCHED",
          title: "Order Dispatched",
          message: `Order (${updated.orderCode}) for "${updated.product}" has been dispatched${truckInfo} to ${updated.buyerName}.`,
          link: "/seller-dashboard/orders",
        });
      }
      // Hub managers — informed when order leaves their hub
      await notifyMany(parties.hubManagerIds, {
        type: "ORDER_DISPATCHED",
        title: "Order Dispatched from Hub",
        message: `Order (${updated.orderCode}) for "${updated.product}" was dispatched${truckInfo} to buyer ${updated.buyerName}.`,
        link: "/hub-manager",
      });
    }

    return NextResponse.json({
      id: updated.orderCode,
      assignedTruck: updated.assignedTruck,
      loadConfirmed: updated.loadConfirmed,
      dispatched: updated.dispatched,
      status: updated.status,
    });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
