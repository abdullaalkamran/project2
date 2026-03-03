-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "grade" TEXT NOT NULL DEFAULT 'A',
    "hubId" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "storageType" TEXT NOT NULL DEFAULT '',
    "baggageType" TEXT NOT NULL DEFAULT '',
    "baggageQty" INTEGER NOT NULL DEFAULT 0,
    "basePrice" REAL NOT NULL,
    "askingPricePerKg" REAL NOT NULL,
    "minBidRate" REAL,
    "sellerId" TEXT,
    "sellerName" TEXT NOT NULL,
    "sellerPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_DELIVERY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" DATETIME,
    "qcLeaderName" TEXT,
    "qcCheckerName" TEXT,
    "qcTaskStatus" TEXT,
    "verdict" TEXT,
    "qcNotes" TEXT,
    "qcSubmittedAt" DATETIME,
    "leaderDecision" TEXT,
    CONSTRAINT "Lot_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QCReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "checkerId" TEXT,
    "checkerName" TEXT,
    "grade" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "minBidRate" REAL,
    "notes" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QCReport_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QCReport_checkerId_fkey" FOREIGN KEY ("checkerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderCode" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "buyerId" TEXT,
    "sellerId" TEXT,
    "buyerName" TEXT NOT NULL,
    "sellerName" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "qty" TEXT NOT NULL,
    "deliveryPoint" TEXT NOT NULL,
    "winningBid" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "assignedTruck" TEXT,
    "loadConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "dispatched" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivedAt" DATETIME,
    "pickedUpAt" DATETIME,
    CONSTRAINT "Order_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "bidderId" TEXT,
    "bidderName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bid_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "truckCode" TEXT NOT NULL,
    "reg" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacityKg" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "currentDestination" TEXT,
    "liveCoordLat" REAL,
    "liveCoordLng" REAL,
    "liveCoordsUpdatedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "licenseExpiry" TEXT NOT NULL,
    "nid" TEXT NOT NULL,
    "joinDate" TEXT NOT NULL,
    "truckId" TEXT,
    CONSTRAINT "Driver_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Lot_lotCode_key" ON "Lot"("lotCode");

-- CreateIndex
CREATE UNIQUE INDEX "QCReport_lotId_key" ON "QCReport"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderCode_key" ON "Order"("orderCode");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_truckCode_key" ON "Truck"("truckCode");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_reg_key" ON "Truck"("reg");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_driverCode_key" ON "Driver"("driverCode");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_license_key" ON "Driver"("license");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_nid_key" ON "Driver"("nid");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_truckId_key" ON "Driver"("truckId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
