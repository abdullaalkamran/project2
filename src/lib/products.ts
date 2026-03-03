export type Product = {
  id: string;
  name: string;
  category: "vegetable" | "fruit" | "grain" | "spice";
  hub: "Bogura" | "Dhaka" | "Jessore" | "Rangpur";
  price: number;
  originalPrice: number;
  status: "live" | "upcoming" | "fixed";
  qty: number;
  delivery: "same" | "fast" | "normal";
  trend: "up" | "down" | "stable";
  rating: number;
  bids: number;
  seller: string;
  grade: "A" | "B";
  lot: string;
  image: string;
  sellerId?: string;
  availableQty?: number;
  soldQty?: number;
  pendingQty?: number;
  soldOut?: boolean;
  /** Auction end time shown on home page live cards (e.g. "10:00") */
  endsIn?: string;
};

export const productData: Product[] = [
  {
    id: "lot-fresh-tomato",
    name: "Fresh Tomato",
    category: "vegetable",
    hub: "Bogura",
    price: 17,
    originalPrice: 19,
    status: "live",
    qty: 1500,
    delivery: "fast",
    trend: "up",
    rating: 4.8,
    bids: 124,
    seller: "Rahim Traders",
    grade: "A",
    lot: "L2026-001",
    endsIn: "10:00",
    image:
      "https://images.unsplash.com/photo-1582510003533-4e97c8c1e58b?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "lot-premium-potato",
    name: "Premium Potato",
    category: "vegetable",
    hub: "Rangpur",
    price: 14,
    originalPrice: 15,
    status: "fixed",
    qty: 3000,
    delivery: "normal",
    trend: "stable",
    rating: 4.5,
    bids: 89,
    seller: "Amin Agro",
    grade: "A",
    lot: "L2026-002",
    image:
      "https://images.unsplash.com/photo-1506807803488-8eafc15316c9?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "lot-golden-onion",
    name: "Golden Onion",
    category: "vegetable",
    hub: "Jessore",
    price: 26,
    originalPrice: 28,
    status: "upcoming",
    qty: 800,
    delivery: "same",
    trend: "down",
    rating: 4.9,
    bids: 201,
    seller: "Sumon Traders",
    grade: "A",
    lot: "L2026-003",
    image:
      "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "lot-fresh-cabbage",
    name: "Fresh Cabbage",
    category: "vegetable",
    hub: "Bogura",
    price: 18,
    originalPrice: 20,
    status: "fixed",
    qty: 1200,
    delivery: "fast",
    trend: "stable",
    rating: 4.6,
    bids: 56,
    seller: "Green Field Co.",
    grade: "B",
    lot: "L2026-004",
    image:
      "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "lot-red-apple",
    name: "Red Apple",
    category: "fruit",
    hub: "Dhaka",
    price: 60,
    originalPrice: 65,
    status: "fixed",
    qty: 400,
    delivery: "fast",
    trend: "up",
    rating: 4.7,
    bids: 142,
    seller: "Dhaka Fresh",
    grade: "A",
    lot: "L2026-005",
    image:
      "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "lot-sweet-banana",
    name: "Sweet Banana",
    category: "fruit",
    hub: "Bogura",
    price: 12,
    originalPrice: 14,
    status: "fixed",
    qty: 2000,
    delivery: "same",
    trend: "stable",
    rating: 4.4,
    bids: 78,
    seller: "Bengal Fruits",
    grade: "B",
    lot: "L2026-006",
    image:
      "https://images.unsplash.com/photo-1571772805064-207c8435df79?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "lot-miniket-rice",
    name: "Miniket Rice",
    category: "grain",
    hub: "Rangpur",
    price: 42,
    originalPrice: 45,
    status: "live",
    qty: 5000,
    delivery: "normal",
    trend: "stable",
    rating: 4.8,
    bids: 203,
    seller: "Rangpur Mills",
    grade: "A",
    lot: "L2026-007",
    endsIn: "08:15",
    image:
      "https://images.unsplash.com/photo-1603331669572-0216c5c88c7b?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "lot-br28-rice",
    name: "BR28 Rice",
    category: "grain",
    hub: "Rangpur",
    price: 38,
    originalPrice: 40,
    status: "upcoming",
    qty: 7000,
    delivery: "normal",
    trend: "down",
    rating: 4.5,
    bids: 165,
    seller: "Northern Grain",
    grade: "B",
    lot: "L2026-008",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "lot-premium-wheat",
    name: "Premium Wheat",
    category: "grain",
    hub: "Jessore",
    price: 40,
    originalPrice: 42,
    status: "fixed",
    qty: 3500,
    delivery: "normal",
    trend: "stable",
    rating: 4.6,
    bids: 98,
    seller: "Jessore Agro",
    grade: "A",
    lot: "L2026-009",
    image:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "lot-dry-chili",
    name: "Dry Chili",
    category: "spice",
    hub: "Bogura",
    price: 120,
    originalPrice: 130,
    status: "fixed",
    qty: 600,
    delivery: "normal",
    trend: "up",
    rating: 4.9,
    bids: 234,
    seller: "Spice Valley",
    grade: "A",
    lot: "L2026-010",
    image:
      "https://images.unsplash.com/photo-1601050690293-2f965c63498a?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "lot-fresh-garlic",
    name: "Fresh Garlic",
    category: "spice",
    hub: "Dhaka",
    price: 95,
    originalPrice: 105,
    status: "fixed",
    qty: 900,
    delivery: "fast",
    trend: "down",
    rating: 4.7,
    bids: 167,
    seller: "City Spice",
    grade: "A",
    lot: "L2026-011",
    image:
      "https://images.unsplash.com/photo-1615485500704-21fc8abfcce3?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "lot-organic-ginger",
    name: "Organic Ginger",
    category: "spice",
    hub: "Jessore",
    price: 110,
    originalPrice: 120,
    status: "live",
    qty: 1800,
    delivery: "fast",
    trend: "up",
    rating: 4.8,
    bids: 189,
    seller: "Herbal Harvest",
    grade: "A",
    lot: "L2026-012",
    endsIn: "05:45",
    image:
      "https://images.unsplash.com/photo-1515942661900-94b3d1972591?auto=format&fit=crop&w=640&q=80",
  },
];
