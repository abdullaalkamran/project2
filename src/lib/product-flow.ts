export type LotUnit = "kg" | "piece" | "dozen" | "crate" | "bag" | "box";

export type FlowLotStatus =
  | "PENDING_DELIVERY"
  | "AT_HUB"
  | "IN_QC"
  | "QC_SUBMITTED"
  | "QC_PASSED"
  | "QC_FAILED"
  | "LIVE"
  | "AUCTION_ENDED";

export type QCTaskStatus = "PENDING" | "IN_PROGRESS" | "SUBMITTED";

export type FlowLot = {
  id: string;
  title: string;
  category: string;
  quantity: number;
  unit: LotUnit;
  grade: "A" | "B" | "C";
  hubId: string;
  description: string;
  storageType: string;
  baggageType: string;
  baggageQty: number;
  basePrice: number;
  askingPricePerKg: number;
  minBidRate?: number;
  sellerName: string;
  sellerPhone?: string;
  status: FlowLotStatus;
  createdAt: string;
  receivedAt?: string;
  qcLeader?: string;
  qcChecker?: string;
  qcTaskStatus?: QCTaskStatus;
  verdict?: "PASSED" | "FAILED" | "CONDITIONAL";
  qcNotes?: string;
  qcSubmittedAt?: string;
  leaderDecision?: "Approved" | "Rejected" | "Pending";
  sellerTransportCost?: number;
  sellerPhotoUrls?: string[];
  qcPhotoUrls?: string[];
};

export type FlowOrderStatus = "CONFIRMED" | "DISPATCHED" | "ARRIVED" | "PICKED_UP";

export type FlowOrder = {
  id: string;
  lotId: string;
  product: string;
  qty: string;
  seller: string;
  buyer: string;
  deliveryPoint: string;
  winningBid: string;
  totalAmount: string;
  confirmedAt: string;
  assignedTruck?: string | null;
  loadConfirmed: boolean;
  dispatched: boolean;
  arrivedAt?: string;
  pickedUpAt?: string;
  status: FlowOrderStatus;
};

export type ProductFlowData = {
  lots: FlowLot[];
  orders: FlowOrder[];
};

