-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "districtId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "District_name_key" ON "District"("name");

-- CreateIndex
CREATE INDEX "District_name_idx" ON "District"("name");

-- CreateIndex
CREATE INDEX "User_districtId_idx" ON "User"("districtId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default districts
INSERT INTO "District" ("id", "name", "createdAt", "updatedAt") VALUES
('district_bagerhat', 'Bagerhat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_bandarban', 'Bandarban', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_barguna', 'Barguna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_barishal', 'Barishal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_bhola', 'Bhola', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_bogura', 'Bogura', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_brahmanbaria', 'Brahmanbaria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_chandpur', 'Chandpur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_chapainawabganj', 'Chapainawabganj', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_chattogram', 'Chattogram', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_chuadanga', 'Chuadanga', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_cox_s_bazar', 'Cox''s Bazar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_cumilla', 'Cumilla', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_dhaka', 'Dhaka', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_dinajpur', 'Dinajpur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_faridpur', 'Faridpur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_feni', 'Feni', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_gaibandha', 'Gaibandha', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_gazipur', 'Gazipur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_gopalganj', 'Gopalganj', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_habiganj', 'Habiganj', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_jamalpur', 'Jamalpur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_jashore', 'Jashore', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_jhalokathi', 'Jhalokathi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_jhenaidah', 'Jhenaidah', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_joypurhat', 'Joypurhat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_khagrachhari', 'Khagrachhari', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_khulna', 'Khulna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_kishoreganj', 'Kishoreganj', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_kurigram', 'Kurigram', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_kushtia', 'Kushtia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_lakshmipur', 'Lakshmipur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_lalmonirhat', 'Lalmonirhat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_madaripur', 'Madaripur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_magura', 'Magura', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_manikganj', 'Manikganj', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_meherpur', 'Meherpur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_moulvibazar', 'Moulvibazar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_munshiganj', 'Munshiganj', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_mymensingh', 'Mymensingh', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_naogaon', 'Naogaon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_narail', 'Narail', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_narayanganj', 'Narayanganj', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_narsingdi', 'Narsingdi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_natore', 'Natore', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_netrokona', 'Netrokona', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_nilphamari', 'Nilphamari', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_noakhali', 'Noakhali', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_pabna', 'Pabna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_panchagarh', 'Panchagarh', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_patuakhali', 'Patuakhali', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_pirojpur', 'Pirojpur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_rajbari', 'Rajbari', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_rajshahi', 'Rajshahi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_rangamati', 'Rangamati', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_rangpur', 'Rangpur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_satkhira', 'Satkhira', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_shariatpur', 'Shariatpur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_sherpur', 'Sherpur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_sirajganj', 'Sirajganj', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_sunamganj', 'Sunamganj', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_sylhet', 'Sylhet', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_tangail', 'Tangail', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('district_thakurgaon', 'Thakurgaon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
