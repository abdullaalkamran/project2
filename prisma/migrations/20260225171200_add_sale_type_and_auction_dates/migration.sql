-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lot" (
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
    "saleType" TEXT NOT NULL DEFAULT 'AUCTION',
    "auctionStartsAt" DATETIME,
    "auctionEndsAt" DATETIME,
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
INSERT INTO "new_Lot" ("askingPricePerKg", "baggageQty", "baggageType", "basePrice", "category", "createdAt", "description", "grade", "hubId", "id", "leaderDecision", "lotCode", "minBidRate", "qcCheckerName", "qcLeaderName", "qcNotes", "qcSubmittedAt", "qcTaskStatus", "quantity", "receivedAt", "sellerId", "sellerName", "sellerPhone", "status", "storageType", "title", "unit", "verdict") SELECT "askingPricePerKg", "baggageQty", "baggageType", "basePrice", "category", "createdAt", "description", "grade", "hubId", "id", "leaderDecision", "lotCode", "minBidRate", "qcCheckerName", "qcLeaderName", "qcNotes", "qcSubmittedAt", "qcTaskStatus", "quantity", "receivedAt", "sellerId", "sellerName", "sellerPhone", "status", "storageType", "title", "unit", "verdict" FROM "Lot";
DROP TABLE "Lot";
ALTER TABLE "new_Lot" RENAME TO "Lot";
CREATE UNIQUE INDEX "Lot_lotCode_key" ON "Lot"("lotCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
