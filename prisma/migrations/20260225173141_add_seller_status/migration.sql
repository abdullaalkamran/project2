-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
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
    "sellerStatus" TEXT NOT NULL DEFAULT 'NONE',
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
INSERT INTO "new_Order" ("arrivedAt", "assignedTruck", "buyerId", "buyerName", "confirmedAt", "deliveryPoint", "dispatched", "id", "loadConfirmed", "lotId", "orderCode", "pickedUpAt", "product", "qty", "sellerId", "sellerName", "status", "totalAmount", "winningBid") SELECT "arrivedAt", "assignedTruck", "buyerId", "buyerName", "confirmedAt", "deliveryPoint", "dispatched", "id", "loadConfirmed", "lotId", "orderCode", "pickedUpAt", "product", "qty", "sellerId", "sellerName", "status", "totalAmount", "winningBid" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderCode_key" ON "Order"("orderCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
