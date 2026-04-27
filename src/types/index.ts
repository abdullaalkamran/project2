// ─── Enums ───────────────────────────────────────────────────────────────────

export type Role =
  | "buyer"
  | "seller"
  | "admin"
  | "hub_manager"
  | "qc_leader"
  | "qc_checker"
  | "delivery_hub_manager"
  | "delivery_distributor"
  | "aroth";

export type LotStatus =
  | "DRAFT"
  | "PENDING_DELIVERY"
  | "AT_HUB"
  | "IN_QC"
  | "QC_PASSED"
  | "QC_FAILED"
  | "SCHEDULED"
  | "LIVE"
  | "AUCTION_ENDED"
  | "PAID"
  | "DISPATCHED"
  | "AT_DELIVERY_POINT"
  | "DELIVERED"
  | "RETURNED";

export type Grade = "A" | "B" | "C";
export type Unit = "kg" | "piece" | "dozen" | "crate" | "bag" | "box";

export type BidStatus = "ACTIVE" | "OUTBID" | "WON" | "LOST";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "DISPATCHED"
  | "AT_DELIVERY_POINT"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type QCVerdict = "PENDING" | "PASSED" | "FAILED" | "CONDITIONAL";
export type DisputeStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";

// ─── Core Models ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: Role[];
  activeRole: Role;
  isVerified: boolean;
  createdAt: string;
}

export interface Hub {
  id: string;
  name: string;
  city: string;
  address: string;
}

export interface DeliveryPoint {
  id: string;
  name: string;
  city: string;
  address: string;
}

export interface LotPhoto {
  id: string;
  url: string;
  source: "SELLER" | "QC";
}

export interface Lot {
  id: string;
  title: string;
  description: string;
  category: string;
  grade: Grade;
  unit: Unit;
  quantity: number;
  basePrice: number;
  currentPrice: number;
  status: LotStatus;
  sellerId: string;
  sellerName?: string;
  hubId?: string;
  hub?: Hub;
  photos: LotPhoto[];
  auctionStartsAt?: string;
  auctionEndsAt?: string;
  createdAt: string;
}

export interface Bid {
  id: string;
  lotId: string;
  lot?: Lot;
  bidderId: string;
  bidderName?: string;
  amount: number;
  status: BidStatus;
  createdAt: string;
}

export interface AutoBid {
  id: string;
  auctionId: string;
  buyerId: string;
  maxAmount: number;
  incrementAmount: number;
}

export interface Order {
  id: string;
  lotId: string;
  lot?: Lot;
  buyerId: string;
  buyerName?: string;
  sellerId: string;
  totalAmount: number;
  status: OrderStatus;
  deliveryMethod: "HUB_PICKUP" | "COURIER";
  deliveryPointId?: string;
  deliveryPoint?: DeliveryPoint;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  buyerId: string;
  amount: number;
  status: PaymentStatus;
  method: "WALLET" | "CARD" | "BANK_TRANSFER";
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: "CREDIT" | "DEBIT" | "HOLD" | "RELEASE";
  amount: number;
  description: string;
  createdAt: string;
}

export interface QCReport {
  id: string;
  lotId: string;
  inspectorId: string;
  inspectorName?: string;
  verdict: QCVerdict;
  grade?: Grade;
  notes: string;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName?: string;
  body: string;
  createdAt: string;
}

export interface MessageThread {
  id: string;
  participants: string[];
  lotId?: string;
  lastMessage?: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  raisedById: string;
  reason: string;
  status: DisputeStatus;
  resolution?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  field?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
