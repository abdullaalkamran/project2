import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ReceiptClient from "./ReceiptClient";

export default async function DeliveryReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>}>
      <ReceiptClient id={id} />
    </Suspense>
  );
}
