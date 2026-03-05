export function buildShipmentScanCode(orderCode: string): string {
  return `HUBREC-${orderCode.toUpperCase()}`;
}

export function buildPacketScanCode(orderCode: string, packetNumber: number): string {
  const code = orderCode.toUpperCase();
  const idx = String(packetNumber).padStart(3, "0");
  return `PKT-${code}-${idx}`;
}

export function parseShipmentScanCode(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase();
  if (!cleaned) return null;

  if (cleaned.startsWith("HUBREC-ORD-")) {
    return cleaned.replace(/^HUBREC-/, "");
  }

  if (cleaned.startsWith("ORD-")) {
    return cleaned;
  }

  return null;
}

export function parsePacketScanCode(
  raw: string,
): { orderCode: string; packetCode: string } | null {
  const cleaned = raw.trim().toUpperCase();
  if (!cleaned) return null;

  // Allow QR payloads to contain short product details after the packet code,
  // e.g. `PKT-ORD-123456-001|P:MINIKET|Q:400KG`.
  const token = cleaned.split(/[|\s]/)[0];
  const matched = token.match(/^PKT-(ORD-[A-Z0-9-]+)-(\d{3,4})$/);
  if (!matched) return null;

  return {
    orderCode: matched[1],
    packetCode: token,
  };
}
