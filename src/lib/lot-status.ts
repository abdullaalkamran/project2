export type LotWorkflowStatus =
  | "PENDING_DELIVERY"
  | "AT_HUB"
  | "IN_QC"
  | "QC_SUBMITTED"
  | "QC_PASSED"
  | "QC_FAILED"
  | "LIVE"
  | "AUCTION_ENDED"
  | "AUCTION_UNSOLD"      // auction closed with no winning bid — seller must act
  | "FIXED_PRICE_REVIEW"  // seller converted unsold lot to fixed price — 2nd QC cycle
  | "SOLD"
  | "DELIVERED"
  | "DEACTIVATED";

export const MARKETPLACE_VISIBLE_STATUSES: readonly LotWorkflowStatus[] = [
  // LIVE auction lots
  "LIVE",
  // Completed auctions (top bidder selected, order pending)
  "AUCTION_ENDED",
  // Approved fixed-price listings
  // Note: AUCTION lots at QC_PASSED are NOT visible — they haven't started yet
  "QC_PASSED",
  // Sold lots
  "SOLD",
  // Excluded: AUCTION_UNSOLD (seller must re-list), FIXED_PRICE_REVIEW (under 2nd approval)
] as const;

export const SELLER_ACTIVE_STATUSES: readonly LotWorkflowStatus[] = [
  "PENDING_DELIVERY",
  "AT_HUB",
  "IN_QC",
  "QC_SUBMITTED",
  "QC_PASSED",
  "LIVE",
  "AUCTION_UNSOLD",
  "FIXED_PRICE_REVIEW",
] as const;

export const SELLER_PAST_STATUSES: readonly LotWorkflowStatus[] = [
  "QC_FAILED",
  "SOLD",
  "DELIVERED",
  "AUCTION_ENDED",
  "DEACTIVATED",
] as const;

export function toSellerStatusLabel(status: string): string {
  switch (status as LotWorkflowStatus) {
    case "PENDING_DELIVERY":
      return "Waiting Hub Manager Approval";
    case "AT_HUB":
      return "Hub Received";
    case "IN_QC":
      return "QC Check";
    case "QC_SUBMITTED":
      return "Waiting QC Approval";
    case "QC_PASSED":
      return "QC Passed";
    case "QC_FAILED":
      return "QC Failed";
    case "LIVE":
      return "Approved in Marketplace";
    case "AUCTION_ENDED":
      return "Auction Ended";
    case "AUCTION_UNSOLD":
      return "Action Required: Auction Unsold";
    case "FIXED_PRICE_REVIEW":
      return "Price Under Review";
    case "SOLD":
      return "Sold";
    case "DELIVERED":
      return "Delivered";
    case "DEACTIVATED":
      return "Deactivated";
    default:
      return status;
  }
}
