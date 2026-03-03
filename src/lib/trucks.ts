// Shared mock data for trucks, drivers and live tracking
// Used by: Hub Manager Trucks page, QC Leader Truck Loads page, Live Tracking views

export type TruckStatus = "Available" | "On Route" | "Maintenance" | "Loading";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license: string;
  licenseExpiry: string;
  nid: string;
  joinDate: string;
  truckId: string | null;
}

export interface TruckLoad {
  lotId: string;
  product: string;
  weightKg: number;
  buyerName: string;
  deliveryPoint: string;
}

export interface LiveCoords {
  lat: number;
  lng: number;
  updatedAt: string; // ISO string
}

export interface Truck {
  id: string;
  reg: string;
  type: string;
  capacityKg: number;
  driverId: string | null;
  status: TruckStatus;
  loads: TruckLoad[];
  liveCoords: LiveCoords | null;
  currentDestination: string | null;
}

export const DRIVERS: Driver[] = [
  { id: "DRV-01", name: "Kalu Mia",      phone: "01711-445566", license: "DL-2019-04527", licenseExpiry: "2026-03-15", nid: "1234567890",   joinDate: "2020-02-10", truckId: "TRK-01" },
  { id: "DRV-02", name: "Hasan Ali",     phone: "01611-334455", license: "DL-2021-07831", licenseExpiry: "2025-11-20", nid: "9876543210",   joinDate: "2021-06-05", truckId: "TRK-02" },
  { id: "DRV-03", name: "Jabbar Sheikh", phone: "01511-667788", license: "DL-2018-01122", licenseExpiry: "2027-01-30", nid: "1122334455",   joinDate: "2019-09-14", truckId: "TRK-03" },
  { id: "DRV-04", name: "Salam Sarkar",  phone: "01511-223344", license: "DL-2020-09944", licenseExpiry: "2026-07-08", nid: "5566778899",   joinDate: "2020-11-22", truckId: "TRK-04" },
  { id: "DRV-05", name: "Rafiq Islam",   phone: "01711-998877", license: "DL-2022-03315", licenseExpiry: "2025-09-12", nid: "2233445566",   joinDate: "2022-03-01", truckId: "TRK-05" },
  { id: "DRV-06", name: "Rahim Driver",  phone: "01811-556677", license: "DL-2017-88234", licenseExpiry: "2028-05-25", nid: "6677889900",   joinDate: "2018-07-19", truckId: "TRK-06" },
];

export const TRUCKS: Truck[] = [
  {
    id: "TRK-01", reg: "DHA-1234", type: "Mini Truck (1.5T)", capacityKg: 1500,
    driverId: "DRV-01", status: "On Route",
    loads: [{ lotId: "LOT-1016", product: "Miniket Rice", weightKg: 500, buyerName: "Karim Traders", deliveryPoint: "Mirpur-10 DP" }],
    liveCoords: { lat: 23.8041, lng: 90.3746, updatedAt: new Date(Date.now() - 40000).toISOString() },
    currentDestination: "Mirpur-10 Delivery Point",
  },
  {
    id: "TRK-02", reg: "DHA-5678", type: "Pickup (800 kg)", capacityKg: 800,
    driverId: "DRV-02", status: "Available",
    loads: [],
    liveCoords: { lat: 23.8103, lng: 90.4125, updatedAt: new Date(Date.now() - 120000).toISOString() },
    currentDestination: null,
  },
  {
    id: "TRK-03", reg: "CTG-4321", type: "Mini Truck (1.5T)", capacityKg: 1500,
    driverId: "DRV-03", status: "Available",
    loads: [],
    liveCoords: { lat: 23.7925, lng: 90.4078, updatedAt: new Date(Date.now() - 300000).toISOString() },
    currentDestination: null,
  },
  {
    id: "TRK-04", reg: "DHA-9999", type: "Covered Van (3T)", capacityKg: 3000,
    driverId: "DRV-04", status: "On Route",
    loads: [{ lotId: "LOT-1008", product: "Miniket Rice", weightKg: 800, buyerName: "Rahim Agro", deliveryPoint: "Uttara DP" }],
    liveCoords: { lat: 23.8694, lng: 90.3985, updatedAt: new Date(Date.now() - 25000).toISOString() },
    currentDestination: "Uttara Delivery Point",
  },
  {
    id: "TRK-05", reg: "RJH-2020", type: "Pickup (800 kg)", capacityKg: 800,
    driverId: "DRV-05", status: "Maintenance",
    loads: [],
    liveCoords: null,
    currentDestination: null,
  },
  {
    id: "TRK-06", reg: "DHA-3030", type: "Covered Van (3T)", capacityKg: 3000,
    driverId: "DRV-06", status: "Available",
    loads: [],
    liveCoords: { lat: 23.7961, lng: 90.4043, updatedAt: new Date(Date.now() - 600000).toISOString() },
    currentDestination: null,
  },
];

// Approved lots waiting for truck assignment (QC Leader's dispatch queue)
export interface ApprovedLot {
  lotId: string;
  product: string;
  seller: string;
  hub: string;
  weightKg: number;
  grade: string;
  verdict: "PASSED" | "CONDITIONAL";
  deliveryPoint: string;
  buyerName: string;
  assignedTruckId: string | null;
  loadConfirmed: boolean;
}

export const APPROVED_LOTS: ApprovedLot[] = [
  { lotId: "LOT-1017", product: "Fresh Tomato",  seller: "Green Farm Co.",   hub: "Uttara Hub",  weightKg: 200, grade: "A", verdict: "PASSED",      deliveryPoint: "Uttara DP",      buyerName: "Nabil Fresh",     assignedTruckId: null, loadConfirmed: false },
  { lotId: "LOT-1018", product: "Mustard Oil",   seller: "Sumon Agro",       hub: "Rajshahi Hub",weightKg: 300, grade: "B", verdict: "CONDITIONAL",  deliveryPoint: "Motijheel DP",   buyerName: "BD Grocery Ltd",  assignedTruckId: null, loadConfirmed: false },
  { lotId: "LOT-1019", product: "Brinjal",       seller: "Hasan Farm",       hub: "Mirpur Hub",  weightKg: 150, grade: "A", verdict: "PASSED",        deliveryPoint: "Gulshan DP",     buyerName: "Greenmart",       assignedTruckId: null, loadConfirmed: false },
  { lotId: "LOT-1020", product: "Green Chilli",  seller: "Spice Valley",     hub: "Mirpur Hub",  weightKg: 80,  grade: "A", verdict: "PASSED",        deliveryPoint: "Dhanmondi DP",   buyerName: "Shuvo Traders",   assignedTruckId: null, loadConfirmed: false },
];
