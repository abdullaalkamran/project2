-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "photo" TEXT,
    "hubId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessName" TEXT,
    "ownerName" TEXT,
    "address" TEXT,
    "nid" TEXT,
    "tradeLicense" TEXT,
    "bankName" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "routingNumber" TEXT,
    "mobileBanking" TEXT,
    "mobileNumber" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "lotCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "grade" TEXT NOT NULL DEFAULT 'A',
    "hubId" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "storageType" TEXT NOT NULL DEFAULT '',
    "baggageType" TEXT NOT NULL DEFAULT '',
    "baggageQty" INTEGER NOT NULL DEFAULT 0,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "askingPricePerKg" DOUBLE PRECISION NOT NULL,
    "minBidRate" DOUBLE PRECISION,
    "sellerId" TEXT,
    "sellerName" TEXT NOT NULL,
    "sellerPhone" TEXT,
    "saleType" TEXT NOT NULL DEFAULT 'AUCTION',
    "auctionStartsAt" TIMESTAMP(3),
    "auctionEndsAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING_DELIVERY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "fixedAskingPrice" DOUBLE PRECISION,
    "sellerTransportCost" DOUBLE PRECISION,
    "listOnMarketplace" BOOLEAN,
    "qcLeaderName" TEXT,
    "qcCheckerName" TEXT,
    "qcTaskStatus" TEXT,
    "verdict" TEXT,
    "qcNotes" TEXT,
    "qcSubmittedAt" TIMESTAMP(3),
    "leaderDecision" TEXT,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QCReport" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "checkerId" TEXT,
    "checkerName" TEXT,
    "grade" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "minBidRate" DOUBLE PRECISION,
    "transportCost" DOUBLE PRECISION,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fieldConfirmations" JSONB,
    "inspectionLat" DOUBLE PRECISION,
    "inspectionLng" DOUBLE PRECISION,
    "inspectionAddress" TEXT,

    CONSTRAINT "QCReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderCode" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "buyerId" TEXT,
    "sellerId" TEXT,
    "buyerName" TEXT NOT NULL,
    "sellerName" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "qty" TEXT NOT NULL,
    "deliveryPoint" TEXT NOT NULL,
    "winningBid" DOUBLE PRECISION NOT NULL,
    "productAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transportCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellerTransportCost" DOUBLE PRECISION,
    "buyerTransportCost" DOUBLE PRECISION,
    "platformFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellerPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "sellerStatus" TEXT NOT NULL DEFAULT 'NONE',
    "assignedTruck" TEXT,
    "loadConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "dispatched" BOOLEAN NOT NULL DEFAULT false,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "hubReceivedAt" TIMESTAMP(3),
    "distributorId" TEXT,
    "distributorName" TEXT,
    "distributorPhone" TEXT,
    "distributorAssignedAt" TIMESTAMP(3),
    "pickedUpFromHubAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "bidderId" TEXT,
    "bidderName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "transportCost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL,
    "truckCode" TEXT NOT NULL,
    "reg" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacityKg" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "currentDestination" TEXT,
    "liveCoordLat" DOUBLE PRECISION,
    "liveCoordLng" DOUBLE PRECISION,
    "liveCoordsUpdatedAt" TIMESTAMP(3),
    "photoUrl" TEXT,
    "registrationStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "registrationNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT,
    "submittedByName" TEXT,
    "hubId" TEXT,
    "hubName" TEXT,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "driverCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "license" TEXT NOT NULL,
    "licenseExpiry" TEXT NOT NULL,
    "licensePhotoUrl" TEXT,
    "nid" TEXT NOT NULL,
    "nidPhotoUrl" TEXT,
    "photoUrl" TEXT,
    "joinDate" TEXT NOT NULL,
    "truckId" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactRelation" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactAddress" TEXT,
    "emergencyContactPhotoUrl" TEXT,
    "emergencyContactNidPhotoUrl" TEXT,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TruckInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TruckInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderId" TEXT,
    "orderCode" TEXT NOT NULL,
    "buyer" TEXT NOT NULL,
    "seller" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdBy" TEXT,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "paymentCode" TEXT NOT NULL,
    "sellerId" TEXT,
    "sellerName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'Bank Transfer',
    "bankDetails" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectedReason" TEXT,
    "transactionRef" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT NOT NULL DEFAULT '/',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_lotCode_key" ON "Lot"("lotCode");

-- CreateIndex
CREATE INDEX "Lot_sellerId_idx" ON "Lot"("sellerId");

-- CreateIndex
CREATE INDEX "Lot_status_idx" ON "Lot"("status");

-- CreateIndex
CREATE INDEX "Lot_hubId_idx" ON "Lot"("hubId");

-- CreateIndex
CREATE INDEX "Lot_saleType_idx" ON "Lot"("saleType");

-- CreateIndex
CREATE INDEX "Lot_createdAt_idx" ON "Lot"("createdAt");

-- CreateIndex
CREATE INDEX "Lot_qcCheckerName_idx" ON "Lot"("qcCheckerName");

-- CreateIndex
CREATE UNIQUE INDEX "QCReport_lotId_key" ON "QCReport"("lotId");

-- CreateIndex
CREATE INDEX "QCReport_checkerId_idx" ON "QCReport"("checkerId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderCode_key" ON "Order"("orderCode");

-- CreateIndex
CREATE INDEX "Order_lotId_idx" ON "Order"("lotId");

-- CreateIndex
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");

-- CreateIndex
CREATE INDEX "Order_sellerId_idx" ON "Order"("sellerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_confirmedAt_idx" ON "Order"("confirmedAt");

-- CreateIndex
CREATE INDEX "Bid_lotId_idx" ON "Bid"("lotId");

-- CreateIndex
CREATE INDEX "Bid_bidderId_idx" ON "Bid"("bidderId");

-- CreateIndex
CREATE INDEX "Bid_createdAt_idx" ON "Bid"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_truckCode_key" ON "Truck"("truckCode");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_reg_key" ON "Truck"("reg");

-- CreateIndex
CREATE INDEX "Truck_status_idx" ON "Truck"("status");

-- CreateIndex
CREATE INDEX "Truck_hubId_idx" ON "Truck"("hubId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_driverCode_key" ON "Driver"("driverCode");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_license_key" ON "Driver"("license");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_nid_key" ON "Driver"("nid");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_truckId_key" ON "Driver"("truckId");

-- CreateIndex
CREATE UNIQUE INDEX "TruckInvite_token_key" ON "TruckInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_code_key" ON "Dispute"("code");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_createdAt_idx" ON "Dispute"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_paymentCode_key" ON "PaymentRequest"("paymentCode");

-- CreateIndex
CREATE INDEX "PaymentRequest_sellerId_idx" ON "PaymentRequest"("sellerId");

-- CreateIndex
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCReport" ADD CONSTRAINT "QCReport_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCReport" ADD CONSTRAINT "QCReport_checkerId_fkey" FOREIGN KEY ("checkerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
