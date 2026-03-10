export type QCDecisionStatus = "pending" | "approved" | "rejected" | "reinspect";

export type QCFieldChange = {
  label: string;
  before: string;
  after: string;
};

export type QCPendingApprovalRecord = {
  reportId: string;
  lotId: string;
  product: string;
  qty: number;
  unit: string;
  seller: string;
  checker: string;
  hub: string;
  submitted: string;
  grade: "A" | "B" | "C";
  verdict: "PASSED" | "CONDITIONAL" | "FAILED";
  minBidRate: number;
  transportCost?: number;         // QC checker's determined transport cost
  sellerTransportCost?: number;   // seller's original estimate
  sellerTransportShare?: string;  // "YES" | "NO" | "HALF"
  freeQtyEnabled?: boolean;
  freeQtyPer?: number;
  freeQtyAmount?: number;
  freeQtyUnit?: string;
  notes: string;
  qcNote?: string;
  weight?: number;
  defectRate?: number;
  askingPricePerKg: number;
  basePrice: number;
  photosCount: number;
  videosCount: number;
  photoPreviews?: string[];
  sellerPhotoUrls?: string[];
  qcPhotoPreviews?: string[];
  selectedMarketplacePhotoUrl?: string;
  selectedMarketplacePhotoUrls?: string[];
  changes: QCFieldChange[];
  sellerSnapshot?: Record<string, string>;
  qcSnapshot?: Record<string, string>;
  decision: QCDecisionStatus;
};
