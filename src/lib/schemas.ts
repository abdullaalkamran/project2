import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUpSchema = z
  .object({
    company: z.string().min(2, "Business name must be at least 2 characters"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export const assignRoleSchema = z.object({
  role: z.enum([
    "buyer", "seller", "admin", "hub_manager",
    "qc_leader", "qc_checker", "delivery_hub_manager", "delivery_distributor",
  ] as const),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

// ─── Contact ──────────────────────────────────────────────────────────────────

export const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

// ─── Lot / Create Lot ─────────────────────────────────────────────────────────

export const createLotSchema = z
  .object({
    title: z.string().min(1, "Product name is required"),
    description: z.string().min(20, "Description must be at least 20 characters"),
    category: z.string().min(1, "Category is required"),
    grade: z.enum(["A", "B", "C"] as const),
    unit: z.enum(["kg", "piece", "dozen", "crate", "bag", "box"] as const),
    quantity: z.coerce.number().positive("Quantity must be greater than 0"),
    storageType: z.string().min(1, "Storage type is required"),
    baggageType: z.string().min(1, "Baggage type is required"),
    baggageQty: z.coerce.number().positive("Baggage quantity must be greater than 0"),
    basePrice: z.coerce.number().positive("Base price must be greater than 0"),
    askingPricePerKg: z.coerce.number().positive("Asking price must be greater than 0"),
    transportCost: z.preprocess(
      (v) => (v === "" || v == null) ? undefined : Number(v),
      z.number().min(0, "Transport cost cannot be negative").optional(),
    ),
    hubId: z.string().min(1, "Please select a hub"),
    saleType: z.enum(["AUCTION", "FIXED_PRICE"] as const).default("AUCTION"),
    auctionStartsAt: z.string().optional(),
    auctionEndsAt: z.string().optional(),
  })
  .refine(
    (d) => d.saleType !== "AUCTION" || (!!d.auctionStartsAt && !!d.auctionEndsAt),
    { message: "Auction start and end times are required", path: ["auctionStartsAt"] }
  );

// ─── Bid ─────────────────────────────────────────────────────────────────────

export const placeBidSchema = (minAmount: number) =>
  z.object({
    amount: z.coerce
      .number()
      .min(minAmount + 1, `Bid must be greater than ৳ ${minAmount.toLocaleString()}`),
  });

export const autoBidSchema = (minAmount: number) =>
  z.object({
    maxAmount: z.coerce
      .number()
      .min(minAmount + 1, `Max bid must exceed ৳ ${minAmount.toLocaleString()}`),
    incrementAmount: z.coerce
      .number()
      .min(100, "Increment must be at least ৳ 100"),
  });

// ─── QC Submit ────────────────────────────────────────────────────────────────

export const qcSubmitSchema = z.object({
  // ── Lot selection ──────────────────────────────────────────────────────────
  lotId: z.string().min(1, "Lot ID is required"),
  // ── Lot detail corrections ─────────────────────────────────────────────────
  product:     z.string().min(1, "Product name is required"),
  category:    z.string().min(1, "Category is required"),
  lotGrade:    z.enum(["A", "B", "C"] as const),
  unit:        z.enum(["kg", "piece", "dozen", "crate", "bag", "box"] as const),
  qty:         z.coerce.number().positive("Must be > 0"),
  storageType: z.string().min(1, "Storage type is required"),
  baggageType: z.string().min(1, "Baggage type is required"),
  baggageQty:  z.coerce.number().positive("Must be > 0"),
  basePrice:   z.coerce.number().positive("Must be > 0"),
  askingPricePerKg: z.coerce.number().positive("Must be > 0"),
  description: z.string().min(20, "Min 20 characters"),
  // ── QC-set pricing ─────────────────────────────────────────────────────────
  minBidRate:  z.coerce.number().positive("Minimum bid rate must be > 0"),
  // ── Transportation cost (QC checker determines the actual cost) ─────────────
  transportCost: z.coerce.number().min(0, "Transport cost cannot be negative"),
  // ── Inspection results ─────────────────────────────────────────────────────
  verdict:    z.enum(["PASSED", "FAILED", "CONDITIONAL"] as const),
  grade:      z.enum(["A", "B", "C"] as const),
  weight:     z.preprocess(
    (v) => (v === "" || v == null) ? undefined : Number(v),
    z.number().positive("Weight must be positive").optional(),
  ),
  defectRate: z.preprocess(
    (v) => (v === "" || v == null) ? undefined : Number(v),
    z.number().min(0).max(100, "Must be 0–100").optional(),
  ),
  notes:       z.string().min(10, "Notes must be at least 10 characters"),
  qcNote:      z.string().optional(),
});

// ─── Hub Inbound Receive ──────────────────────────────────────────────────────

export const receiveInboundSchema = z.object({
  lotId: z.string().min(1, "Lot ID is required"),
  receivedQty: z.coerce.number().positive("Quantity must be positive"),
  condition: z.enum(["GOOD", "DAMAGED", "PARTIAL"] as const),
  notes: z.string().optional(),
});

// ─── Wallet / Finance ─────────────────────────────────────────────────────────

export const walletDepositSchema = z.object({
  amount: z.coerce
    .number()
    .min(100, "Minimum deposit is ৳ 100")
    .max(1000000, "Maximum deposit is ৳ 10,00,000"),
  method: z.enum(["CARD", "BANK_TRANSFER", "MOBILE_BANKING"] as const),
});

export const walletWithdrawSchema = z.object({
  amount: z.coerce
    .number()
    .min(500, "Minimum withdrawal is ৳ 500"),
  bankAccount: z.string().min(5, "Bank account is required"),
  notes: z.string().optional(),
});

// ─── Profile / Settings ───────────────────────────────────────────────────────

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^(\+?880|0)1[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number")
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Current password is required"),
    password: z.string().min(8, "New password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

// ─── Dispute ─────────────────────────────────────────────────────────────────

export const disputeSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  reason: z.string().min(20, "Please describe the issue in at least 20 characters"),
});

// ─── Seller Settings ──────────────────────────────────────────────────────────

export const sellerProfileSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  phone: z
    .string()
    .regex(/^(\+?880|0)1[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number"),
  address: z.string().min(3, "Address is required"),
  nid: z.string().min(10, "NID must be at least 10 characters"),
  tradeLicense: z.string().min(3, "Trade license is required"),
});

export const sellerBankSchema = z.object({
  bankName: z.string().min(2, "Bank name is required"),
  accountName: z.string().min(2, "Account holder name is required"),
  accountNumber: z.string().min(8, "Account number must be at least 8 digits"),
  routingNumber: z.string().min(6, "Routing number must be at least 6 digits"),
  mobileBanking: z.string().min(2, "Mobile banking provider is required"),
  mobileNumber: z
    .string()
    .regex(/^(\+?880|0)1[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number"),
});

// ─── Buyer Settings ───────────────────────────────────────────────────────────

export const buyerProfileSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  businessName: z.string().min(2, "Business name is required"),
  phone: z
    .string()
    .regex(/^(\+?880|0)1[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  tradeLicense: z.string().min(3, "Trade license is required"),
  nid: z.string().min(10, "NID must be at least 10 characters"),
});

// ─── Review ───────────────────────────────────────────────────────────────────

export const reviewSchema = z.object({
  rating: z.coerce.number().min(1, "Please select a rating").max(5),
  comment: z.string().optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type AssignRoleFormData = z.infer<typeof assignRoleSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type CreateLotFormData = z.infer<typeof createLotSchema>;
export type QCSubmitFormData = z.infer<typeof qcSubmitSchema>;
export type ReceiveInboundFormData = z.infer<typeof receiveInboundSchema>;
export type WalletDepositFormData = z.infer<typeof walletDepositSchema>;
export type WalletWithdrawFormData = z.infer<typeof walletWithdrawSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type DisputeFormData = z.infer<typeof disputeSchema>;
export type SellerProfileFormData = z.infer<typeof sellerProfileSchema>;
export type SellerBankFormData = z.infer<typeof sellerBankSchema>;
export type BuyerProfileFormData = z.infer<typeof buyerProfileSchema>;
export type ReviewFormData = z.infer<typeof reviewSchema>;
