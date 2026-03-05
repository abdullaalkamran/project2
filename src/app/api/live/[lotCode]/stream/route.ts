import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { subscribeLot } from "@/lib/bid-broadcaster";

export const dynamic = "force-dynamic";

/**
 * GET /api/live/[lotCode]/stream
 *
 * Server-Sent Events endpoint.  Each browser tab watching a live auction
 * connects here and receives real-time bid & close events.
 *
 * Events emitted:
 *   - { type: "ping" }                          — keep-alive every 20 s
 *   - { type: "bid",  id, bidderName, amount, timestamp }
 *   - { type: "closed", result, winningBid?, winner? }
 *
 * The connection is cleaned up automatically when the client disconnects
 * (AbortSignal from req.signal).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lotCode: string }> },
) {
  const { lotCode } = await params;

  // Only allow SSE for currently-LIVE lots
  const lot = await prisma.lot.findUnique({
    where: { lotCode: lotCode.toUpperCase() },
    select: { status: true },
  });

  if (!lot || lot.status !== "LIVE") {
    return new Response("Lot not found or auction not live", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Stream already closed — ignore
        }
      };

      // Send initial ping so the client knows the connection is open
      send({ type: "ping" });

      // Subscribe to bid events for this lot
      const unsub = subscribeLot(lotCode.toUpperCase(), (event) => {
        send(event);
      });

      // Heartbeat every 20 seconds to keep proxies/load-balancers alive
      const heartbeat = setInterval(() => send({ type: "ping" }), 20_000);

      // Cleanup when the client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsub();
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx/Railway proxy buffering
    },
  });
}
