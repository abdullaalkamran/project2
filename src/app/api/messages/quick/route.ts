import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { notify } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { buyerId, message, orderCode, productName } = (await req.json()) as {
      buyerId?: string | null;
      message: string;
      orderCode: string;
      productName: string;
    };

    if (!message?.trim()) {
      return NextResponse.json({ message: "Message cannot be empty" }, { status: 400 });
    }

    const recipientId = buyerId ?? null;
    if (!recipientId) {
      return NextResponse.json({ message: "Buyer ID is required" }, { status: 400 });
    }

    await notify(recipientId, {
      type: "MESSAGE",
      title: `Message from ${session.name}`,
      message: `Re: "${productName}" (${orderCode}) — ${message.trim()}`,
      link: "/buyer-dashboard/orders",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quick-message]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
